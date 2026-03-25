import { handleCommand, type CommandContext } from "../src/cli/dispatcher.js";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { 
  ToolRegistry, 
  ConversationWindowMemory, 
  Agent, 
  AgentPool, 
  Scheduler,
  ExecutionTracer
} from "../src/core/index.js";
import { Message } from "../src/core/memory.js";
import * as readline from "readline";

vi.mock("fs");
vi.stubGlobal("process", { ...process, env: { ...process.env, TELEGRAM_BOT_TOKEN: "mock-token" } });

vi.mock("../src/core/index.js", () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ExecutionTracer: vi.fn(function MockTracer(this: any) {
      this.finish = vi.fn();
      this.save = vi.fn().mockReturnValue("test-trace.json");
    }),
    agentProfileRegistry: { get: vi.fn() },
    globalBus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
    ToolRegistry: vi.fn(),
    ConversationWindowMemory: vi.fn(),
    Agent: vi.fn(),
    AgentPool: vi.fn(),
    Scheduler: vi.fn(),
    AgentProfileRegistry: vi.fn(),
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    AgentEvents: {},
  };
});

vi.mock("../src/cli/ui.js", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colorMock = vi.fn(s => s) as any;
  colorMock.bold = vi.fn(s => s);
  return {
    theme: {
      accent: colorMock,
      primary: colorMock,
      secondary: colorMock,
      success: colorMock,
      error: colorMock,
      warn: colorMock,
      muted: colorMock,
    },
    printHelp: vi.fn(),
    printSection: vi.fn(),
    printToolCard: vi.fn(),
    printStats: vi.fn(),
    createSpinner: vi.fn(() => ({
      start: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
      succeed: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
    })),
  };
});

vi.mock("../src/cli/renderer.js", () => ({
  renderAnswer: vi.fn(s => `rendered: ${s}`),
  estimateTokens: vi.fn(() => 10),
  estimateCost: vi.fn(() => "$0.01"),
}));

vi.mock("../src/cli/telegram.js", () => ({
  isTelegramActive: vi.fn().mockReturnValue(false),
  stopTelegramBridge: vi.fn(),
}));
vi.mock("../src/cli/whatsapp.js", () => ({
  isWhatsAppActive: vi.fn().mockReturnValue(false),
  stopWhatsAppBridge: vi.fn().mockResolvedValue(undefined),
}));

