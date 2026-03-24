import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  estimateTokens, estimateCost, renderAnswer, progressBar, pill, 
  divider, printTable, printKeyValue, printTimeline 
} from "../src/cli/renderer.js";

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
      const rendered = renderAnswer("- Item 1\n* Item 2\n1. Item 3");
      expect(rendered).toContain("•");
      expect(rendered).toContain("1.");
    });
  });

  describe("progressBar", () => {
    it("should return a progress bar string", () => {
      const bar = progressBar(50, 100, 10);
      expect(bar).toContain("50%");
      expect(bar).toContain("█");
      expect(bar).toContain("░");
    });
  });

  describe("pill", () => {
    it("should return a formatted pill string", () => {
      const p = pill("TEST", "success");
      expect(p).toContain("[TEST]");
    });
  });

  describe("divider", () => {
    it("should return a divider string", () => {
      const d = divider("-", 10);
      expect(d).toContain("----------");
    });
  });

  describe("UI Renderers (Console)", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {});
    });

    it("printTable should log a table", () => {
      printTable([{ a: 1, b: 2 }], [{ key: "a", header: "A" }, { key: "b", header: "B" }]);
      expect(console.log).toHaveBeenCalled();
    });

    it("printTable should handle empty rows", () => {
      printTable([], [{ key: "a", header: "A" }]);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("empty table"));
    });

    it("printKeyValue should log pairs", () => {
      printKeyValue([["Key", "Value"]], "Title");
      expect(console.log).toHaveBeenCalled();
    });

    it("printTimeline should log events", () => {
      printTimeline([{ label: "Start" }, { label: "End", status: "done" }], "Timeline");
      expect(console.log).toHaveBeenCalled();
    });

    it("divider should use default parameters", () => {
      const d = divider();
      expect(d).toContain("━");
    });

    it("renderAnswer should handle default format", () => {
      const out = renderAnswer("Plain text");
      expect(out).toBe("  Plain text");
    });

    it("estimateCost should handle zero tokens", () => {
      expect(estimateCost(0, 0)).toEqual("$0.00000");
    });

    it("printKeyValue should handle default title", () => {
      printKeyValue([["Key", "Value"]]);
      expect(console.log).toHaveBeenCalled();
    });
  });
});
