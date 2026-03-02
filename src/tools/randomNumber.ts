import { Tool, z } from "../core/tool.js";

const randomNumberSchema = z
  .object({
    min: z.number().describe("Lower bound of the range (inclusive)"),
    max: z.number().describe("Upper bound of the range (inclusive)"),
  })
  .refine((data) => data.max > data.min, {
    message: "max must be greater than min",
    path: ["max"],
  });

export const randomNumberTool = new Tool({
  name: "randomNumber",
  description: "Generate a random number within a given range",
  inputDescription: 'JSON object with "min" and "max" fields',
  examples: ['{"min": 1, "max": 100}', '{"min": 0, "max": 10}', '{"min": 50, "max": 200}'],
  inputSchema: randomNumberSchema,
  func: async ({ min, max }) => {
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    return `Random number between ${min} and ${max}: ${result}`;
  },
});
