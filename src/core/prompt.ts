// Prompt Templates (like LangChain's PromptTemplate)
export class PromptTemplate {
  private template: string;
  private inputVariables: string[];

  constructor(template: string, inputVariables: string[]) {
    this.template = template;
    this.inputVariables = inputVariables;
  }

  format(values: Record<string, string>): string {
    let result = this.template;
    for (const key of this.inputVariables) {
      const value = values[key] ?? "";
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return result;
  }

  static fromTemplate(template: string): PromptTemplate {
    const matches = template.match(/\{(\w+)\}/g) || [];
    const variables = matches.map((m) => m.slice(1, -1));
    return new PromptTemplate(template, [...new Set(variables)]);
  }
}

// Built-in ReAct Prompt 
export const REACT_SYSTEM_PROMPT = PromptTemplate.fromTemplate(`You are an intelligent AI agent that follows the ReAct pattern (Reason + Act).
You have access to a set of tools. Your goal is to answer the user's question as helpfully as possible.

Available tools:
{tools}

Instructions:
- Think step by step about the user's question.
- If you need to use a tool, respond EXACTLY in this format:
    Thought: <your reasoning>
    Action: <tool_name>
    Action Input: <input to the tool>
- If you already know the final answer (or after getting observations), respond with:
    Thought: <your reasoning>
    Final Answer: <your final answer>

Important rules:
1. Always respond with EITHER an Action OR a Final Answer, never both.
2. Use EXACT tool names as listed above.
3. After receiving an Observation, reason about it before giving Final Answer.

{memory}

Previous reasoning and observations:
{scratchpad}

User question: {input}`);
