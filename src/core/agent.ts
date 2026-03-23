import { LLM } from "./llm.js";
import { ToolRegistry } from "./tool.js";
import { BaseMemory } from "./memory.js";
import { PromptTemplate, REACT_SYSTEM_PROMPT } from "./prompt.js";
import { parseReActOutput, isFinalAnswer, isToolCall } from "./parser.js";
import { AgentCallbacks, defaultCallbacks } from "./callbacks.js";
import { Logger } from "./logger.js";

export interface AgentConfig {
  llm: LLM;
  tools: ToolRegistry;
  memory?: BaseMemory;
  maxIterations?: number;
  verbose?: boolean;
  callbacks?: AgentCallbacks;
  systemPrompt?: PromptTemplate;
}

export interface AgentResult {
  output: string;
  iterations: number;
  toolsUsed: string[];
  durationMs: number;
}

// The ReAct Loop Agent
export class Agent {
  private llm: LLM;
  private tools: ToolRegistry;
  private memory?: BaseMemory;
  private maxIterations: number;
  private logger: Logger;
  private callbacks: AgentCallbacks;
  private systemPrompt: PromptTemplate;

  constructor(config: AgentConfig) {
    this.llm = config.llm;
    this.tools = config.tools;
    this.memory = config.memory;
    this.maxIterations = config.maxIterations ?? 6;
    this.logger = new Logger(config.verbose ?? true);
    this.callbacks = config.callbacks ?? defaultCallbacks;
    this.systemPrompt = config.systemPrompt ?? REACT_SYSTEM_PROMPT;
  }

  async run(userInput: string): Promise<AgentResult> {
    const startTime = Date.now();
    const toolsUsed: string[] = [];
    let scratchpad = "";

    // Notify callbacks
    this.callbacks.onAgentStart?.(userInput);

    // Add user message to memory
    this.memory?.addMessage("user", userInput);

    // Log memory context
    if (this.memory) {
      this.logger.memory(this.memory.length);
    }

    for (let i = 1; i <= this.maxIterations; i++) {
      this.callbacks.onIterationStart?.(i);

      // Build prompt using template
      const memoryContext = this.memory
        ? `\nConversation history:\n${this.memory.getContext()}\n`
        : "";

      const prompt = this.systemPrompt.format({
        tools: this.tools.listSchemas(),
        memory: memoryContext,
        scratchpad: scratchpad || "(none)",
        input: userInput,
      });

      // Call LLM
      this.logger.subHeader(`Iteration ${i}/${this.maxIterations}`);
      let output: string;

      try {
        output = await this.llm.generate(prompt);
      } catch (error: any) {
        this.callbacks.onLLMError?.(error);
        this.logger.error(`LLM failed: ${error.message}`);
        throw error;
      }

      // Parse the output
      const parsed = parseReActOutput(output);

      // Log thought
      if (parsed.thought) {
        this.logger.thought(i, parsed.thought);
        this.callbacks.onThought?.(parsed.thought, i);
      }

      // Check for final answer
      if (isFinalAnswer(parsed)) {
        const answer = parsed.finalAnswer!;
        this.logger.finalAnswer(answer);
        this.callbacks.onAgentEnd?.(answer);

        // Save to memory
        this.memory?.addMessage("assistant", answer);

        return {
          output: answer,
          iterations: i,
          toolsUsed,
          durationMs: Date.now() - startTime,
        };
      }

      // Process tool call
      if (isToolCall(parsed)) {
        const toolName = parsed.action!;
        const toolInput = parsed.actionInput || "";

        this.logger.action(toolName, toolInput);
        this.callbacks.onToolStart?.(toolName, toolInput);

        const tool = this.tools.get(toolName);

        if (!tool) {
          const errMsg = `Tool "${toolName}" not found. Available: ${this.tools.listNames().join(", ")}`;
          this.logger.error(errMsg);
          this.callbacks.onToolError?.(toolName, errMsg);

          scratchpad += `\nThought: ${parsed.thought || output}\nAction: ${toolName}\nAction Input: ${toolInput}\nObservation: ERROR - ${errMsg}\n`;
          continue;
        }

        try {
          const observation = await tool.execute(toolInput);
          toolsUsed.push(toolName);

          this.logger.observation(observation);
          this.callbacks.onToolEnd?.(toolName, observation);

          // Save tool interaction to memory
          this.memory?.addMessage("tool", `[${toolName}] ${observation}`, { tool: toolName });

          scratchpad += `\nThought: ${parsed.thought || output}\nAction: ${toolName}\nAction Input: ${toolInput}\nObservation: ${observation}\n`;
        } catch (error: any) {
          const errMsg = `Tool execution error: ${error.message}`;
          this.logger.error(errMsg);
          this.callbacks.onToolError?.(toolName, errMsg);

          scratchpad += `\nThought: ${parsed.thought || output}\nAction: ${toolName}\nAction Input: ${toolInput}\nObservation: ERROR - ${errMsg}\n`;
        }

        continue;
      }

      // Fallback: LLM didn't follow format - treat as final answer
      this.logger.warn("LLM did not follow ReAct format. Treating output as final answer.");
      this.memory?.addMessage("assistant", output);

      return {
        output,
        iterations: i,
        toolsUsed,
        durationMs: Date.now() - startTime,
      };
    }

    const fallback = "Max iterations reached. Could not determine an answer.";
    this.logger.error(fallback);

    return {
      output: fallback,
      iterations: this.maxIterations,
      toolsUsed,
      durationMs: Date.now() - startTime,
    };
  }
}
