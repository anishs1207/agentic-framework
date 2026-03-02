import dotenv from "dotenv";
import * as readline from "readline";
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
    ║       🤖  AGENTIC FRAMEWORK  v1.0                 ║
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
    ${YELLOW}/help${RESET}      ${DIM}Show this help message${RESET}
    ${YELLOW}/tools${RESET}     ${DIM}List all available tools with details${RESET}
    ${YELLOW}/memory${RESET}    ${DIM}Show conversation memory${RESET}
    ${YELLOW}/clear${RESET}     ${DIM}Clear conversation memory${RESET}
    ${YELLOW}/verbose${RESET}   ${DIM}Toggle verbose mode (show/hide agent internals)${RESET}
    ${YELLOW}/exit${RESET}      ${DIM}Exit the application${RESET}
  `);
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
    .register(stringUtilsTool);

  const memory = new ConversationWindowMemory(20); 


  let verbose = true;

  const callbacks: AgentCallbacks = {
    onAgentStart: (input) => {
      if (verbose) logger.subHeader(`Processing: "${input}"`);
    },
    onAgentEnd: (answer) => {
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

      if (cmd === "/exit" || cmd === "/quit") {
        console.log("\n\x1b[33m👋 Goodbye! Thanks for using Agentic Framework.\x1b[0m\n");
        rl.close();
        break;
      }

      if (cmd === "/help") {
        printHelp();
        continue;
      }

      if (cmd === "/tools") {
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

      if (cmd === "/memory") {
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

      if (cmd === "/clear") {
        memory.clear();
        console.log("\x1b[32m  🧹 Memory cleared!\x1b[0m\n");
        continue;
      }

      if (cmd === "/verbose") {
        verbose = !verbose;
        logger.verbose = verbose;
        console.log(`\x1b[33m  🔊 Verbose mode: ${verbose ? "ON" : "OFF"}\x1b[0m\n`);
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

      console.log(
        `\n\x1b[2m  ⏱  Completed in ${duration}s | ${result.iterations} iteration(s) | Tools used: ${
          result.toolsUsed.length > 0 ? result.toolsUsed.join(", ") : "none"
        }\x1b[0m\n`
      );
    } catch (err: any) {
      logger.error(err.message);
      console.log();
    }
  }
}

main().catch(console.error);
