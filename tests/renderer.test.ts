import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  estimateTokens, estimateCost, renderAnswer, progressBar, pill, 
  divider, printTable, printKeyValue, printTimeline 
} from "../src/cli/renderer.js";
import chalk from "chalk";

describe("CLI Renderer", () => {
  describe("estimateTokens", () => {
    it("should estimate tokens based on length", () => {
      expect(estimateTokens("hello world")).toBe(3); // 11 / 4 = 2.75 -> 3
      expect(estimateTokens("")).toBe(0);
    });
  });

  describe("estimateCost", () => {
    it("should return a cost string", () => {
      const cost = estimateCost(1000000, 1000000);
      expect(cost).toBe("$0.37500"); // (1*0.075 + 1*0.30) = 0.375
    });

    it("should return < $0.0001 for very low costs", () => {
      const cost = estimateCost(1, 1);
      expect(cost).toBe("< $0.0001");
    });

    it("should handle zero tokens", () => {
      expect(estimateCost(0, 0)).toEqual("$0.00000");
    });
  });

  describe("renderAnswer", () => {
    it("should format headings", () => {
      const rendered = renderAnswer("# Heading 1\n## Heading 2\n### Heading 3");
      expect(rendered).toContain("Heading 1");
      expect(rendered).toContain("Heading 2");
      expect(rendered).toContain("Heading 3");
    });

    it("should format bold and code", () => {
      const rendered = renderAnswer("This is **bold** and `code`.");
      expect(rendered).toContain("bold");
      expect(rendered).toContain("code");
    });

    it("should format lists", () => {
      const rendered = renderAnswer("- Item 1\n* Item 2\n1. Item 3\n  - Subitem");
      expect(rendered).toContain("•");
      expect(rendered).toContain("1.");
      expect(rendered).toContain("Subitem");
    });

    it("should handle mixed content", () => {
      const input = "Check this:\n1. Step one\n   - Detail\n**End**";
      const rendered = renderAnswer(input);
      expect(rendered).toContain("Step one");
      expect(rendered).toContain("Detail");
      expect(rendered).toContain("End");
    });
  });

  describe("progressBar", () => {
    it("should return a progress bar string", () => {
      const bar = progressBar(50, 100, 10);
      expect(bar).toContain("50%");
      expect(bar).toContain("█");
      expect(bar).toContain("░");
    });

    it("should handle 0% and 100%", () => {
      expect(progressBar(0, 100)).toContain("0%");
      expect(progressBar(100, 100)).toContain("100%");
    });

    it("should handle total 0", () => {
      expect(progressBar(50, 0)).toContain("0%");
    });
  });

  describe("pill", () => {
    it("should return a formatted pill string for all colors", () => {
      const colors = ["primary", "success", "error", "warn", "secondary", "accent"] as const;
      for (const color of colors) {
        const p = pill("TEST", color);
        expect(p).toContain("[TEST]");
      }
    });
  });

  describe("divider", () => {
    it("should return a divider string", () => {
      const d = divider("-", 10);
      expect(d).toContain("----------");
    });

    it("should use default parameters", () => {
      const d = divider();
      expect(d).toContain("━");
    });
  });

  describe("UI Renderers (Console)", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {});
    });

    it("printTable should log a table with various options", () => {
      const rows = [
        { name: "Alice", role: "Admin", bio: "A very long biography that should be truncated" },
        { name: "Bob", role: "User", bio: "Short bio" }
      ];
      const cols = [
        { key: "name", header: "Name", align: "left" as const },
        { key: "role", header: "Role", color: (v: string) => chalk.red(v), align: "right" as const },
        { key: "bio", header: "Bio", width: 10 }
      ];
      printTable(rows, cols, "Staff Table");
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Staff Table"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Alice"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Admin"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("…")); // Bio truncated
    });

    it("printTable should handle empty rows", () => {
      printTable([], [{ key: "a", header: "A" }]);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("empty table"));
    });

    it("printKeyValue should log pairs", () => {
      printKeyValue([["Key", "Value"]], "Settings", "cyan");
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Settings"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Key"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Value"));
    });

    it("printTimeline should log events with statuses and durations", () => {
      const events = [
        { label: "Step 1", status: "done" as const, durationMs: 100, detail: "All good" },
        { label: "Step 2", status: "warn" as const, durationMs: 200 },
        { label: "Step 3", status: "error" as const, detail: "Failed mission" },
        { label: "Step 4", status: "info" as const }
      ];
      printTimeline(events, "Deployment");
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Deployment"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("✔"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("✖"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("⚠"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Step 1"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("All good"));
    });
  });
});

