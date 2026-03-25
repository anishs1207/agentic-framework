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

  it("printBanner should log the banner with version and platform info", () => {
    printBanner();
    expect(console.log).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("v2.0"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Gemini"));
  });

  it("printHelp should log all major sections", () => {
    printHelp();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Core"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Workflows"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Multi-Agent"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("/model"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("/swarm"));
  });

  it("printToolCard should log tool info structure", () => {
    printToolCard({ 
      name: "Calculator", 
      description: "Math tool", 
      inputDescription: "Expression", 
      examples: ["2+2"] 
    });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Calculator"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Math tool"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("2+2"));
  });

  it("printStats should log comprehensive dashboard", () => {
    const stats: SessionStats = {
      startTime: new Date(Date.now() - 10000), // 10s ago
      totalQueries: 5,
      totalIterations: 10,
      totalToolCalls: 15,
      toolCallCounts: { "wikipedia": 10, "google-search": 5 },
      totalDurationMs: 5000,
      errors: 1,
      model: "gemini-pro",
      temperature: 0.5
    };
    printStats(stats);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Session Stats"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("gemini-pro"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("10s")); // uptime
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Tool Usage"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("wikipedia"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("█")); // visual bar
  });

  it("printStats should handle zero queries cleanly", () => {
    const stats: SessionStats = {
      startTime: new Date(),
      totalQueries: 0,
      totalIterations: 0,
      totalToolCalls: 0,
       toolCallCounts: {},
      totalDurationMs: 0,
      errors: 0,
      model: "test",
      temperature: 0.7
    };
    printStats(stats);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Avg resp:     0.0s"));
  });

  it("printWorkflowCard should log workflow details", () => {
    printWorkflowCard("Researcher", ["Search", "Summarize"], "Find news");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Researcher"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Find news"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("1. Search"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("2. Summarize"));
  });

  it("printSection should log a formatted title", () => {
    printSection("System Logs");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("System Logs"));
  });

  it("infoBox should log a boxed content with color", () => {
    infoBox("Alert", "Data saved", "green");
    expect(console.log).toHaveBeenCalled();
  });

  it("createSpinner should return an ora instance", () => {
    const spinner = createSpinner("Loading...");
    expect(spinner).toBeDefined();
    expect(spinner.text).toBeDefined();
  });
});

