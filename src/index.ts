import dotenv from "dotenv";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

import {
  LLM, Agent, ToolRegistry, ConversationWindowMemory, logger,
  AgentProfileRegistry, agentProfileRegistry, AgentPool, Scheduler, parseSchedule,
  globalBus, AgentEvents,
  saveSession, listSessions, deleteSession, generateSessionId,
  promptLibrary, ExecutionTracer,
  loadPlugins, listPluginFiles,
} from "./core/index.js";
import type { AgentCallbacks, CronJob } from "./core/index.js";

import {
  weatherTool, calculatorTool, getTimeTool, wikipediaTool,
  randomNumberTool, stringUtilsTool, unitConverterTool,
  currencyConverterTool, fileSystemTool, httpFetchTool, jsonTool,
} from "./tools/index.js";

import {
  theme, printBanner, printHelp, printSection, printToolCard,
  printStats, createSpinner, type SessionStats,
} from "./cli/ui.js";

import {
  buildWorkflow, runWorkflow, listWorkflows, loadWorkflowByName,
} from "./cli/workflow.js";

import {
  printTable, renderAnswer,
  estimateTokens, estimateCost, pill,
} from "./cli/renderer.js";

import { startTelegramBridge, stopTelegramBridge, isTelegramActive } from "./cli/telegram.js";
import { startWhatsAppBridge, stopWhatsAppBridge, isWhatsAppActive } from "./cli/whatsapp.js";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function askQuestion(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

// ──────────────────────────────────────────────────────────────────────────────
// Conversation export
// ──────────────────────────────────────────────────────────────────────────────
function exportConversation(
  memory: ConversationWindowMemory,
  stats: SessionStats,
  filepath: string
) {
  const messages = memory.getMessages();
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════");
  lines.push("  AGENTIC FRAMEWORK v2.0 — Conversation Export");
  lines.push(`  Model: ${stats.model}  |  Temperature: ${stats.temperature}`);
  lines.push(`  Exported at: ${new Date().toLocaleString()}`);
  lines.push(`  Queries: ${stats.totalQueries}  |  Tool calls: ${stats.totalToolCalls}`);
  lines.push("═══════════════════════════════════════════════════════\n");

  if (messages.length === 0) {
    lines.push("(No messages in current memory window)");
  } else {
    for (const msg of messages) {
      const ts = msg.timestamp.toLocaleTimeString();
      const role =
        msg.role === "user" ? "🧑 You" :
        msg.role === "assistant" ? "🤖 AI" :
        `🔧 Tool[${msg.metadata?.tool ?? "?"}]`;
      lines.push(`[${ts}] ${role}`);
      lines.push(msg.content);
      lines.push("");
    }
  }

  lines.push("\n── Session Stats ─────────────────────────────────────");
  lines.push(`Model: ${stats.model} | Temperature: ${stats.temperature}`);
  lines.push(`Total queries: ${stats.totalQueries}`);
  lines.push(`Total iterations: ${stats.totalIterations}`);
  lines.push(`Total tool calls: ${stats.totalToolCalls}`);
  lines.push(`Errors: ${stats.errors}`);
  if (Object.keys(stats.toolCallCounts).length > 0) {
    lines.push(`Tool breakdown: ${JSON.stringify(stats.toolCallCounts, null, 2)}`);
  }

  fs.writeFileSync(filepath, lines.join("\n"), "utf-8");
}

// ──────────────────────────────────────────────────────────────────────────────
// LLM / Agent factory
// ──────────────────────────────────────────────────────────────────────────────
function buildLLMAndAgent(config: {
  apiKey: string;
  model: string;
  temperature: number;
  registry: ToolRegistry;
  memory: ConversationWindowMemory;
  stats: SessionStats;
  verbose: boolean;
}): Agent {
  const { apiKey, model, temperature, registry, memory, stats, verbose } = config;

  const llm = new LLM({
    apiKey,
    modelName: model,
    maxRetries: 3,
    retryDelayMs: 2000,
    temperature,
  });

  const callbacks: AgentCallbacks = {
    onAgentStart: (input) => {
      if (verbose) logger.subHeader(`Processing: "${input.slice(0, 60)}"`);
    },
    onAgentEnd: () => {},
    onToolEnd: (toolName) => {
      stats.totalToolCalls++;
      stats.toolCallCounts[toolName] = (stats.toolCallCounts[toolName] ?? 0) + 1;
    },
  };

  return new Agent({
    llm,
    tools: registry,
    memory,
    maxIterations: 8,
    verbose,
    callbacks,
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Agent pool printing helpers
// ──────────────────────────────────────────────────────────────────────────────
function printAgentList(pool: AgentPool) {
  const agents = pool.list();
  if (agents.length === 0) {
    console.log("\n" + theme.muted("  No agents spawned yet. Use /spawn <profile> to create one.\n"));
    return;
  }
  printTable(
    agents.map((a) => ({
      name: a.name,
      role: a.profile.role,
      model: a.profile.model,
      status: a.status,
      id: a.id.slice(-8),
      last: a.lastResult?.output.slice(0, 40) ?? "—",
    })),
    [
      { key: "name",   header: "Agent",  width: 16, color: (v) => theme.primary.bold(v) },
      { key: "role",   header: "Role",   width: 16,  color: (v) => theme.secondary(v) },
      { key: "model",  header: "Model",  width: 20 },
      { key: "status", header: "Status", width: 10, color: (v) =>
          v.trim() === "running" ? theme.warn(v) :
          v.trim() === "done"    ? theme.success(v) :
          v.trim() === "error"   ? theme.error(v) : theme.muted(v) },
      { key: "id",     header: "ID",     width: 10, color: (v) => theme.muted(v) },
      { key: "last",   header: "Last Output", width: 42, color: (v) => theme.muted(v) },
    ],
    "Active Agents"
  );
}

function printCronList(scheduler: Scheduler) {
  const jobs = scheduler.listJobs();
  if (jobs.length === 0) {
    console.log("\n" + theme.muted("  No cron jobs scheduled. Use /cron-add to create one.\n"));
    return;
  }
  printTable(
    jobs.map((j) => ({
      name: j.name,
      schedule: j.schedule,
      type: j.type,
      status: j.enabled ? "enabled" : "disabled",
      runs: String(j.runCount),
      next: j.nextRunAt ? new Date(j.nextRunAt).toLocaleTimeString() : "—",
      last: j.lastError ? `ERR: ${j.lastError.slice(0,30)}` : (j.lastResult?.slice(0,30) ?? "—"),
    })),
    [
      { key: "name",     header: "Name",     width: 16, color: (v) => theme.primary.bold(v) },
      { key: "schedule", header: "Schedule", width: 14, color: (v) => theme.secondary(v) },
      { key: "type",     header: "Type",     width: 10 },
      { key: "status",   header: "Status",   width: 10, color: (v) =>
          v.trim() === "enabled" ? theme.success(v) : theme.muted(v) },
      { key: "runs",     header: "Runs",     width: 6,  align: "right" },
      { key: "next",     header: "Next",     width: 12, color: (v) => theme.accent(v) },
      { key: "last",     header: "Last Output",width: 32, color: (v) => theme.muted(v) },
    ],
    "Cron Jobs"
  );
}

function printProfileList() {
  const profiles = agentProfileRegistry.list();
  if (profiles.length === 0) {
    console.log("\n" + theme.muted("  No agent profiles saved.\n"));
    return;
  }
  printTable(
    profiles.map((p) => ({
      name: p.name,
      role: p.role,
      model: p.model,
      temp: String(p.temperature),
      iter: String(p.maxIterations),
      tools: p.tools.length ? p.tools.join(",") : "(all)",
    })),
    [
      { key: "name",  header: "Profile", width: 14, color: (v) => theme.primary.bold(v) },
      { key: "role",  header: "Role",    width: 16, color: (v) => theme.secondary(v) },
      { key: "model", header: "Model",   width: 20 },
      { key: "temp",  header: "Temp",    width: 6,  align: "right" },
      { key: "iter",  header: "Iter",    width: 5,  align: "right" },
      { key: "tools", header: "Tools",   width: 36, color: (v) => theme.muted(v) },
    ],
    "Agent Profiles"
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Cron handler — runs when a job fires
// ──────────────────────────────────────────────────────────────────────────────
function buildCronHandler(
  pool: AgentPool,
  registry: ToolRegistry,
  defaultAgent: () => Agent
) {
  return async (job: CronJob) => {
    console.log(
      "\n" + theme.accent.bold(`  ⏰ CRON JOB FIRED: "${job.name}"`) +
      " " + theme.muted(`(${new Date().toLocaleTimeString()})`) + "\n"
    );

    try {
      if (job.type === "workflow") {
        const wf = loadWorkflowByName(job.workflowName ?? job.name);
        if (!wf) {
          job.lastResult = `Workflow "${job.workflowName}" not found`;
          return;
        }
        const output = await runWorkflow(wf, defaultAgent(), registry, job.input || undefined);
        job.lastResult = output;
      } else {
        // agent task
        const target = job.agentId ? pool.get(job.agentId) : null;
        if (target) {
          const r = await pool.runOne(job.agentId!, job.input);
          job.lastResult = r.result?.output ?? r.error ?? "(no output)";
        } else {
          const agent = defaultAgent();
          const result = await agent.run(job.input);
          job.lastResult = result.output;
        }
      }

      console.log(
        theme.muted("  Cron result: ") +
        (job.lastResult ?? "").slice(0, 200) + "\n"
      );
    } catch (err: unknown) {
      job.lastError = err instanceof Error ? err.message : String(err);
    }
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────
export async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  // console.log(`[DEBUG] apiKey: ${apiKey}`); // Commented out for now or use logger

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.log(
      "\n" +
      theme.error.bold("  ✖ GEMINI_API_KEY is not set!") + "\n" +
      theme.muted("  Get one at: https://aistudio.google.com/apikey") + "\n" +
      theme.muted("  Then add it to your .env file:") + "\n" +
      theme.accent("  GEMINI_API_KEY=your_key_here") + "\n"
    );
    process.exit(1);
  }

  // ── Tool registry ──────────────────────────────────────────────────────────
  const registry = new ToolRegistry();
  registry
    .register(weatherTool)
    .register(calculatorTool)
    .register(getTimeTool)
    .register(wikipediaTool)
    .register(randomNumberTool)
    .register(stringUtilsTool)
    .register(unitConverterTool)
    .register(currencyConverterTool)
    .register(fileSystemTool)
    .register(httpFetchTool)
    .register(jsonTool);

  const memory = new ConversationWindowMemory(20);

  // ── Session config (mutable) ───────────────────────────────────────────────
  let currentModel       = "gemini-2.5-flash";
  let currentTemperature = 0.7;
  let verbose            = true;
  let persona: string | null = null;

  const stats: SessionStats = {
    startTime: new Date(),
    totalQueries: 0,
    totalIterations: 0,
    totalToolCalls: 0,
    toolCallCounts: {},
    totalDurationMs: 0,
    errors: 0,
    model: currentModel,
    temperature: currentTemperature,
  };

  // ── Build initial agent ────────────────────────────────────────────────────
  let agent = buildLLMAndAgent({
    apiKey, model: currentModel, temperature: currentTemperature,
    registry, memory, stats, verbose,
  });

  // ── Multi-agent pool ───────────────────────────────────────────────────────
  const pool = new AgentPool(apiKey);

  // ── Seed built-in profiles on first run ───────────────────────────────────
  if (agentProfileRegistry.list().length === 0) {
    for (const preset of AgentProfileRegistry.presets()) {
      agentProfileRegistry.create(preset);
    }
    // Manually seed presets
    const presets = [
      {
        name: "Researcher",
        description: "Searches Wikipedia to gather and summarise information",
        role: "researcher",
        model: "gemini-2.5-flash",
        temperature: 0.3,
        maxIterations: 10,
        tools: ["wikipedia", "weather", "getTime"],
      },
      {
        name: "Maths",
        description: "Specialises in maths, unit conversion and currency",
        role: "maths specialist",
        model: "gemini-2.5-flash",
        temperature: 0.1,
        maxIterations: 6,
        tools: ["calculator", "unitConverter", "currencyConverter"],
      },
      {
        name: "DataAgent",
        description: "Works with JSON data, HTTP APIs and filesystem",
        role: "data analyst",
        model: "gemini-2.5-flash",
        temperature: 0.4,
        maxIterations: 10,
        tools: ["httpFetch", "jsonTool", "fileSystem"],
      },
    ];
    for (const p of presets) agentProfileRegistry.create(p);
  }

  // ── Cron scheduler ─────────────────────────────────────────────────────────
  const scheduler = new Scheduler(
    buildCronHandler(pool, registry, () => agent)
  );

  // ── Aliases: user-defined command shortcuts ───────────────────────────────
  const aliases: Record<string, string> = {};

  // ── Tracer toggle ─────────────────────────────────────────────────────────
  let traceMode = false;

  // ── Plugin loader ─────────────────────────────────────────────────────────
  const pluginResults = await loadPlugins();
  for (const r of pluginResults) {
    if (r.tools.length > 0) {
      r.tools.forEach((t) => registry.register(t));
      console.log(theme.success(`  🔌 Plugin "${r.file}": loaded ${r.tools.map(t => t.name).join(", ")}`));
    } else if (r.error) {
      console.log(theme.warn(`  ⚠  Plugin "${r.file}": ${r.error}`));
    }
  }

  // ── Global event listeners ─────────────────────────────────────────────────
  globalBus.on(AgentEvents.AGENT_COMPLETED, (payload: Record<string, unknown>) => {
    if (verbose) logger.info(`✔ Agent "${payload.agentId}" completed`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  // ── Startup UI ─────────────────────────────────────────────────────────────
  printBanner();

  printTable(
    registry.listNames().map((name) => {
      const tool = registry.get(name)!;
      return { name, desc: tool.description.slice(0, 52) };
    }),
    [
      { key: "name", header: "Tool",        width: 22, color: (v) => theme.primary(v) },
      { key: "desc", header: "Description", width: 54, color: (v) => theme.muted(v) },
    ],
    "Available Tools"
  );

  console.log(
    "  " + theme.muted(`Model: ${currentModel}  |  Verbose: ON  |  Memory: 20 turns  |  Plugins: ${pluginResults.filter(r => r.tools.length > 0).length}`) +
    "\n  " + theme.muted("Type /help to see all commands.") + "\n"
  );

  // ── REPL loop ──────────────────────────────────────────────────────────────
  while (true) {
    const flags = [
      traceMode ? pill("TRACE", "warn") : "",
      persona   ? pill("PERSONA", "secondary") : "",
      pool.list().length > 0 ? pill(`${pool.list().length} agents`, "primary") : "",
      scheduler.listJobs().filter(j => j.enabled).length > 0
        ? pill(`${scheduler.listJobs().filter(j => j.enabled).length} cron`, "accent") : "",
    ].filter(Boolean).join(" ");

    const promptStr =
      theme.secondary.bold("❯ ") +
      theme.white.bold("You") +
      theme.muted(` [${currentModel}]`) +
      (flags ? " " + flags : "") +
      theme.secondary(" › ");

    const userInput = await askQuestion(rl, promptStr);
    const trimmed   = userInput.trim();

    if (!trimmed) continue;

    // ── Command dispatch ─────────────────────────────────────────────────────────────
    // console.log(`[DEBUG] CMD: ${trimmed}`);
    if (trimmed.startsWith("/")) {
      const rawParts = trimmed.split(/\s+/);
      const rawCmd   = rawParts[0].toLowerCase();

      // ── Resolve alias first ─────────────────────────────────────────────
      const resolvedLine = aliases[rawCmd]
        ? aliases[rawCmd] + (rawParts.length > 1 ? " " + rawParts.slice(1).join(" ") : "")
        : trimmed;
      const parts = resolvedLine.split(/\s+/);
      const cmd   = parts[0].toLowerCase();
      const args  = parts.slice(1);

      // ── /exit /quit ──────────────────────────────────────────────────────
      if (cmd === "/exit" || cmd === "/quit") {
        scheduler.stopAll();
        if (isTelegramActive()) stopTelegramBridge();
        if (isWhatsAppActive()) await stopWhatsAppBridge();
        console.log("\n" + theme.accent.bold("  👋 Goodbye! Happy building.\n"));
        rl.close();
        break;
      }

      // ── /help ────────────────────────────────────────────────────────────
      if (cmd === "/help") { printHelp(); continue; }

      // ── /tools ───────────────────────────────────────────────────────────
      if (cmd === "/tools") {
        printSection("Tool Details");
        registry.listNames().forEach((name) => {
          const tool = registry.get(name)!;
          printToolCard(tool);
        });
        continue;
      }

      // ── /memory ──────────────────────────────────────────────────────────
      if (cmd === "/memory") {
        const messages = memory.getMessages();
        if (messages.length === 0) {
          console.log("\n" + theme.muted("  🧠 Memory is empty.\n"));
        } else {
          printSection(`Memory (${messages.length} messages)`);
          messages.forEach((m, i) => {
            const role =
              m.role === "user" ? theme.secondary("Human") :
              m.role === "assistant" ? theme.primary("AI") :
              theme.accent("Tool");
            const snippet = m.content.length > 80 ? m.content.slice(0, 80) + "…" : m.content;
            console.log("  " + theme.muted(`${i + 1}.`) + " [" + role + "] " + theme.muted(snippet));
          });
          console.log();
        }
        continue;
      }

      // ── /clear ───────────────────────────────────────────────────────────
      if (cmd === "/clear") {
        memory.clear();
        console.log("\n" + theme.success("  ✔ Memory cleared.\n"));
        continue;
      }

      // ── /verbose ─────────────────────────────────────────────────────────
      if (cmd === "/verbose") {
        verbose = !verbose;
        logger.verbose = verbose;
        agent = buildLLMAndAgent({
          apiKey, model: currentModel, temperature: currentTemperature,
          registry, memory, stats, verbose,
        });
        console.log(
          "\n" + (verbose
            ? theme.success("  ✔ Verbose ON — agent internals will be shown.\n")
            : theme.warn("  Verbose OFF — only final answers shown.\n"))
        );
        continue;
      }

      // ── /model <name> ────────────────────────────────────────────────────
      if (cmd === "/model") {
        const newModel = args[0];
        if (!newModel) {
          console.log(
            "\n  " + theme.muted("Current model: ") + theme.secondary(currentModel) +
            "\n  " + theme.muted("Example: /model gemini-2.0-flash-exp\n")
          );
          continue;
        }
        currentModel = newModel;
        stats.model = currentModel;
        agent = buildLLMAndAgent({
          apiKey, model: currentModel, temperature: currentTemperature,
          registry, memory, stats, verbose,
        });
        console.log("\n" + theme.success(`  ✔ Model switched to: ${currentModel}\n`));
        continue;
      }

      // ── /temperature <n> ─────────────────────────────────────────────────
      if (cmd === "/temperature" || cmd === "/temp") {
        const val = parseFloat(args[0]);
        if (isNaN(val) || val < 0 || val > 2) {
          console.log("\n" + theme.warn("  ⚠  Provide a number 0–2.  Example: /temperature 0.3\n"));
          continue;
        }
        currentTemperature = val;
        stats.temperature = val;
        agent = buildLLMAndAgent({
          apiKey, model: currentModel, temperature: currentTemperature,
          registry, memory, stats, verbose,
        });
        console.log("\n" + theme.success(`  ✔ Temperature set to: ${val}\n`));
        continue;
      }

      // ── /persona <text> ──────────────────────────────────────────────────
      if (cmd === "/persona") {
        if (args.length === 0) {
          if (persona) {
            console.log("\n" + theme.muted("  Current persona: ") + persona + "\n");
          } else {
            console.log("\n" + theme.muted("  No persona set. Use /persona <description>\n"));
          }
          continue;
        }
        persona = args.join(" ");
        console.log("\n" + theme.success(`  ✔ Persona set: "${persona}"\n`));
        continue;
      }

      // ── /stats ───────────────────────────────────────────────────────────
      if (cmd === "/stats") {
        printStats(stats);
        continue;
      }

      // ── /export [filename] ────────────────────────────────────────────────
      if (cmd === "/export") {
        const filename = args[0] || "chat-export.txt";
        const filepath = path.resolve(filename);
        try {
          exportConversation(memory, stats, filepath);
          console.log("\n" + theme.success(`  ✔ Exported to: ${filepath}\n`));
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.log("\n" + theme.error(`  ✖ Export failed: ${errMsg}\n`));
        }
        continue;
      }

      // ══════════════════════════════════════════════════════════════════════
      // WORKFLOW COMMANDS
      // ══════════════════════════════════════════════════════════════════════

      // ── /workflow ─────────────────────────────────────────────────────────
      if (cmd === "/workflow") {
        const wf = await buildWorkflow(rl, registry);
        if (wf) {
          const doRun = (
            await askQuestion(rl, theme.accent("  Run this workflow now? [Y/n]: "))
          ).trim().toLowerCase();
          if (doRun !== "n") {
            const initial = (await askQuestion(
              rl, theme.accent("  Initial input (optional, press Enter to skip): ")
            )).trim();
            await runWorkflow(wf, agent, registry, initial || undefined);
          }
        }
        continue;
      }

      // ── /workflow-list ────────────────────────────────────────────────────
      if (cmd === "/workflow-list") {
        listWorkflows();
        continue;
      }

      // ── /workflow-run <name> ──────────────────────────────────────────────
      if (cmd === "/workflow-run") {
        if (args.length === 0) {
          console.log("\n" + theme.warn("  Usage: /workflow-run <workflow-name>\n"));
          continue;
        }
        const name = args.join(" ");
        const wf = loadWorkflowByName(name);
        if (!wf) {
          console.log(
            "\n" + theme.error(`  ✖ Workflow "${name}" not found.`) +
            "\n" + theme.muted("  Use /workflow-list to see saved workflows.\n")
          );
          continue;
        }
        const initial = (await askQuestion(
          rl, theme.accent("  Initial input (press Enter to skip): ")
        )).trim();
        await runWorkflow(wf, agent, registry, initial || undefined);
        continue;
      }

      // ══════════════════════════════════════════════════════════════════════
      // MULTI-AGENT COMMANDS
      // ══════════════════════════════════════════════════════════════════════

      // ── /agents ── list spawned agents ─────────────────────────────────────
      if (cmd === "/agents") {
        printAgentList(pool);
        continue;
      }

      // ── /profiles ── list saved agent profiles ────────────────────────────
      if (cmd === "/profiles") {
        printProfileList();
        continue;
      }

      // ── /profile-create ── interactively create a new profile ──────────────
      if (cmd === "/profile-create") {
        printSection("Create Agent Profile");
        const name = (await askQuestion(rl, theme.accent("  Name: "))).trim();
        if (!name) { console.log(theme.error("  ✖ Cancelled\n")); continue; }
        const description = (await askQuestion(rl, theme.accent("  Description: "))).trim();
        const role = (await askQuestion(rl, theme.accent("  Role (e.g. researcher): "))).trim() || "assistant";
        const modelInput = (await askQuestion(rl, theme.accent(`  Model [${currentModel}]: `))).trim() || currentModel;
        const tempInput = parseFloat((await askQuestion(rl, theme.accent("  Temperature [0.7]: "))).trim());
        const temperature = isNaN(tempInput) ? 0.7 : tempInput;
        const maxIterInput = parseInt((await askQuestion(rl, theme.accent("  Max iterations [8]: "))).trim());
        const maxIterations = isNaN(maxIterInput) ? 8 : maxIterInput;
        const toolsRaw = (await askQuestion(rl, theme.accent("  Tool names (comma-sep, empty=all): "))).trim();
        const tools = toolsRaw ? toolsRaw.split(",").map((t) => t.trim()) : [];
        const systemPromptRaw = (await askQuestion(rl, theme.accent("  Custom system prompt (optional, Enter to skip): "))).trim();

        const profile = agentProfileRegistry.create({
          name, description, role,
          model: modelInput,
          temperature,
          maxIterations,
          tools,
          ...(systemPromptRaw ? { systemPrompt: systemPromptRaw } : {}),
        });
        console.log("\n" + theme.success(`  ✔ Profile "${profile.name}" created (ID: ${profile.id})\n`));
        continue;
      }

      // ── /profile-delete <id> ──────────────────────────────────────────────
      if (cmd === "/profile-delete") {
        const id = args[0];
        if (!id) { console.log("\n" + theme.warn("  Usage: /profile-delete <id>\n")); continue; }
        const ok = agentProfileRegistry.delete(id);
        console.log(ok
          ? "\n" + theme.success(`  ✔ Profile "${id}" deleted\n`)
          : "\n" + theme.error(`  ✖ Profile "${id}" not found\n`));
        continue;
      }

      // ── /spawn <profile-name-or-id> ──────────────────────────────────────
      if (cmd === "/spawn") {
        const profileName = args.join(" ");
        if (!profileName) {
          console.log("\n" + theme.warn("  Usage: /spawn <profile-name-or-id>\n  Use /profiles to list available profiles.\n"));
          continue;
        }
        const profile = agentProfileRegistry.findByName(profileName) ?? agentProfileRegistry.get(profileName);
        if (!profile) {
          console.log("\n" + theme.error(`  ✖ Profile "${profileName}" not found. Use /profiles.\n`));
          continue;
        }
        const spawned = pool.spawn(profile, registry);
        console.log(
          "\n" + theme.success(`  ✔ Agent "${spawned.name}" spawned`) +
          "\n  " + theme.muted(`ID: ${spawned.id}  Role: ${spawned.profile.role}`  +
          `  Model: ${spawned.profile.model}`) + "\n"
        );
        continue;
      }

      // ── /terminate <agent-id-or-name> ────────────────────────────────────
      if (cmd === "/terminate") {
        const target = args.join(" ");
        if (!target) { console.log("\n" + theme.warn("  Usage: /terminate <agent-id-or-name>\n")); continue; }
        const ok = pool.terminate(target);
        console.log(ok
          ? "\n" + theme.success(`  ✔ Agent "${target}" terminated\n`)
          : "\n" + theme.error(`  ✖ Agent "${target}" not found\n`));
        continue;
      }

      // ── /ask <agent-name> <message> ──────────────────────────────────────
      if (cmd === "/ask") {
        if (args.length < 2) {
          console.log("\n" + theme.warn("  Usage: /ask <agent-name> <message>\n"));
          continue;
        }
        const agentName = args[0];
        const message = args.slice(1).join(" ");
        const spawned = pool.get(agentName);
        if (!spawned) {
          console.log("\n" + theme.error(`  ✖ No spawned agent named "${agentName}". Use /agents.\n`));
          continue;
        }
        console.log();
        const spinner = createSpinner(`Agent "${spawned.name}" thinking…`).start();
        const r = await pool.runOne(spawned.id, message);
        spinner.stop();
        if (r.result) {
          console.log("\n" + theme.primary.bold(`  🤖 ${spawned.name}:`) + "\n  " + r.result.output);
          console.log("\n" + theme.muted(`  ⏱  ${(r.durationMs/1000).toFixed(1)}s | ${r.result.iterations} iter`) + "\n");
        } else {
          console.log("\n" + theme.error(`  ✖ ${r.error}\n`));
        }
        continue;
      }

      // ── /swarm <message> ── run all spawned agents in parallel ────────────
      if (cmd === "/swarm") {
        const message = args.join(" ");
        if (!message) { console.log("\n" + theme.warn("  Usage: /swarm <task message>\n")); continue; }
        const agents = pool.list();
        if (agents.length === 0) { console.log("\n" + theme.warn("  No spawned agents. Use /spawn first.\n")); continue; }

        printSection(`Swarm: ${agents.length} agents in parallel`);
        const tasks = agents.map((a) => ({ agentId: a.id, input: message }));
        const spinner = createSpinner("Running parallel swarm…").start();
        const results = await pool.runParallel(tasks);
        spinner.stop();

        for (const r of results) {
          console.log(
            "\n  " + theme.primary.bold(r.agentName + ":") +
            "\n  " + (r.result?.output ?? theme.error(r.error ?? "no output")).slice(0, 300)
          );
        }
        console.log();
        continue;
      }

      // ── /chain <message> ── run all spawned agents sequentially with chaining ──
      if (cmd === "/chain") {
        const message = args.join(" ");
        if (!message) { console.log("\n" + theme.warn("  Usage: /chain <initial message>\n")); continue; }
        const agents = pool.list();
        if (agents.length === 0) { console.log("\n" + theme.warn("  No spawned agents. Use /spawn first.\n")); continue; }

        printSection(`Chain: ${agents.length} agents sequentially`);
        const tasks = agents.map((a) => ({ agentId: a.id, input: message }));
        const spinner = createSpinner("Running sequential chain…").start();
        const results = await pool.runSequential(tasks, true);
        spinner.stop();

        for (const r of results) {
          console.log(
            "\n  " + theme.primary.bold(r.agentName + ":") +
            "\n  " + (r.result?.output ?? theme.error(r.error ?? "no output")).slice(0, 300)
          );
        }
        console.log();
        continue;
      }

      // ══════════════════════════════════════════════════════════════════════
      // CRON / SCHEDULER COMMANDS
      // ══════════════════════════════════════════════════════════════════════

      // ── /cron-add ── interactively add a cron job ─────────────────────────
      if (cmd === "/cron-add") {
        printSection("Add Cron Job");
        const jobName = (await askQuestion(rl, theme.accent("  Job name: "))).trim();
        if (!jobName) { console.log(theme.error("  ✖ Cancelled\n")); continue; }

        const typeRaw = (await askQuestion(rl, theme.accent("  Type [agent/workflow]: "))).trim().toLowerCase();
        const jobType = typeRaw === "workflow" ? "workflow" : "agent";

        let agentId: string | undefined;
        let workflowName: string | undefined;
        if (jobType === "agent") {
          const agentNameInput = (await askQuestion(rl, theme.accent("  Agent name (empty = default): "))).trim();
          if (agentNameInput) {
            const s = pool.get(agentNameInput);
            if (!s) {
              console.log(theme.error(`  ✖ No spawned agent "${agentNameInput}"\n`));
              continue;
            }
            agentId = s.id;
          }
        } else {
          workflowName = (await askQuestion(rl, theme.accent("  Workflow name: "))).trim();
        }

        const input = (await askQuestion(rl, theme.accent("  Task/Input: "))).trim();

        const scheduleStr = (await askQuestion(
          rl,
          theme.accent("  Schedule (e.g. every 30s / every 5m / every 1h / daily): ")
        )).trim();

        const intervalMs = parseSchedule(scheduleStr);
        if (!intervalMs) {
          console.log("\n" + theme.error("  ✖ Invalid schedule format. Try: every 30s, every 5m, every 1h, daily\n"));
          continue;
        }
        if (intervalMs < 10_000) {
          console.log("\n" + theme.warn("  ⚠  Minimum interval is 10 seconds.\n"));
          continue;
        }

        const job = scheduler.addJob({
          name: jobName,
          description: input.slice(0, 60),
          intervalMs,
          schedule: scheduleStr,
          type: jobType,
          agentId,
          workflowName,
          input,
          nextRunAt: new Date(Date.now() + intervalMs),
        });

        console.log(
          "\n" + theme.success(`  ✔ Cron job "${job.name}" created`) +
          "\n  " + theme.muted(`Schedule: ${scheduleStr}  |  Next run: ${new Date(Date.now() + intervalMs).toLocaleTimeString()}`) + "\n"
        );
        continue;
      }

      // ── /cron-list ────────────────────────────────────────────────────────
      if (cmd === "/cron-list") {
        printCronList(scheduler);
        continue;
      }

      // ── /cron-remove <name> ───────────────────────────────────────────────
      if (cmd === "/cron-remove") {
        const target = args.join(" ");
        if (!target) { console.log("\n" + theme.warn("  Usage: /cron-remove <job-name>\n")); continue; }
        const job = scheduler.getJob(target);
        if (!job) { console.log("\n" + theme.error(`  ✖ Job "${target}" not found\n`)); continue; }
        scheduler.removeJob(job.id);
        console.log("\n" + theme.success(`  ✔ Cron job "${target}" removed\n`));
        continue;
      }

      // ── /cron-enable <name> ───────────────────────────────────────────────
      if (cmd === "/cron-enable") {
        const target = args.join(" ");
        const job = scheduler.getJob(target);
        if (!job) { console.log("\n" + theme.error(`  ✖ Job "${target}" not found\n`)); continue; }
        scheduler.enableJob(job.id);
        console.log("\n" + theme.success(`  ✔ Cron job "${target}" enabled\n`));
        continue;
      }

      // ── /cron-disable <name> ──────────────────────────────────────────────
      if (cmd === "/cron-disable") {
        const target = args.join(" ");
        const job = scheduler.getJob(target);
        if (!job) { console.log("\n" + theme.error(`  ✖ Job "${target}" not found\n`)); continue; }
        scheduler.disableJob(job.id);
        console.log("\n" + theme.success(`  ✔ Cron job "${target}" disabled\n`));
        continue;
      }

      // ── /cron-run <name> ── trigger a job immediately ─────────────────────
      if (cmd === "/cron-run") {
        const target = args.join(" ");
        const job = scheduler.getJob(target);
        if (!job) { console.log("\n" + theme.error(`  ✖ Job "${target}" not found\n`)); continue; }
        console.log("\n" + theme.accent(`  ▶ Running "${job.name}" immediately…\n`));
        try {
          await scheduler.runNow(job.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.log(theme.error(`  ✖ Failed to start ${target}: ${errMsg}\n`));
        }
        continue;
      }

      // ── /events ──────────────────────────────────────────────────────────────
      if (cmd === "/events") {
        const limit = parseInt(args[0]) || 20;
        const history = globalBus.getHistory(limit);
        if (history.length === 0) { console.log("\n" + theme.muted("  No events yet.\n")); continue; }
        printTable(
          history.map((e) => ({
            time:    e.emittedAt.toLocaleTimeString(),
            type:    e.type,
            src:     e.source ?? "—",
            payload: JSON.stringify(e.payload).slice(0, 50),
          })),
          [
            { key: "time",    header: "Time",    width: 10, color: (v) => theme.muted(v) },
            { key: "type",    header: "Event",   width: 24, color: (v) => theme.secondary(v) },
            { key: "src",     header: "Source",  width: 14, color: (v) => theme.accent(v) },
            { key: "payload", header: "Payload", width: 52, color: (v) => theme.muted(v) },
          ],
          `Event Bus (last ${history.length})`
        );
        continue;
      }

      // ── /trace ── toggle execution tracer ─────────────────────────────────────
      if (cmd === "/trace") {
        traceMode = !traceMode;
        console.log("\n" + (traceMode
          ? theme.warn("  ⚠  Trace mode ON — each run saves to ./traces/")
          : theme.success("  ✔ Trace mode OFF")) + "\n");
        continue;
      }

      // ── /prompts ── list the prompt library ──────────────────────────────────
      if (cmd === "/prompts") {
        const query = args.join(" ");
        const entries = query ? promptLibrary.search(query) : promptLibrary.list();
        if (entries.length === 0) { console.log(theme.muted("  No matching prompts.\n")); continue; }
        printTable(
          entries.map((e) => ({ name: e.name, cat: e.category, desc: e.description })),
          [
            { key: "name", header: "Name",     width: 14, color: (v) => theme.primary.bold(v) },
            { key: "cat",  header: "Category", width: 14, color: (v) => theme.secondary(v) },
            { key: "desc", header: "Description", width: 54, color: (v) => theme.muted(v) },
          ],
          "Prompt Library" + (query ? ` — '${query}'` : "")
        );
        continue;
      }

      // ── /prompt <name> ── activate a prompt as persona ───────────────────────
      if (cmd === "/prompt") {
        if (args.length === 0) {
          console.log("\n" + theme.warn("  Usage: /prompt <name>   (use /prompts to list)\n")); continue;
        }
        const entry = promptLibrary.find(args.join(" "));
        if (!entry) {
          console.log("\n" + theme.error(`  ✖ Prompt '${args.join(" ")}' not found. Use /prompts to list.\n`)); continue;
        }
        persona = entry.text;
        console.log("\n" + theme.success(`  ✔ Persona set: '${entry.name}' — ${entry.description}\n`));
        continue;
      }

      // ── /prompt-save <name> <description> ── save current persona as custom prompt ──
      if (cmd === "/prompt-save") {
        if (!persona) { console.log("\n" + theme.warn("  No active persona to save. Set one with /persona first.\n")); continue; }
        const name = args[0];
        if (!name) { console.log("\n" + theme.warn("  Usage: /prompt-save <name>\n")); continue; }
        const desc = args.slice(1).join(" ") || "Custom prompt";
        promptLibrary.saveCustom({ name, description: desc, category: "Custom", tags: ["custom"], text: persona });
        console.log("\n" + theme.success(`  ✔ Saved prompt '${name}' to library.\n`));
        continue;
      }

      // ── /session-save <name> ──────────────────────────────────────────────
      if (cmd === "/session-save") {
        const name = args.join(" ") || `session-${Date.now().toString(36)}`;
        const id   = generateSessionId(name);
        saveSession({
          id, name, savedAt: new Date().toISOString(),
          model: currentModel, temperature: currentTemperature,
          persona, verbose, stats,
          messages: memory.getMessages(),
          aliases,
        });
        console.log("\n" + theme.success(`  ✔ Session '${name}' saved (id: ${id})\n`));
        continue;
      }

      // ── /session-list ──────────────────────────────────────────────────────
      if (cmd === "/session-list") {
        const sessions = listSessions();
        if (sessions.length === 0) { console.log(theme.muted("\n  No saved sessions.\n")); continue; }
        printTable(
          sessions.map((s) => ({
            name:    s.name,
            model:   s.model,
            msgs:    String(s.messages.length),
            saved:   new Date(s.savedAt).toLocaleString(),
            id:      s.id.slice(-8),
          })),
          [
            { key: "name",  header: "Name",    width: 20, color: (v) => theme.primary.bold(v) },
            { key: "model", header: "Model",   width: 20 },
            { key: "msgs",  header: "Msgs",    width: 6,  align: "right" },
            { key: "saved", header: "Saved At",width: 22, color: (v) => theme.muted(v) },
            { key: "id",    header: "ID",      width: 10, color: (v) => theme.muted(v) },
          ],
          "Saved Sessions"
        );
        continue;
      }

      // ── /session-load <name-or-id> ────────────────────────────────────────
      if (cmd === "/session-load") {
        const nameOrId = args.join(" ");
        if (!nameOrId) { console.log(theme.warn("  Usage: /session-load <name>\n")); continue; }
        const sessions = listSessions();
        const found    = sessions.find(
          (s) => s.name.toLowerCase() === nameOrId.toLowerCase() ||
                 s.id === nameOrId || s.id.slice(-8) === nameOrId
        );
        if (!found) { console.log(theme.error(`  ✖ Session '${nameOrId}' not found.\n`)); continue; }
        // Restore state
        memory.clear();
        found.messages.forEach((m) => memory.addMessage(m.role, m.content, m.metadata));
        currentModel       = found.model;
        currentTemperature = found.temperature;
        persona            = found.persona;
        verbose            = found.verbose;
        Object.assign(aliases, found.aliases ?? {});
        agent = buildLLMAndAgent({ apiKey, model: currentModel, temperature: currentTemperature, registry, memory, stats, verbose });
        console.log("\n" + theme.success(`  ✔ Session '${found.name}' restored (${found.messages.length} messages)\n`));
        continue;
      }

      // ── /session-delete <name-or-id> ──────────────────────────────────
      if (cmd === "/session-delete") {
        const sessions = listSessions();
        const target   = args.join(" ");
        const found    = sessions.find((s) => s.name === target || s.id === target || s.id.slice(-8) === target);
        if (!found) { console.log(theme.error(`  ✖ Session '${target}' not found.\n`)); continue; }
        deleteSession(found.id);
        console.log("\n" + theme.success(`  ✔ Session '${found.name}' deleted.\n`));
        continue;
      }

      // ── /alias-set <shortcut> <command> ─────────────────────────────────
      if (cmd === "/alias-set") {
        if (args.length < 2) { console.log(theme.warn("  Usage: /alias-set /sc /real-command\n")); continue; }
        aliases[args[0].toLowerCase()] = args.slice(1).join(" ");
        console.log("\n" + theme.success(`  ✔ Alias set: ${args[0]} → ${args.slice(1).join(" ")}\n`));
        continue;
      }

      // ── /aliases ───────────────────────────────────────────────────────────
      if (cmd === "/aliases") {
        const entries = Object.entries(aliases);
        if (entries.length === 0) { console.log(theme.muted("  No aliases set.\n")); continue; }
        printSection("Aliases");
        for (const [k, v] of entries) {
          console.log("  " + theme.accent.bold(k.padEnd(18)) + theme.muted("→ ") + theme.white(v));
        }
        console.log();
        continue;
      }

      // ── /alias-remove <shortcut> ─────────────────────────────────────────
      if (cmd === "/alias-remove") {
        const key = args[0]?.toLowerCase();
        if (!key || !aliases[key]) { console.log(theme.warn(`  Alias '${key}' not found.\n`)); continue; }
        delete aliases[key];
        console.log("\n" + theme.success(`  ✔ Alias '${key}' removed.\n`));
        continue;
      }

      // ── /batch <filepath> ── run queries from a text file ─────────────────
      if (cmd === "/batch") {
        const file = args.join(" ");
        if (!file) { console.log(theme.warn("  Usage: /batch <filepath>\n  One query per line.\n")); continue; }
        if (!fs.existsSync(file)) { console.log(theme.error(`  ✖ File not found: ${file}\n`)); continue; }
        const lines = fs.readFileSync(file, "utf-8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
        printSection(`Batch: ${lines.length} queries from ${path.basename(file)}`);
        for (let i = 0; i < lines.length; i++) {
          const q = lines[i];
          console.log("\n" + theme.accent.bold(`  [${i + 1}/${lines.length}] `) + theme.white(q));
          const sp = createSpinner("Thinking…").start();
          try {
            const r = await agent.run(q);
            sp.stop();
            console.log(theme.muted("  → ") + renderAnswer(r.output).trim().slice(0, 300));
          } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            sp.fail();
            console.log(theme.error(`  ✖ ${errorMsg}`));
          }
        }
        console.log("\n" + theme.success("  ✔ Batch complete.\n"));
        continue;
      }

      // ── /plugin-reload ── reload plugins from ./plugins/ ───────────────────
      if (cmd === "/plugin-reload") {
        const spinner = createSpinner("Reloading plugins…").start();
        const fresh = await loadPlugins();
        spinner.stop();
        for (const r of fresh) {
          if (r.tools.length > 0) {
            r.tools.forEach((t) => registry.register(t));
            console.log(theme.success(`  🔌 Reloaded: ${r.file} — ${r.tools.map(t => t.name).join(", ")}  `));
          } else if (r.error) {
            console.log(theme.error(`  ✖ ${r.file}: ${r.error}`));
          }
        }
        console.log();
        continue;
      }

      // ── /plugin-list ─────────────────────────────────────────────────────
      if (cmd === "/plugin-list") {
        const files = listPluginFiles();
        if (files.length === 0) { console.log(theme.muted("  No plugins found in ./plugins/. Drop .js files there.\n")); continue; }
        printSection("Plugins");
        files.forEach((f) => console.log("  " + theme.primary("🔌 ") + theme.white(f)));
        console.log();
        continue;
      }

      // ══════════════════════════════════════════════════════════════════════
      // COMMUNICATION BRIDGES
      // ══════════════════════════════════════════════════════════════════════

      // ── /telegram ─────────────────────────────────────────────────────────
      if (cmd === "/telegram") {
        await startTelegramBridge(agent);
        continue;
      }

      // ── /stop-telegram ────────────────────────────────────────────────────
      if (cmd === "/stop-telegram") {
        stopTelegramBridge();
        continue;
      }

      // ── /whatsapp ─────────────────────────────────────────────────────────
      if (cmd === "/whatsapp") {
        await startWhatsAppBridge(agent);
        continue;
      }

      // ── /stop-whatsapp ────────────────────────────────────────────────────
      if (cmd === "/stop-whatsapp") {
        await stopWhatsAppBridge();
        continue;
      }

      // ── unknown command ───────────────────────────────────────────────────
      console.log(
        "\n" + theme.error(`  ✖ Unknown command: ${cmd}`) +
        "\n" + theme.muted("  Type /help to see all commands.\n")
      );
      continue;
    }

    // ── Normal agent query ────────────────────────────────────────────────────
    console.log();
    const spinner  = verbose ? null : createSpinner("Thinking…").start();
    const startTime = Date.now();

    let input = trimmed;
    if (persona) input = `[System: ${persona}]\n\n${trimmed}`;

    // Optional tracer
    const tracer = traceMode
      ? new ExecutionTracer({ input: trimmed, model: currentModel, temperature: currentTemperature, maxIterations: 8 })
      : null;

    try {
      const result   = await agent.run(input);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (spinner) spinner.stop();

      // Rich answer rendering
      if (!verbose) {
        console.log("\n" + theme.primary.bold("  🤖 Answer:"));
        console.log(renderAnswer(result.output));
      }

      // Token estimate
      const inTok  = estimateTokens(input);
      const outTok = estimateTokens(result.output);
      const cost   = estimateCost(inTok, outTok);

      console.log(
        "\n" + theme.muted(
          `  ⏱  ${duration}s | ${result.iterations} iter | tools: ${
            result.toolsUsed.length > 0 ? result.toolsUsed.join(", ") : "none"
          } | ~${inTok + outTok} tokens | est. ${cost}`
        ) + "\n"
      );

      // Save trace if enabled
      if (tracer) {
        tracer.finish(result.output, true);
        const tracePath = tracer.save();
        console.log(theme.muted(`  💾 Trace saved: ${tracePath}\n`));
      }

      stats.totalQueries++;
      stats.totalIterations += result.iterations;
      stats.totalDurationMs += Date.now() - startTime;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (spinner) (spinner as { fail(text?: string): void }).fail();
      if (tracer) { tracer.finish("", false, errorMsg); tracer.save(); }
      stats.errors++;
      console.log("\n" + theme.error(`  ✖ ${errorMsg}\n`));
    }

  }
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err) => {
    console.error(theme.error("Fatal: " + err.message));
    process.exit(1);
  });
}
