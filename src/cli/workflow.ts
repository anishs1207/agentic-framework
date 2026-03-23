import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { theme, printSection, printWorkflowCard, createSpinner } from "./ui.js";
import type { Agent } from "../core/agent.js";
import type { ToolRegistry } from "../core/tool.js";

// ──────────────────────────────────────────────────────────────────────────────
// Workflow data model
// ──────────────────────────────────────────────────────────────────────────────
export interface WorkflowStep {
  type: "tool" | "agent" | "prompt";
  /** For type=tool: the tool name */
  tool?: string;
  /** The natural-language instruction / input for this step */
  instruction: string;
  /** If true, the output of this step is fed as input to the next */
  chainOutput?: boolean;
}

export interface Workflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Storage helpers
// ──────────────────────────────────────────────────────────────────────────────
const WORKFLOWS_DIR = path.resolve("workflows");

function ensureWorkflowsDir() {
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
  }
}

export function saveWorkflow(wf: Workflow) {
  ensureWorkflowsDir();
  const filename = wf.name.toLowerCase().replace(/\s+/g, "-") + ".json";
  fs.writeFileSync(path.join(WORKFLOWS_DIR, filename), JSON.stringify(wf, null, 2));
}

export function loadWorkflows(): Workflow[] {
  ensureWorkflowsDir();
  return fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, f), "utf-8"))) as Workflow[];
}

