import { describe, it, expect } from "vitest";
import { parseReActOutput, isFinalAnswer, isToolCall } from "../src/core/parser.js";

describe("Core Parser", () => {
    it("should parse full ReAct output with thought and action", () => {
        const text = `Thought: I should search for the capital.
Action: search
Action Input: "What is the capital of France?"`;
        const result = parseReActOutput(text);
        expect(result.thought).toBe("I should search for the capital.");
        expect(result.action).toBe("search");
        expect(result.actionInput).toBe('"What is the capital of France?"');
        expect(isToolCall(result)).toBe(true);
        expect(isFinalAnswer(result)).toBe(false);
    });

    it("should parse final answer with thought", () => {
        const text = `Thought: I found it.
Final Answer: The capital of France is Paris.`;
        const result = parseReActOutput(text);
        expect(result.thought).toBe("I found it.");
        expect(result.finalAnswer).toBe("The capital of France is Paris.");
        expect(isFinalAnswer(result)).toBe(true);
        expect(isToolCall(result)).toBe(false);
    });

    it("should prioritize final answer over action if both are present", () => {
        const text = `Action: thinking
Final Answer: 42`;
        const result = parseReActOutput(text);
        expect(result.finalAnswer).toBe("42");
        expect(result.action).toBeUndefined(); // Returns early (see parser.ts:23)
    });

    it("should handle empty or malformed text", () => {
        const result = parseReActOutput("Hello world");
        expect(result).toEqual({});
    });

    it("should handle non-whitespace thought at the end", () => {
        const text = `Thought: Thinking without action`;
        const result = parseReActOutput(text);
        expect(result.thought).toBe("Thinking without action");
    });
});
