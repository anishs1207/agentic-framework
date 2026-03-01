import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import * as readline from "readline";

// design the agent from scratch

// while(not done):
//     think()
//     maybe call tool()
//     observe()

dotenv.config();

// ─── Tool ──────────────────────────────────────────────────────────────

class Tool {
  name: string;
  description: string;
  func: (input: string) => Promise<string>;

  constructor(
    name: string,
    description: string,
    func: (input: string) => Promise<string>
  ) {
    this.name = name;
    this.description = description;
    this.func = func;
  }

  async execute(input: string): Promise<string> {
    return await this.func(input);
  }
}

// ─── Tool Registry ─────────────────────────────────────────────────────

class ToolRegistry {
  tools: Map<string, Tool>;

  constructor() {
    this.tools = new Map();
  }

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  listDescriptions(): string {
    return [...this.tools.values()]
      .map((t) => `${t.name} : ${t.description}`)
      .join("\n");
  }
}

// ─── LLM Wrapper (Gemini) ──────────────────────────────────────────────

class LLM {
  private model: any;

  constructor(apiKey: string, modelName: string = "gemini-2.5-flash") {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: modelName });
  }

  async generate(prompt: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }
}

// ─── Output Parser ─────────────────────────────────────────────────────

interface ParsedOutput {
  action?: string;
  input?: string;
  final?: string;
}

function parseOutput(text: string): ParsedOutput {
  const actionMatch = text.match(/Action:\s*(.*)/);
  const inputMatch = text.match(/Action Input:\s*(.*)/);

  if (!actionMatch) return { final: text };

  return {
    action: actionMatch[1].trim(),
    input: inputMatch?.[1].trim(),
  };
}

// ─── The ReAct Loop Agent ──────────────────────────────────────────────

class Agent {
  llm: LLM;
  tools: ToolRegistry;

  constructor(llm: LLM, tools: ToolRegistry) {
    this.llm = llm;
    this.tools = tools;
  }

  async run(userInput: string): Promise<string> {
    let scratchpad = "";

    for (let i = 0; i < 5; i++) {
      const prompt = `
You are an intelligent agent that follows the ReAct pattern (Reason + Act).

Available tools:
${this.tools.listDescriptions()}

Instructions:
- Think step by step about the user's question.
- If you need to use a tool, respond EXACTLY in this format:
    Thought: <your reasoning>
    Action: <tool_name>
    Action Input: <input to the tool>
- If you already know the final answer (or after getting observations), respond with:
    Thought: <your reasoning>
    Final Answer: <your final answer>

Important: Always respond with EITHER an Action OR a Final Answer, never both.

Previous reasoning and observations:
${scratchpad || "(none)"}

User question: ${userInput}
`;

      console.log(`\n--- Iteration ${i + 1} ---`);
      const output = await this.llm.generate(prompt);
      console.log("LLM output:\n", output);

      // Check for final answer first
      const finalMatch = output.match(/Final Answer:\s*([\s\S]*)/);
      if (finalMatch) {
        return finalMatch[1].trim();
      }

      const parsed = parseOutput(output);

      if (parsed.final && !parsed.action) {
        return parsed.final;
      }

      if (!parsed.action) {
        return output; // fallback: return raw output if no action and no final answer
      }

      const tool = this.tools.get(parsed.action);

      if (!tool) {
        scratchpad += `\nThought: Tried to use tool "${parsed.action}" but it does not exist.\n`;
        continue;
      }

      const observation = await tool.execute(parsed.input || "");
      console.log(`Tool "${parsed.action}" returned: ${observation}`);

      scratchpad += `
Thought: ${output}
Observation: ${observation}
`;
    }

    return "Max iterations reached.";
  }
}

// ─── Define Tools ──────────────────────────────────────────────────────

const weatherTool = new Tool(
  "weather",
  "Get current weather for a city. Input: city name",
  async (city: string) => {
    // Simulated weather data
    const temps: Record<string, string> = {
      delhi: "35°C, Sunny",
      mumbai: "30°C, Humid",
      london: "15°C, Cloudy",
      "new york": "22°C, Clear",
    };
    const key = city.toLowerCase().trim();
    return temps[key] || `Weather for ${city}: 25°C, Partly Cloudy`;
  }
);

const calculatorTool = new Tool(
  "calculator",
  "Evaluate a math expression. Input: a math expression like '2 + 2'",
  async (expression: string) => {
    try {
      // Simple and safe evaluation for basic math
      const result = Function(`"use strict"; return (${expression})`)();
      return `Result: ${result}`;
    } catch {
      return `Error evaluating expression: ${expression}`;
    }
  }
);

const getTimeTool = new Tool(
  "getTime",
  "Get the current date and time. Input: none required",
  async (_input: string) => {
    const now = new Date();
    return `Current date and time: ${now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`;
  }
);

// ─── CLI Helper ────────────────────────────────────────────────────────

function askQuestion(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.error("❌ Please set your GEMINI_API_KEY in the .env file!");
    console.error("   Get one at: https://aistudio.google.com/apikey");
    process.exit(1);
  }

  // Setup
  const llm = new LLM(apiKey);
  const registry = new ToolRegistry();
  registry.register(weatherTool);
  registry.register(calculatorTool);
  registry.register(getTimeTool);

  const agent = new Agent(llm, registry);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("🤖 Agentic Framework - Powered by Gemini");
  console.log("═══════════════════════════════════════════");
  console.log("Available tools: weather, calculator, getTime");
  console.log('Type your query below. Type "exit" to quit.\n');

  while (true) {
    const userInput = await askQuestion(rl, "🧑 You: ");

    const trimmed = userInput.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
      console.log("\n👋 Goodbye!");
      rl.close();
      break;
    }

    console.log("\n⏳ Thinking...\n");

    try {
      const result = await agent.run(trimmed);
      console.log("\n✅ Agent:", result, "\n");
    } catch (err: any) {
      console.error("\n❌ Error:", err.message, "\n");
    }
  }
}

main().catch(console.error);
