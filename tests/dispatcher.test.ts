import { handleCommand, type CommandContext } from "../src/cli/dispatcher.js";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { 
  ToolRegistry, 
  ConversationWindowMemory, 
  Agent, 
  AgentPool, 
  Scheduler 
} from "../src/core/index.js";
import * as readline from "readline";

vi.mock("fs");
vi.mock("../src/core/index.js", () => {
  return {
    ExecutionTracer: class {
      finish = vi.fn();
      save = vi.fn().mockReturnValue("test-trace.json");
    },
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
        run: vi.fn().mockResolvedValue({ output: "AI response", iterations: 1, toolsUsed: [] }),
      } as unknown as Agent,
      pool: {} as unknown as AgentPool,
      scheduler: {
        stopAll: vi.fn(),
      } as unknown as Scheduler,
      aliases: {},
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
    const result = await handleCommand("/help", ctx);
    expect(result).toBe(true);
    expect(console.log).toHaveBeenCalled();
  });

  it("should handle /clear command", async () => {
    const result = await handleCommand("/clear", ctx);
    expect(result).toBe(true);
    expect(ctx.memory.clear).toHaveBeenCalled();
  });

  it("should handle /verbose command", async () => {
    const result = await handleCommand("/verbose", ctx);
    expect(result).toBe(true);
    expect(ctx.onUpdateVerbose).toHaveBeenCalledWith(true);
  });

  it("should handle /model command", async () => {
    const result = await handleCommand("/model new-model", ctx);
    expect(result).toBe(true);
    expect(ctx.onUpdateModel).toHaveBeenCalledWith("new-model");
  });

  it("should handle /exit command", async () => {
    const result = await handleCommand("/exit", ctx);
    expect(result).toBe(false);
    expect(ctx.rl.close).toHaveBeenCalled();
  });

  it("should handle unknown command", async () => {
    await handleCommand("/unknown", ctx);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Unknown command"));
  });

  it("should handle /tools command", async () => {
    await handleCommand("/tools", ctx);
    expect(ctx.registry.listNames).toHaveBeenCalled();
  });

  it("should handle /memory command", async () => {
    ctx.memory.getMessages = vi.fn().mockReturnValue([{ role: "user", content: "test" }]);
    await handleCommand("/memory", ctx);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Memory"));
  });

  it("should handle /stats command", async () => {
    await handleCommand("/stats", ctx);
    expect(console.log).toHaveBeenCalled();
  });

  it("should handle /temp command", async () => {
    await handleCommand("/temp 0.5", ctx);
    expect(ctx.onUpdateTemperature).toHaveBeenCalledWith(0.5);
  });

  it("should handle /model without args", async () => {
    await handleCommand("/model", ctx);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Current model"));
  });

  it("should run agent with persona", async () => {
    ctx.persona = "You are a cat";
    await handleCommand("Hello", ctx);
    expect(ctx.agent.run).toHaveBeenCalledWith(expect.stringContaining("[System: You are a cat]"));
  });

  it("should handle agent errors", async () => {
    ctx.agent.run = vi.fn().mockRejectedValue(new Error("Agent failed"));
    await handleCommand("Hello", ctx);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Agent failed"));
  });

  it("should resolve aliases", async () => {
    ctx.aliases = { "/h": "/help" };
    await handleCommand("/h", ctx);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("/swarm"));
  });

  it("should handle empty input", async () => {
    const result = await handleCommand("  ", ctx);
    expect(result).toBe(true);
  });

  it("should handle /exit with active bridges", async () => {
    const { isTelegramActive } = await import("../src/cli/telegram.js");
    const { isWhatsAppActive } = await import("../src/cli/whatsapp.js");
    vi.mocked(isTelegramActive).mockReturnValue(true);
    vi.mocked(isWhatsAppActive).mockReturnValue(true);

    const result = await handleCommand("/exit", ctx);
    expect(result).toBe(false);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Goodbye"));
  });

  it("should handle empty memory", async () => {
    ctx.memory.getMessages = vi.fn().mockReturnValue([]);
    await handleCommand("/memory", ctx);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Memory is empty"));
  });

  it("should handle persona in agent run", async () => {
    ctx.persona = "You are a cat";
    await handleCommand("Hello", ctx);
    expect(ctx.agent.run).toHaveBeenCalledWith(expect.stringContaining("[System: You are a cat]"));
  });

  it("should handle agent error with spinner and tracer", async () => {
    ctx.verbose = false; // Trigger spinner
    ctx.traceMode = true; 
    ctx.agent.run = vi.fn().mockRejectedValue(new Error("Boom"));
    await handleCommand("Hello", ctx);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("✖ Boom"));
  });

  it("should handle invalid temperature", async () => {
    await handleCommand("/temp invalid", ctx);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Provide a number 0–2"));
  });

  it("should run agent on normal input", async () => {
    const result = await handleCommand("Hello AI", ctx);
    expect(result).toBe(true);
    expect(ctx.agent.run).toHaveBeenCalledWith("Hello AI");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("🤖 Answer:"));
  });
});
