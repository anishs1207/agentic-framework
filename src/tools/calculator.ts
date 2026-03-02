import { Tool, z } from "../core/tool.js";

const calculatorSchema = z.object({
  expression: z
    .string()
    .min(1, "Expression must not be empty")
    .describe("A mathematical expression to evaluate"),
});

export const calculatorTool = new Tool({
  name: "calculator",
  description: "Evaluate a mathematical expression",
  inputDescription: 'JSON object with an "expression" field (e.g. {"expression": "2 + 2"})',
  examples: ['{"expression": "2 + 2"}', '{"expression": "42 * 17 + 5"}', '{"expression": "Math.sqrt(144)"}'],
  inputSchema: calculatorSchema,
  func: async ({ expression }) => {
    try {
      const sanitized = expression.replace(
        /[^0-9+\-*/().%\s,Math.sqrtpowabsceilfloorround]/g,
        ""
      );
      const result = Function(`"use strict"; return (${sanitized})`)();
      return `${expression} = ${result}`;
    } catch {
      return `Error: Could not evaluate "${expression}"`;
    }
  },
});
