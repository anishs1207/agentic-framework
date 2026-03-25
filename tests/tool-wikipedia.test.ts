import { vi, describe, it, expect, beforeEach } from "vitest";
import { wikipediaTool } from "../src/tools/wikipedia.js";

describe("Wikipedia Tool", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it("should return Wikipedia summary for a valid query", async () => {
        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
                title: "Einstein",
                extract: "Albert Einstein was a physicist."
            })
        } as unknown as Response);

        const input = JSON.stringify({ query: "Einstein" });
        const result = await wikipediaTool.execute(input);

        expect(result).toContain("Wikipedia: Einstein");
        expect(result).toContain("Albert Einstein was a physicist.");
    });

    it("should handle article not found", async () => {
        vi.mocked(global.fetch).mockResolvedValue({
            ok: false
        } as unknown as Response);

        const input = JSON.stringify({ query: "SomethingNonExistent" });
        const result = await wikipediaTool.execute(input);
        expect(result).toContain('No Wikipedia article found for "SomethingNonExistent"');
    });

    it("should handle fetch errors", async () => {
        vi.mocked(global.fetch).mockRejectedValue(new Error("Network fail"));

        const input = JSON.stringify({ query: "test" });
        const result = await wikipediaTool.execute(input);
        expect(result).toContain("Wikipedia search failed: Network fail");
    });
});
