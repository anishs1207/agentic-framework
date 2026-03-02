// Parsed Output 
export interface ParsedOutput {
  thought?: string;
  action?: string;
  actionInput?: string;
  finalAnswer?: string;
}

// ReAct Output Parser 
export function parseReActOutput(text: string): ParsedOutput {
  const result: ParsedOutput = {};

  // Extract Thought
  const thoughtMatch = text.match(/Thought:\s*([\s\S]*?)(?=\n(?:Action|Final Answer):|\n*$)/);
  if (thoughtMatch) {
    result.thought = thoughtMatch[1].trim();
  }

  // Extract Final Answer (prioritize this)
  const finalMatch = text.match(/Final Answer:\s*([\s\S]*)/);
  if (finalMatch) {
    result.finalAnswer = finalMatch[1].trim();
    return result;
  }

  // Extract Action
  const actionMatch = text.match(/Action:\s*(.*)/);
  if (actionMatch) {
    result.action = actionMatch[1].trim();
  }

  // Extract Action Input
  const inputMatch = text.match(/Action Input:\s*([\s\S]*?)(?=\n(?:Thought|Action|Final Answer):|\n*$)/);
  if (inputMatch) {
    result.actionInput = inputMatch[1].trim();
  }

  return result;
}

// Check if output is a final answer 
export function isFinalAnswer(parsed: ParsedOutput): boolean {
  return parsed.finalAnswer !== undefined;
}

export function isToolCall(parsed: ParsedOutput): boolean {
  return parsed.action !== undefined;
}
