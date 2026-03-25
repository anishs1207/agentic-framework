import { describe, it, expect } from "vitest";
import { currencyConverterTool } from "../src/tools/currencyConverter.js";

describe("Currency Converter Tool", () => {
    it("should convert USD to INR correctly", async () => {
        const input = JSON.stringify({ amount: 100, from: "USD", to: "INR" });
        const result = await currencyConverterTool.execute(input);
        expect(result).toContain("US Dollar (USD) = 8350.00 Indian Rupee (INR)");
    });

    it("should convert EUR to GBP correctly", async () => {
        // EUR is 0.92, GBP is 0.79 -> 100 EUR = (100 / 0.92) * 0.79 = 85.87 approx
        const input = JSON.stringify({ amount: 100, from: "EUR", to: "GBP" });
        const result = await currencyConverterTool.execute(input);
        expect(result).toContain("Euro (EUR) = 85.87 British Pound (GBP)");
    });

    it("should handle unknown currency codes", async () => {
        const input = JSON.stringify({ amount: 10, from: "AAA", to: "USD" });
        const result = await currencyConverterTool.execute(input);
        expect(result).toContain('Unknown currency: "AAA"');

        const input2 = JSON.stringify({ amount: 10, from: "USD", to: "BBB" });
        const result2 = await currencyConverterTool.execute(input2);
        expect(result2).toContain('Unknown currency: "BBB"');
    });

    it("should handle lowercase and partial codes (handled by validator)", async () => {
        const input = JSON.stringify({ amount: 1, from: "usd", to: "eur" });
        const result = await currencyConverterTool.execute(input);
        expect(result).toContain("US Dollar (USD) = 0.92");
    });

    it("should format small values with high precision", async () => {
        // USD (1) to KWD (0.31) -> 0.1 USD = 0.031 KWD
        const input = JSON.stringify({ amount: 0.1, from: "USD", to: "KWD" });
        const result = await currencyConverterTool.execute(input);
        expect(result).toContain("0.031 Kuwaiti Dinar (KWD)");
    });
});
