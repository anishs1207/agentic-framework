import { vi, describe, it, expect, beforeEach } from "vitest";
import { AgentPool } from "../src/core/multi-agent.js";
import { ToolRegistry, Tool } from "../src/core/tool.js";
import { AgentProfile } from "../src/core/agent-registry.js";
import { AgentResult } from "../src/core/agent.js";

// Hoist mocks
const { MockAgent, MockLLM } = vi.hoisted(() => {
    return {
        MockAgent: vi.fn().mockImplementation(function() {
            return {
                run: vi.fn()
            };
        }),
        MockLLM: vi.fn().mockImplementation(function() {
            return {};
        })
    };
});

vi.mock("../src/core/agent.js", () => ({ Agent: MockAgent }));
vi.mock("../src/core/llm.js", () => ({ LLM: MockLLM }));
vi.mock("../src/core/events.js", () => ({
    globalBus: {
        emitSync: vi.fn(),
        emit: vi.fn()
    },
    AgentEvents: {
        AGENT_CREATED: "agent:created",
        AGENT_STARTED: "agent:started",
        AGENT_COMPLETED: "agent:completed",
        AGENT_ERROR: "agent:error"
    }
}));
vi.mock("../src/core/logger.js", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn()
    }
}));

describe("Core Multi-Agent (AgentPool)", () => {
    let pool: AgentPool;
    let mockTools: ToolRegistry;
    const profile: AgentProfile = {
        id: "p1",
        name: "Helper",
        description: "desc",
        role: "worker",
        model: "m1",
        temperature: 0.1,
        maxIterations: 5,
        tools: ["t1"],
        createdAt: "",
        updatedAt: ""
    };

    const defaultResult: AgentResult = {
        output: "done",
        iterations: 1,
        toolsUsed: [],
        durationMs: 100
    };

    beforeEach(() => {
        vi.clearAllMocks();
        pool = new AgentPool("api-key");
        mockTools = new ToolRegistry();
        mockTools.register(new Tool({ name: "t1", description: "d1", func: async () => "ok" }));
    });

    it("should spawn agents from profile", () => {
        const spawned = pool.spawn(profile, mockTools);
        expect(spawned.name).toBe("Helper");
        expect(pool.get(spawned.id)).toBe(spawned);
        expect(pool.get("Helper")).toBe(spawned);
    });

    it("should terminate agents", () => {
        const spawned = pool.spawn(profile, mockTools);
        expect(pool.terminate(spawned.id)).toBe(true);
        expect(pool.get(spawned.id)).toBeUndefined();
    });

    it("should run one agent and capture result", async () => {
        const spawned = pool.spawn(profile, mockTools);
        const mockAgentRun = vi.mocked(spawned.agent.run);
        mockAgentRun.mockResolvedValue({ ...defaultResult, toolsUsed: ["t1"] });

        const result = await pool.runOne(spawned.id, "hello");
        expect(result.result?.output).toBe("done");
        expect(spawned.status).toBe("done");
    });

    it("should handle errors in runOne", async () => {
        const spawned = pool.spawn(profile, mockTools);
        const mockAgentRun = vi.mocked(spawned.agent.run);
        mockAgentRun.mockRejectedValue(new Error("Fail"));

        const result = await pool.runOne(spawned.id, "hello");
        expect(result.error).toBe("Fail");
        expect(spawned.status).toBe("error");
    });

    it("should run parallel tasks", async () => {
        const s1 = pool.spawn(profile, mockTools);
        const s2 = pool.spawn(profile, mockTools);
        vi.mocked(s1.agent.run).mockResolvedValue({ ...defaultResult, output: "r1" });
        vi.mocked(s2.agent.run).mockResolvedValue({ ...defaultResult, output: "r2" });

        const results = await pool.runParallel([
            { agentId: s1.id, input: "i1" },
            { agentId: s2.id, input: "i2" }
        ]);

        expect(results).toHaveLength(2);
        expect(results[0].result?.output).toBe("r1");
        expect(results[1].result?.output).toBe("r2");
    });

    it("should run sequential tasks with chaining", async () => {
        const s1 = pool.spawn(profile, mockTools);
        const s2 = pool.spawn(profile, mockTools);
        vi.mocked(s1.agent.run).mockResolvedValue({ ...defaultResult, output: "res1" });
        vi.mocked(s2.agent.run).mockResolvedValue({ ...defaultResult, output: "res2" });

        const results = await pool.runSequential([
            { agentId: s1.id, input: "i1" },
            { agentId: s2.id, input: "i2" }
        ], true);

        expect(results).toHaveLength(2);
        expect(vi.mocked(s2.agent.run)).toHaveBeenCalledWith(expect.stringContaining("res1"));
    });

    it("should run with supervisor pattern", async () => {
        const worker = pool.spawn(profile, mockTools);
        const supervisor = pool.spawn({ ...profile, id: "sup", name: "Boss" }, mockTools);
        
        vi.mocked(worker.agent.run).mockResolvedValue({ ...defaultResult, output: "work done" });
        vi.mocked(supervisor.agent.run).mockResolvedValue({ ...defaultResult, output: "final synthesis" });

        const swarmResult = await pool.runWithSupervisor(supervisor.id, [
            { agentId: worker.id, input: "do task" }
        ], "Summarize.");

        expect(swarmResult.finalSynthesis).toBe("final synthesis");
        expect(swarmResult.results).toHaveLength(2);
        expect(vi.mocked(supervisor.agent.run)).toHaveBeenCalledWith(expect.stringContaining("work done"));
    });
});
