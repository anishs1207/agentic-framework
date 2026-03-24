import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  printSection, infoBox, createSpinner, 
  printBanner, printHelp, printToolCard, printStats, printWorkflowCard, 
  type SessionStats 
} from "../src/cli/ui.js";

describe("CLI UI Helpers", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("printBanner should log the banner", () => {
    printBanner();
    expect(console.log).toHaveBeenCalled();
  });

  it("printHelp should log help sections", () => {
    printHelp();
    expect(console.log).toHaveBeenCalled();
  });

  it("printToolCard should log tool info", () => {
    printToolCard({ 
      name: "Tool", 
      description: "Desc", 
      inputDescription: "In", 
      examples: ["ex"] 
    });
    expect(console.log).toHaveBeenCalled();
  });

  it("printStats should log statistics", () => {
    printStats({
      startTime: new Date(),
      totalQueries: 1,
      totalIterations: 2,
      totalToolCalls: 3,
      toolCallCounts: { "tool": 3 },
      totalDurationMs: 1000,
      errors: 0,
      model: "test",
      temperature: 0.7
    });
    expect(console.log).toHaveBeenCalled();
  });

  it("printWorkflowCard should log workflow steps", () => {
    printWorkflowCard("Flow", ["step 1", "step 2"], "Description");
    expect(console.log).toHaveBeenCalled();
  });

  it("printSection should log a formatted title", () => {
    printSection("Test Title");
    expect(console.log).toHaveBeenCalled();
  });

  it("infoBox should log a boxed content", () => {
    infoBox("Info", "Some content", "cyan");
    expect(console.log).toHaveBeenCalled();
  });

  it("createSpinner should return an ora instance", () => {
    const spinner = createSpinner("Loading...");
    expect(spinner).toBeDefined();
    expect(typeof spinner.start).toBe("function");
  });

  it("printStats should log statistics with all features", () => {
    printStats({
      totalQueries: 10,
      totalIterations: 20,
      totalDurationMs: 1000,
      errors: 1,
      startTime: new Date(),
      activeIterations: [{ agentId: "1", task: "test" }],
      toolCallCountsByAgent: { "1": { "tool": 1 } },
      totalTokens: 100,
      totalCost: 1.0,
      agentPerformance: { "1": { time: 1000, count: 1 } }
    } as unknown as SessionStats);
    expect(console.log).toHaveBeenCalled();
  });

  it("printWorkflowCard should handle different descriptions", () => {
    printWorkflowCard("Flow", ["step"], "Description");
    printWorkflowCard("Flow", ["step"]);
    expect(console.log).toHaveBeenCalled();
  });
});
