import dotenv from "dotenv";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

import {
  LLM,
  Agent,
  ToolRegistry,
  ConversationWindowMemory,
  logger,
} from "./core/index.js";
import type { AgentCallbacks } from "./core/index.js";
import {
  weatherTool,
  calculatorTool,
  getTimeTool,
  wikipediaTool,
  randomNumberTool,
  stringUtilsTool,
  unitConverterTool,
  currencyConverterTool,
} from "./tools/index.js";

import {
  theme,
  printBanner,
  printHelp,
  printSection,
  printToolCard,
  printStats,
  createSpinner,
  type SessionStats,
} from "./cli/ui.js";

import {
  buildWorkflow,
  runWorkflow,
  listWorkflows,
  loadWorkflowByName,
} from "./cli/workflow.js";

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
// LLM / Agent factory (so we can rebuild on /model change)
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
// Main
// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

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
    .register(currencyConverterTool);

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

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  // ── Startup UI ─────────────────────────────────────────────────────────────
  printBanner();

  printSection("Available Tools");
  registry.listNames().forEach((name) => {
    const tool = registry.get(name)!;
    console.log(
      "  " + theme.primary("⚙  " + name.padEnd(22)) +
      theme.muted(tool.description.slice(0, 55))
    );
  });
  console.log(
    "\n  " + theme.muted(`Model: ${currentModel}  |  Verbose: ON  |  Memory: 20 turns`) +
    "\n  " + theme.muted("Type /help to see all commands.") + "\n"
  );

  // ── REPL loop ──────────────────────────────────────────────────────────────
  while (true) {
    const prompt =
      theme.secondary.bold("❯ ") +
      theme.white.bold("You") +
      theme.muted(` [${currentModel}]`) +
      theme.secondary(" › ");

    const userInput = await askQuestion(rl, prompt);
    const trimmed = userInput.trim();

    if (!trimmed) continue;

    // ── Command dispatch ─────────────────────────────────────────────────────
    if (trimmed.startsWith("/")) {
      const parts = trimmed.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      // ── /exit /quit ──────────────────────────────────────────────────────
      if (cmd === "/exit" || cmd === "/quit") {
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
        // Note: persona is informational — inject it as a system message next query
        // by prepending to the agent prompt (handled in the query below)
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
        } catch (err: any) {
          console.log("\n" + theme.error(`  ✖ Export failed: ${err.message}\n`));
        }
        continue;
      }

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
    const spinner = verbose ? null : createSpinner("Thinking…").start();
    const startTime = Date.now();

    let input = trimmed;
    if (persona) {
      input = `[System: ${persona}]\n\n${trimmed}`;
    }

    try {
      const result = await agent.run(input);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (spinner) spinner.stop();

      // Print the clean final answer box if verbose is off
      if (!verbose) {
        console.log(
          "\n" + theme.primary.bold("  🤖 Answer:") + "\n" +
          theme.white("  " + result.output.split("\n").join("\n  "))
        );
      }

      // Meta line
      console.log(
        "\n" + theme.muted(
          `  ⏱  ${duration}s | ${result.iterations} iter | tools: ${
            result.toolsUsed.length > 0 ? result.toolsUsed.join(", ") : "none"
          }`
        ) + "\n"
      );

      stats.totalQueries++;
      stats.totalIterations += result.iterations;
      stats.totalDurationMs += Date.now() - startTime;
    } catch (err: any) {
      if (spinner) spinner.fail();
      stats.errors++;
      console.log("\n" + theme.error(`  ✖ ${err.message}\n`));
    }
  }
}

main().catch((err) => {
  console.error(theme.error("Fatal: " + err.message));
  process.exit(1);
});