export function loadWorkflowByName(name: string): Workflow | null {
  const workflows = loadWorkflows();
  return (
    workflows.find(
      (w) => w.name.toLowerCase() === name.toLowerCase() ||
             w.name.toLowerCase().replace(/\s+/g, "-") === name.toLowerCase()
    ) ?? null
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

// ──────────────────────────────────────────────────────────────────────────────
// Interactive workflow builder
// ──────────────────────────────────────────────────────────────────────────────
export async function buildWorkflow(
  rl: readline.Interface,
  registry: ToolRegistry
): Promise<Workflow | null> {
  printSection("Workflow Builder");

  console.log(
    theme.muted(
      "  Build a multi-step agentic workflow.\n" +
      "  Each step can be a direct tool call or an agent prompt.\n" +
      "  You can chain steps so each step's output feeds into the next.\n"
    )
  );

  const name = (await ask(rl, theme.accent("  Workflow name: "))).trim();
  if (!name) { console.log(theme.error("  ✖ Cancelled – no name provided.\n")); return null; }

  const description = (await ask(rl, theme.accent("  Description (optional): "))).trim();

  const steps: WorkflowStep[] = [];
  const toolNames = registry.listNames();

  console.log(
    "\n  " + theme.muted("Step types: ") +
    theme.secondary("agent") + theme.muted(" (let the AI decide), ") +
    theme.secondary("tool") + theme.muted(" (call a specific tool), ") +
    theme.secondary("done") + theme.muted(" (finish)")
  );
  console.log(
    "  " + theme.muted("Available tools: ") + theme.primary(toolNames.join(", ")) + "\n"
  );

  let stepNum = 1;
  while (true) {
    const typeRaw = (
      await ask(rl, theme.accent(`  Step ${stepNum} type [agent/tool/done]: `))
    ).trim().toLowerCase();

    if (typeRaw === "done" || typeRaw === "") break;

    if (typeRaw === "agent") {
      const instruction = (await ask(rl, theme.accent("    Prompt/instruction: "))).trim();
      if (!instruction) { console.log(theme.warn("    Skipped empty step.")); continue; }
      const chain = (await ask(rl, theme.muted("    Chain output to next step? [y/N]: ")))
        .trim().toLowerCase() === "y";
      steps.push({ type: "agent", instruction, chainOutput: chain });
      stepNum++;

    } else if (typeRaw === "tool") {
      const toolName = (await ask(rl, theme.accent("    Tool name: "))).trim();
      if (!registry.has(toolName)) {
        console.log(theme.error(`    ✖ Tool "${toolName}" not found. Available: ${toolNames.join(", ")}`));
        continue;
      }
      const instruction = (await ask(rl, theme.accent("    Tool input (or 'chain' to use previous output): "))).trim();
      const chain = instruction.toLowerCase() === "chain" ||
        (await ask(rl, theme.muted("    Chain this output to the next step? [y/N]: ")))
          .trim().toLowerCase() === "y";

      steps.push({
        type: "tool",
        tool: toolName,
        instruction: instruction.toLowerCase() === "chain" ? "" : instruction,
        chainOutput: chain,
      });
      stepNum++;

    } else {
      console.log(theme.warn("  ⚠  Unknown type – use 'agent', 'tool', or 'done'."));
    }
  }

  if (steps.length === 0) {
    console.log(theme.error("  ✖ No steps added. Workflow cancelled.\n"));
    return null;
  }

  const wf: Workflow = {
    name,
    description,
    steps,
    createdAt: new Date().toISOString(),
  };

  const save = (await ask(rl, theme.accent("  Save workflow for later? [Y/n]: ")))
    .trim().toLowerCase();

  if (save !== "n") {
    saveWorkflow(wf);
    console.log(theme.success(`\n  ✔ Workflow "${name}" saved to ./workflows/\n`));
  }

  return wf;
}

// ──────────────────────────────────────────────────────────────────────────────
// Workflow executor
// ──────────────────────────────────────────────────────────────────────────────
export async function runWorkflow(
  wf: Workflow,
  agent: Agent,
  registry: ToolRegistry,
  initialInput?: string
) {
  printSection(`Running: ${wf.name}`);
  if (wf.description) console.log(theme.muted("  " + wf.description + "\n"));

  let lastOutput = initialInput ?? "";

  for (let i = 0; i < wf.steps.length; i++) {
    const step = wf.steps[i];
    const stepLabel = `Step ${i + 1}/${wf.steps.length}`;

    const input = step.instruction || lastOutput;

    console.log(
      "\n" +
      theme.primary.bold(`  [${stepLabel}] `) +
      (step.type === "tool"
        ? theme.secondary(`Tool: ${step.tool}`)
        : theme.secondary("Agent prompt")) +
      " " +
      theme.muted(`→ ${input.length > 60 ? input.slice(0, 60) + "…" : input}`)
    );

    const spinner = createSpinner(`Running ${stepLabel}…`).start();

    try {
      if (step.type === "tool" && step.tool) {
        const tool = registry.get(step.tool);
        if (!tool) throw new Error(`Tool "${step.tool}" not found`);
        lastOutput = await tool.execute(input);
        spinner.succeed(theme.success(`${stepLabel} complete`));
        console.log(theme.muted("  Output: ") + lastOutput.slice(0, 200));
      } else {
        const result = await agent.run(input);
        lastOutput = result.output;
        spinner.succeed(theme.success(`${stepLabel} complete (${result.iterations} iter)`));
        console.log(theme.muted("  Output: ") + lastOutput.slice(0, 200));
      }
    } catch (err: any) {
      spinner.fail(theme.error(`${stepLabel} failed: ${err.message}`));
      lastOutput = `ERROR: ${err.message}`;
    }

    if (!step.chainOutput && i < wf.steps.length - 1) lastOutput = "";
  }

  console.log(
    "\n" +
    theme.success.bold("  ✔ Workflow complete!") + "\n" +
    theme.muted("  Final output:") + "\n" +
    theme.white("  " + lastOutput) +
    "\n"
  );

  return lastOutput;
}

// ──────────────────────────────────────────────────────────────────────────────
// List saved workflows
// ──────────────────────────────────────────────────────────────────────────────
export function listWorkflows() {
  const workflows = loadWorkflows();
  if (workflows.length === 0) {
    console.log(theme.muted("\n  No saved workflows yet. Use /workflow to create one.\n"));
    return;
  }
  printSection("Saved Workflows");
  for (const wf of workflows) {
    printWorkflowCard(
      wf.name,
      wf.steps.map(
        (s) =>
          `[${s.type}] ${s.tool ? s.tool + ": " : ""}${s.instruction.slice(0, 50) || "(chained)"}`
      ),
      wf.description
    );
  }
}
