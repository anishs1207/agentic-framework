import { describe, it, expect } from "vitest";
import { calculatorTool } from "../src/tools/calculator.js";
import { getTimeTool } from "../src/tools/getTime.js";
import { randomNumberTool } from "../src/tools/randomNumber.js";
import { stringUtilsTool } from "../src/tools/stringUtils.js";

describe("Simple Tools", () => {
    describe("calculator", () => {
        it("should evaluate basic math", async () => {
            const input = JSON.stringify({ expression: "2 + 2 * 3" });
            const result = await calculatorTool.execute(input);
            expect(result).toBe("2 + 2 * 3 = 8");
        });

        it("should handle error in evaluation", async () => {
            const input = JSON.stringify({ expression: "invalid" });
            const result = await calculatorTool.execute(input);
            expect(result).toContain("Error");
        });
    });

    describe("getTime", () => {
        it("should return IST time", async () => {
            const result = await getTimeTool.execute("");
            expect(result).toContain("Current time");
            expect(result).toContain("IST");
        });
    });

    describe("randomNumber", () => {
        it("should return a number in range", async () => {
            const input = JSON.stringify({ min: 10, max: 20 });
            const result = await randomNumberTool.execute(input);
            expect(result).toContain("Random number between 10 and 20:");
            const num = parseInt(result.split(": ")[1]);
            expect(num).toBeGreaterThanOrEqual(10);
            expect(num).toBeLessThanOrEqual(20);
        });

        it("should fail validation if min > max", async () => {
            const input = JSON.stringify({ min: 100, max: 50 });
            const result = await randomNumberTool.execute(input);
            expect(result).toContain("Validation error");
        });
    });

    describe("stringUtils", () => {
        it("should uppercase strings", async () => {
            const input = JSON.stringify({ operation: "uppercase", text: "hello" });
            const result = await stringUtilsTool.execute(input);
            expect(result).toContain('Uppercase: "HELLO"');
        });

        it("should lowercase strings", async () => {
            const input = JSON.stringify({ operation: "lowercase", text: "HELLO" });
            const result = await stringUtilsTool.execute(input);
            expect(result).toContain('Lowercase: "hello"');
        });

        it("should reverse strings", async () => {
            const input = JSON.stringify({ operation: "reverse", text: "abc" });
            const result = await stringUtilsTool.execute(input);
            expect(result).toContain('Reversed: "cba"');
        });

        it("should count length", async () => {
            const input = JSON.stringify({ operation: "length", text: "hello" });
            const result = await stringUtilsTool.execute(input);
            expect(result).toContain('Length of "hello": 5 characters');
        });

        it("should count words", async () => {
            const input = JSON.stringify({ operation: "wordcount", text: "one two three" });
            const result = await stringUtilsTool.execute(input);
            expect(result).toContain('Word count of "one two three": 3 words');
        });
    });
});
