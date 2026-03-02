import dotenv from "dotenv";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
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

dotenv.config();

function askQuestion(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer));
  });
}

function printBanner() {
  const CYAN = "\x1b[36m";
  const BOLD = "\x1b[1m";
  const DIM = "\x1b[2m";
  const RESET = "\x1b[0m";
  const YELLOW = "\x1b[33m";
  const MAGENTA = "\x1b[35m";
  const GREEN = "\x1b[32m";

  console.log(`
${CYAN}${BOLD}    ╔═══════════════════════════════════════════════════╗
    ║                                                   ║
    ║       🤖  AGENTIC FRAMEWORK  v1.1                 ║
    ║       ─────────────────────────                   ║
    ║       Powered by Google Gemini                    ║
    ║       ReAct Pattern • Tool Use • Memory           ║
    ║                                                   ║
    ╚═══════════════════════════════════════════════════╝${RESET}

${YELLOW}${BOLD}  Architecture:${RESET}${DIM}
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Prompt  │───▶│   LLM    │───▶│  Parser  │
    │ Template │    │ (Gemini) │    │ (ReAct)  │
    └──────────┘    └──────────┘    └─────┬────┘
                                          │
    ┌──────────┐    ┌──────────┐    ┌─────▼────┐
    │  Memory  │◀───│   Agent  │◀───│  Router  │
    │ (Window) │    │ (Engine) │    │          │
    └──────────┘    └──────────┘    └─────┬────┘
                                          │
                                    ┌─────▼────┐
                                    │  Tools   │
                                    │ Registry │
                                    └──────────┘${RESET}
`);
}

function printHelp() {
  const DIM = "\x1b[2m";
  const BOLD = "\x1b[1m";
  const CYAN = "\x1b[36m";
  const YELLOW = "\x1b[33m";
  const RESET = "\x1b[0m";

  console.log(`
${CYAN}${BOLD}  Commands:${RESET}
    ${YELLOW}/help${RESET}          ${DIM}Show this help message${RESET}
    ${YELLOW}/tools${RESET}         ${DIM}List all available tools with details${RESET}
    ${YELLOW}/memory${RESET}        ${DIM}Show conversation memory${RESET}
    ${YELLOW}/clear${RESET}         ${DIM}Clear conversation memory${RESET}
    ${YELLOW}/verbose${RESET}       ${DIM}Toggle verbose mode (show/hide agent internals)${RESET}
    ${YELLOW}/stats${RESET}         ${DIM}Show session statistics (queries, tools used, timing)${RESET}
    ${YELLOW}/export [file]${RESET} ${DIM}Export conversation history to a file (default: chat-export.txt)${RESET}
    ${YELLOW}/exit${RESET}          ${DIM}Exit the application${RESET}
  `);
}

// ─── Session Stats ────────────────────────────────────────────────────────────
interface SessionStats {
  startTime: Date;
  totalQueries: number;
  totalIterations: number;
  totalToolCalls: number;
  toolCallCounts: Record<string, number>;
  totalDurationMs: number;
  errors: number;
}