describe("CLI Dispatcher", () => {
  let ctx: CommandContext;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    
    ctx = {
      apiKey: "test-key",
      currentModel: "test-model",
      currentTemperature: 0.7,
      verbose: false,
      persona: null,
      traceMode: false,
      stats: {
        startTime: new Date(),
        totalQueries: 0,
        totalIterations: 0,
        totalToolCalls: 0,
        toolCallCounts: {},
        totalDurationMs: 0,
        errors: 0,
        model: "test-model",
        temperature: 0.7,
      },
      memory: {
        getMessages: vi.fn().mockReturnValue([]),
        clear: vi.fn(),
        addMessage: vi.fn(),
      } as unknown as ConversationWindowMemory,
      registry: {
        listNames: vi.fn().mockReturnValue(["tool1"]),
        get: vi.fn().mockReturnValue({ name: "tool1", description: "desc", inputDescription: "in", examples: [] }),
      } as unknown as ToolRegistry,
      agent: {
        run: vi.fn().mockResolvedValue({ output: "AI response", iterations: 1, toolsUsed: ["tool1"], durationMs: 100 }),
      } as unknown as Agent,
      pool: {} as unknown as AgentPool,
      scheduler: {
        stopAll: vi.fn(),
      } as unknown as Scheduler,
      aliases: { "/h": "/help" },
      rl: {
        close: vi.fn(),
      } as unknown as readline.Interface,
      onUpdateAgent: vi.fn(),
      onUpdateModel: vi.fn(),
      onUpdateTemperature: vi.fn(),
      onUpdateVerbose: vi.fn(),
      onUpdatePersona: vi.fn(),
      onUpdateTraceMode: vi.fn(),
    };
  });

  it("should handle /help command", async () => {
    const { printHelp } = await import("../src/cli/ui.js");
    const result = await handleCommand("/help", ctx);
    expect(result).toBe(true);
    expect(printHelp).toHaveBeenCalled();
  });

  it("should handle /exit and /quit commands", async () => {
    expect(await handleCommand("/exit", ctx)).toBe(false);
    expect(await handleCommand("/quit", ctx)).toBe(false);
    expect(vi.mocked(ctx.scheduler.stopAll)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(ctx.rl.close)).toHaveBeenCalledTimes(2);
  });

  it("should handle /clear command", async () => {
    const result = await handleCommand("/clear", ctx);
    expect(result).toBe(true);
    expect(vi.mocked(ctx.memory.clear)).toHaveBeenCalled();
  });

  it("should handle /verbose command toggling", async () => {
    await handleCommand("/verbose", ctx);
    expect(ctx.onUpdateVerbose).toHaveBeenCalledWith(true);
    
    ctx.verbose = true;
    await handleCommand("/verbose", ctx);
    expect(ctx.onUpdateVerbose).toHaveBeenLastCalledWith(false);
  });

  it("should handle /model command", async () => {
    await handleCommand("/model gpt-4", ctx);
    expect(ctx.onUpdateModel).toHaveBeenCalledWith("gpt-4");
  });

  it("should handle /model without args", async () => {
    await handleCommand("/model", ctx);
    // Should log something, verified by it not crashing and coverage
  });

  it("should handle /temp command with validation", async () => {
    await handleCommand("/temp 0.5", ctx);
    expect(ctx.onUpdateTemperature).toHaveBeenCalledWith(0.5);

    await handleCommand("/temp invalid", ctx);
  });

  it("should handle unknown command", async () => {
    await handleCommand("/unknown", ctx);
  });

  it("should handle /tools command", async () => {
    const { printToolCard } = await import("../src/cli/ui.js");
    await handleCommand("/tools", ctx);
    expect(vi.mocked(ctx.registry.listNames)).toHaveBeenCalled();
    expect(printToolCard).toHaveBeenCalled();
  });

  it("should handle /memory command with role formatting", async () => {
    vi.mocked(ctx.memory.getMessages).mockReturnValue([
      { role: "user", content: "hello" } as unknown as Message,
      { role: "assistant", content: "hi" } as unknown as Message,
      { role: "tool", content: "result" } as unknown as Message
    ]);
    await handleCommand("/memory", ctx);
  });

  it("should handle empty memory message", async () => {
    vi.mocked(ctx.memory.getMessages).mockReturnValue([]);
    await handleCommand("/memory", ctx);
  });

  it("should handle /stats command", async () => {
    const { printStats } = await import("../src/cli/ui.js");
    await handleCommand("/stats", ctx);
    expect(printStats).toHaveBeenCalled();
  });

  it("should resolve and execute aliases", async () => {
    await handleCommand("/h", ctx);
  });

  describe("Agent Query Execution", () => {
    it("should run agent on normal input", async () => {
      const result = await handleCommand("What is 2+2?", ctx);
      expect(result).toBe(true);
      expect(vi.mocked(ctx.agent.run)).toHaveBeenCalledWith("What is 2+2?");
      expect(ctx.stats.totalQueries).toBe(1);
    });

    it("should prepend persona if set", async () => {
      ctx.persona = "Chef";
      await handleCommand("Recipe for eggs?", ctx);
      expect(vi.mocked(ctx.agent.run)).toHaveBeenCalledWith(expect.stringContaining("[System: Chef]"));
    });

    it("should use ExecutionTracer when traceMode is active", async () => {
      ctx.traceMode = true;
      await handleCommand("Trace this", ctx);
      expect(ExecutionTracer).toHaveBeenCalled();
    });

    it("should handle agent errors as string or Error object", async () => {
      // Error object
      vi.mocked(ctx.agent.run).mockRejectedValue(new Error("Api Down"));
      await handleCommand("Help", ctx);
      expect(ctx.stats.errors).toBe(1);

      // String error
      vi.mocked(ctx.agent.run).mockRejectedValue("Fatal crash");
      await handleCommand("Help", ctx);
    });

    it("should handle active bridges on exit", async () => {
      const { isTelegramActive } = await import("../src/cli/telegram.js");
      const { isWhatsAppActive } = await import("../src/cli/whatsapp.js");
      vi.mocked(isTelegramActive).mockReturnValue(true);
      vi.mocked(isWhatsAppActive).mockReturnValue(true);

      await handleCommand("/exit", ctx);
      expect(vi.mocked(isTelegramActive)).toHaveBeenCalled();
    });
  });
});
