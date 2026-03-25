import { vi, describe, it, expect, beforeEach } from "vitest";
import { Agent } from "../src/core/agent.js";
import { ToolRegistry, Tool } from "../src/core/tool.js";
import { ConversationBufferMemory } from "../src/core/memory.js";
import { LLM } from "../src/core/llm.js";

// Hoist mocks
const { MockLLM, MockLogger } = vi.hoisted(() => {
    return {
        MockLLM: vi.fn().mockImplementation(function() {
            return {
                generate: vi.fn(),
                modelName: "test-model"
            };
        }),
        MockLogger: vi.fn().mockImplementation(function() {
            return {
                header: vi.fn(),
                memory: vi.fn(),
                subHeader: vi.fn(),
                thought: vi.fn(),
                finalAnswer: vi.fn(),
                action: vi.fn(),
                observation: vi.fn(),
                error: vi.fn(),
                warn: vi.fn()
            };
        })
    };
});

vi.mock("../src/core/llm.js", () => ({ LLM: MockLLM }));
vi.mock("../src/core/logger.js", () => ({ Logger: MockLogger }));

describe("Core Agent", () => {
    let agent: Agent;
    let mockLLM: { generate: ReturnType<typeof vi.fn>, modelName: string };
    let mockTools: ToolRegistry;
    let mockMemory: ConversationBufferMemory;

    beforeEach(() => {
        vi.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockLLM = new (MockLLM as unknown as { new (): any })();
        mockTools = new ToolRegistry();
        mockMemory = new ConversationBufferMemory();
        agent = new Agent({
            llm: mockLLM as unknown as LLM,
            tools: mockTools,
            memory: mockMemory,
            maxIterations: 3
        });
    });

    it("should return final answer immediately if LLM provides it", async () => {
        mockLLM.generate.mockResolvedValue("Thought: I know this.\nFinal Answer: 42");
        const result = await agent.run("What is the answer?");
        expect(result.output).toBe("42");
        expect(result.iterations).toBe(1);
    });

    it("should execute a tool and then give final answer", async () => {
        const mockTool = new Tool({
            name: "get_weather",
            description: "get weather",
            func: async (input: unknown) => `Weather in ${input} is sunny`
        });
        mockTools.register(mockTool);

        mockLLM.generate
            .mockResolvedValueOnce("Thought: I need to check weather.\nAction: get_weather\nAction Input: London")
            .mockResolvedValueOnce("Thought: Now I know.\nFinal Answer: It is sunny in London.");

        const result = await agent.run("Weather in London?");
        expect(result.output).toBe("It is sunny in London.");
        expect(result.iterations).toBe(2);
        expect(result.toolsUsed).toContain("get_weather");
    });

    it("should handle 'tool not found' and continue", async () => {
        mockLLM.generate
            .mockResolvedValueOnce("Action: missing_tool\nAction Input: test")
            .mockResolvedValueOnce("Final Answer: fallback");

        const result = await agent.run("test");
        expect(result.output).toBe("fallback");
        expect(result.iterations).toBe(2);
    });

    it("should handle tool execution error and continue", async () => {
        const buggyTool = new Tool({
            name: "buggy",
            description: "buggy",
            func: async () => { throw new Error("Crash"); }
        });
        mockTools.register(buggyTool);

        mockLLM.generate
            .mockResolvedValueOnce("Action: buggy\nAction Input: x")
            .mockResolvedValueOnce("Final Answer: safe answer");

        const result = await agent.run("test");
        expect(result.output).toBe("safe answer");
    });

    it("should reach max iterations and return error message", async () => {
        mockLLM.generate.mockResolvedValue("Thought: thinking...\nAction: some_tool\nAction Input: data");
        const result = await agent.run("infinite loop");
        // Update expectation to match actual message: "Max iterations reached. Could not determine an answer."
        expect(result.output).toContain("Max iterations reached");
        expect(result.iterations).toBe(3);
    });

    it("should fallback to final answer if LLM ignores format", async () => {
        mockLLM.generate.mockResolvedValue("Just some random text without markers.");
        const result = await agent.run("test");
        expect(result.output).toBe("Just some random text without markers.");
    });

    it("should bubble up LLM fatal errors", async () => {
        mockLLM.generate.mockRejectedValue(new Error("API Down"));
        await expect(agent.run("test")).rejects.toThrow("API Down");
    });

    it("should call callbacks correctly", async () => {
        const callbacks = {
            onAgentStart: vi.fn(),
            onAgentEnd: vi.fn(),
            onIterationStart: vi.fn(),
        };
        const agentWithCallbacks = new Agent({
            llm: mockLLM as unknown as LLM,
            tools: mockTools,
            callbacks
        });

        mockLLM.generate.mockResolvedValue("Final Answer: done");
        await agentWithCallbacks.run("hi");

        expect(callbacks.onAgentStart).toHaveBeenCalled();
        expect(callbacks.onAgentEnd).toHaveBeenCalledWith("done");
        expect(callbacks.onIterationStart).toHaveBeenCalled();
    });
});