function printStats(stats: SessionStats) {
  const BOLD = "\x1b[1m";
  const CYAN = "\x1b[36m";
  const YELLOW = "\x1b[33m";
  const GREEN = "\x1b[32m";
  const DIM = "\x1b[2m";
  const RESET = "\x1b[0m";

  const uptimeSec = ((Date.now() - stats.startTime.getTime()) / 1000).toFixed(0);
  const avgDuration =
    stats.totalQueries > 0
      ? (stats.totalDurationMs / stats.totalQueries / 1000).toFixed(1)
      : "0.0";

  console.log(`\n${CYAN}${BOLD}  📊 Session Statistics${RESET}`);
  console.log(`${DIM}  ${"─".repeat(40)}${RESET}`);
  console.log(`  ${YELLOW}Session uptime:${RESET}    ${GREEN}${uptimeSec}s${RESET}`);
  console.log(`  ${YELLOW}Total queries:${RESET}     ${GREEN}${stats.totalQueries}${RESET}`);
  console.log(`  ${YELLOW}Total iterations:${RESET}  ${GREEN}${stats.totalIterations}${RESET}`);
  console.log(`  ${YELLOW}Total tool calls:${RESET}  ${GREEN}${stats.totalToolCalls}${RESET}`);
  console.log(`  ${YELLOW}Avg response time:${RESET} ${GREEN}${avgDuration}s${RESET}`);
  console.log(`  ${YELLOW}Errors:${RESET}            ${GREEN}${stats.errors}${RESET}`);

  if (Object.keys(stats.toolCallCounts).length > 0) {
    console.log(`\n  ${CYAN}${BOLD}  🔧 Tool Usage Breakdown:${RESET}`);
    const sorted = Object.entries(stats.toolCallCounts).sort(([, a], [, b]) => b - a);
    for (const [tool, count] of sorted) {
      const bar = "█".repeat(Math.min(count * 2, 20));
      console.log(`  ${YELLOW}  ${tool.padEnd(20)}${RESET} ${GREEN}${bar} ${count}${RESET}`);
    }
  }
  console.log();
}

