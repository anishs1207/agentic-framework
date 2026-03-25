import { describe, it, expect } from "vitest";
import { weatherTool } from "../src/tools/weather.js";

describe("Weather Tool", () => {
    it("should return weather for known cities", async () => {
        const input = JSON.stringify({ city: "Delhi" });
        const result = await weatherTool.execute(input);
        expect(result).toContain("Weather in Delhi: 35°C, ☀️ Sunny");
    });

    it("should handle lowercase city names", async () => {
        const input = JSON.stringify({ city: "london" });
        const result = await weatherTool.execute(input);
        expect(result).toContain("Weather in london: 15°C, ☁️ Cloudy");
    });

    it("should return default weather for unknown cities", async () => {
        const input = JSON.stringify({ city: "UnknownCity" });
        const result = await weatherTool.execute(input);
        expect(result).toContain("Weather in UnknownCity: 25°C");
    });
});
