export interface AgentCallbacks {
  /** Called when the agent starts processing a query */
  onAgentStart?: (input: string) => void;

  /** Called at the start of each ReAct iteration */
  onIterationStart?: (iteration: number) => void;

  /** Called when the LLM returns a thought */
  onThought?: (thought: string, iteration: number) => void;

  /** Called when a tool is about to be invoked */
  onToolStart?: (toolName: string, input: string) => void;

  /** Called when a tool returns a result */
  onToolEnd?: (toolName: string, output: string) => void;

  /** Called when a tool is not found */
  onToolError?: (toolName: string, error: string) => void;

  /** Called when the agent produces a final answer */
  onAgentEnd?: (answer: string) => void;

  /** Called when the LLM call fails */
  onLLMError?: (error: Error) => void;

  /** Called on retry */
  onRetry?: (attempt: number, error: string) => void;
}

export const defaultCallbacks: AgentCallbacks = {};