// ─── Export Conversation ──────────────────────────────────────────────────────
function exportConversation(
  memory: ConversationWindowMemory,
  stats: SessionStats,
  filepath: string
) {
  const messages = memory.getMessages();
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════");
  lines.push("  AGENTIC FRAMEWORK - Conversation Export");
  lines.push(`  Exported at: ${new Date().toLocaleString()}`);
  lines.push(`  Session queries: ${stats.totalQueries} | Tool calls: ${stats.totalToolCalls}`);
  lines.push("═══════════════════════════════════════════════════\n");

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

  lines.push("\n── Session Stats ──────────────────────────────────");
  lines.push(`Total queries: ${stats.totalQueries}`);
  lines.push(`Total iterations: ${stats.totalIterations}`);
  lines.push(`Total tool calls: ${stats.totalToolCalls}`);
  lines.push(`Errors: ${stats.errors}`);
  if (Object.keys(stats.toolCallCounts).length > 0) {
    lines.push(`Tool breakdown: ${JSON.stringify(stats.toolCallCounts, null, 2)}`);
  }

  fs.writeFileSync(filepath, lines.join("\n"), "utf-8");
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.error("❌ Please set your GEMINI_API_KEY in the .env file!");
    console.error("   Get one at: https://aistudio.google.com/apikey");
    process.exit(1);
  }

  const llm = new LLM({
    apiKey,
    modelName: "gemini-2.5-flash",
    maxRetries: 3,
    retryDelayMs: 2000,
    temperature: 0.7,
  });

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

  // ─── Session Stats Tracker ────────────────────────────────────────────────
  const stats: SessionStats = {
    startTime: new Date(),
    totalQueries: 0,
    totalIterations: 0,
    totalToolCalls: 0,
    toolCallCounts: {},
    totalDurationMs: 0,
    errors: 0,
  };

  let verbose = true;

  const callbacks: AgentCallbacks = {
    onAgentStart: (input) => {
      if (verbose) logger.subHeader(`Processing: "${input}"`);
    },
    onAgentEnd: (_answer) => {},
    onToolEnd: (toolName, _output) => {
      stats.totalToolCalls++;
      stats.toolCallCounts[toolName] = (stats.toolCallCounts[toolName] ?? 0) + 1;
    },
  };

  const agent = new Agent({
    llm,
    tools: registry,
    memory,
    maxIterations: 6,
    verbose,
    callbacks,
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  printBanner();
  logger.toolList(
    registry
      .listNames()
      .map((name) => {
        const tool = registry.get(name);
        return `${name} — ${tool?.description || ""}`;
      })
  );
  console.log('  Type /help for commands, or ask anything!\n');

  while (true) {
    const userInput = await askQuestion(rl, "\x1b[1m\x1b[36m🧑 You:\x1b[0m ");
    const trimmed = userInput.trim();

    if (!trimmed) continue;

    if (trimmed.startsWith("/")) {
      const cmd = trimmed.toLowerCase();
      const cmdBase = cmd.split(/\s+/)[0];

      if (cmdBase === "/exit" || cmdBase === "/quit") {
        console.log("\n\x1b[33m👋 Goodbye! Thanks for using Agentic Framework.\x1b[0m\n");
        rl.close();
        break;
      }

      if (cmdBase === "/help") {
        printHelp();
        continue;
      }

      if (cmdBase === "/tools") {
        console.log();
        registry.listNames().forEach((name) => {
          const tool = registry.get(name);
          if (tool) {
            console.log(`\x1b[35m\x1b[1m  📦 ${tool.name}\x1b[0m`);
            console.log(`\x1b[2m     ${tool.description}\x1b[0m`);
            console.log(`\x1b[2m     Input: ${tool.inputDescription}\x1b[0m`);
            if (tool.examples.length > 0) {
              console.log(`\x1b[2m     Examples: ${tool.examples.join(", ")}\x1b[0m`);
            }
            console.log();
          }
        });
        continue;
      }

      if (cmdBase === "/memory") {
        const messages = memory.getMessages();
        if (messages.length === 0) {
          console.log("\x1b[2m  🧠 Memory is empty.\x1b[0m\n");
        } else {
          console.log(`\x1b[33m\x1b[1m\n  🧠 Memory (${messages.length} messages):\x1b[0m`);
          messages.forEach((m, i) => {
            const role = m.role === "user" ? "🧑 Human" : m.role === "assistant" ? "🤖 AI" : "🔧 Tool";
            const content = m.content.length > 100 ? m.content.slice(0, 100) + "..." : m.content;
            console.log(`\x1b[2m  ${i + 1}. [${role}] ${content}\x1b[0m`);
          });
          console.log();
        }
        continue;
      }

      if (cmdBase === "/clear") {
        memory.clear();
        console.log("\x1b[32m  🧹 Memory cleared!\x1b[0m\n");
        continue;
      }

      if (cmdBase === "/verbose") {
        verbose = !verbose;
        logger.verbose = verbose;
        console.log(`\x1b[33m  🔊 Verbose mode: ${verbose ? "ON" : "OFF"}\x1b[0m\n`);
        continue;
      }

      // ─── /stats ───────────────────────────────────────────────────────────
      if (cmdBase === "/stats") {
        printStats(stats);
        continue;
      }

      // ─── /export [filename] ──────────────────────────────────────────────
      if (cmdBase === "/export") {
        const parts = trimmed.split(/\s+/);
        const filename = parts[1] || "chat-export.txt";
        const filepath = path.resolve(filename);
        try {
          exportConversation(memory, stats, filepath);
          console.log(`\x1b[32m  💾 Conversation exported to: ${filepath}\x1b[0m\n`);
        } catch (err: any) {
          console.log(`\x1b[31m  ❌ Export failed: ${err.message}\x1b[0m\n`);
        }
        continue;
      }

      console.log(`\x1b[31m  Unknown command: ${trimmed}\x1b[0m`);
      console.log(`\x1b[2m  Type /help to see available commands.\x1b[0m\n`);
      continue;
    }

    console.log();
    const startTime = Date.now();

    try {
      const result = await agent.run(trimmed);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      // Update session stats
      stats.totalQueries++;
      stats.totalIterations += result.iterations;
      stats.totalDurationMs += Date.now() - startTime;

      console.log(
        `\n\x1b[2m  ⏱  Completed in ${duration}s | ${result.iterations} iteration(s) | Tools used: ${
          result.toolsUsed.length > 0 ? result.toolsUsed.join(", ") : "none"
        }\x1b[0m\n`
      );
    } catch (err: any) {
      stats.errors++;
      logger.error(err.message);
      console.log();
    }
  }
}

main().catch(console.error);
