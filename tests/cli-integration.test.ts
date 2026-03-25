import { vi, describe, it, expect, beforeEach } from "vitest";
import { handleCommand, type CommandContext } from "../src/cli/dispatcher.js";
import { 
  Agent, 
  ToolRegistry, 
  ConversationWindowMemory, 
  Scheduler,
  AgentPool,
  Tool
} from "../src/core/index.js";
import { LLM } from "../src/core/llm.js";
import * as readline from "readline";

// Integration test for CLI components
describe("CLI Integration", () => {
    let ctx: CommandContext;
    let memory: ConversationWindowMemory;
    let registry: ToolRegistry;
    let agent: Agent;

    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        
        memory = new ConversationWindowMemory(10);
        registry = new ToolRegistry();
        
        // Mock a tool
        registry.register(new Tool({
            name: "get_weather",
            description: "Get weather",
            inputDescription: "city",
            func: async ({ city }: Record<string, string>) => `It is sunny in ${city}`
        }));

        agent = new Agent({
            llm: { generate: vi.fn(), modelName: "test-model" } as unknown as LLM,
            memory,
            tools: registry
        });

        // Mock the agent's LLM response
        vi.spyOn(agent, "run").mockImplementation(async (input: string) => {
            if (input.includes("weather")) {
                return { output: "The weather is sunny.", iterations: 2, toolsUsed: ["get_weather"], durationMs: 100 };
            }
            return { output: "I don't know.", iterations: 1, toolsUsed: [], durationMs: 50 };
        });

        ctx = {
            apiKey: "fake",
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
            memory,
            registry,
            agent,
            pool: new AgentPool("key"),
            scheduler: new Scheduler(vi.fn()),
            aliases: {},
            rl: { close: vi.fn() } as unknown as readline.Interface,
            onUpdateAgent: vi.fn(),
            onUpdateModel: vi.fn(),
            onUpdateTemperature: vi.fn(),
            onUpdateVerbose: vi.fn(),
            onUpdatePersona: vi.fn(),
            onUpdateTraceMode: vi.fn(),
        };
    });

    it("should process a complex command flow", async () => {
        // 1. Initial help
        await handleCommand("/help", ctx);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Core"));

        // 2. Run a query that uses a tool (mocked)
        await handleCommand("What is the weather in London?", ctx);
        expect(agent.run).toHaveBeenCalledWith(expect.stringContaining("weather"));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("🤖 Answer:"));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("get_weather"));

        // 3. Check stats
        await handleCommand("/stats", ctx);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Queries:      1"));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("test-model"));

        // 4. Check memory
        // Since we mocked agent.run, it doesn't automatically add to memory unless we use the real one.
        // But in dispatcher, agent.run response output is handled by UI.
        // Let's verify dispatcher stats update
        expect(ctx.stats.totalQueries).toBe(1);

        // 5. Clear memory
        await handleCommand("/clear", ctx);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Memory cleared"));
    });

    it("should handle settings changes and persist them in context", async () => {
        await handleCommand("/model custom-model", ctx);
        expect(ctx.onUpdateModel).toHaveBeenCalledWith("custom-model");

        await handleCommand("/temp 1.2", ctx);
        expect(ctx.onUpdateTemperature).toHaveBeenCalledWith(1.2);

        await handleCommand("/verbose", ctx);
        expect(ctx.onUpdateVerbose).toHaveBeenCalledWith(true);
    });
});
