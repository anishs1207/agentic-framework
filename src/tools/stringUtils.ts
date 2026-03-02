import { Tool, z } from "../core/tool.js";

const stringUtilsSchema = z.object({
  operation: z
    .enum(["reverse", "uppercase", "lowercase", "length", "wordcount"] as const, {
      error: 'operation must be one of: "reverse", "uppercase", "lowercase", "length", "wordcount"',
    })
    .describe("The string operation to perform"),
  text: z.string().min(1, "text must not be empty").describe("The text to operate on"),
});

export const stringUtilsTool = new Tool({
  name: "stringUtils",
  description: "Perform string operations: reverse, uppercase, lowercase, length, wordcount",
  inputDescription: 'JSON object with "operation" and "text" fields',
  examples: [
    '{"operation": "reverse", "text": "hello world"}',
    '{"operation": "uppercase", "text": "make me big"}',
    '{"operation": "wordcount", "text": "how many words here"}',
  ],
  inputSchema: stringUtilsSchema,
  func: async ({ operation, text }) => {
    switch (operation) {
      case "reverse":
        return `Reversed: "${text.split("").reverse().join("")}"`;
      case "uppercase":
        return `Uppercase: "${text.toUpperCase()}"`;
      case "lowercase":
        return `Lowercase: "${text.toLowerCase()}"`;
      case "length":
        return `Length of "${text}": ${text.length} characters`;
      case "wordcount": {
        const words = text.split(/\s+/).filter(Boolean).length;
        return `Word count of "${text}": ${words} words`;
      }
    }
  },
});
