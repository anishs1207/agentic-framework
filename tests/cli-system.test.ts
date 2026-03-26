import { vi, describe, it, expect, beforeEach } from "vitest";
import * as readline from "readline";

// Mock FIRST
vi.mock("fs", () => ({ existsSync: vi.fn().mockReturnValue(true), mkdirSync: vi.fn(), writeFileSync: vi.fn(), readdirSync: vi.fn().mockReturnValue([]) }));
vi.mock("readline", () => ({ createInterface: vi.fn() }));
vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

vi.mock("../src/core/index.js", () => {
    return {
        LLM: function() {},
        Agent: function() { return { run: vi.fn().mockResolvedValue({ output: "AI", iterations: 1, toolsUsed: [], durationMs: 0 }) }; },
        ToolRegistry: function() { return { register: vi.fn().mockReturnThis(), listNames: vi.fn().mockReturnValue([]), get: vi.fn() }; },
        ConversationWindowMemory: function() { return { getMessages: vi.fn().mockReturnValue([]), clear: vi.fn(), addMessage: vi.fn() }; },
        AgentPool: function() { return { list: vi.fn().mockReturnValue([]), spawn: vi.fn(), runOne: vi.fn() }; },
        Scheduler: function() { return { stopAll: vi.fn(), addJob: vi.fn(), listJobs: vi.fn().mockReturnValue([]) }; },
        ExecutionTracer: function() { return { finish: vi.fn(), save: vi.fn() }; },
        agentProfileRegistry: { get: vi.fn(), list: vi.fn().mockReturnValue([]), create: vi.fn() },
        globalBus: { on: vi.fn(), getHistory: vi.fn().mockReturnValue([]) },
        AgentProfileRegistry: { presets: vi.fn().mockReturnValue([]) },
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), subHeader: vi.fn(), verbose: true },
        AgentEvents: { AGENT_COMPLETED: "agent_completed" },
        saveSession: vi.fn(),
        listSessions: vi.fn().mockReturnValue([]),
        generateSessionId: vi.fn().mockReturnValue("sid"),
        promptLibrary: { search: vi.fn().mockReturnValue([]), list: vi.fn().mockReturnValue([]) },
        loadPlugins: vi.fn().mockResolvedValue([]),
        listPluginFiles: vi.fn().mockReturnValue([]),
        parseSchedule: vi.fn().mockReturnValue(0),
    };
});

vi.mock("../src/cli/ui.js", () => {
    const id = (v: any) => v; id.bold = (v: any) => v;
    return {
        theme: { accent: id, primary: id, secondary: id, success: id, error: id, warn: id, muted: id, white: id },
        printBanner: vi.fn(), printHelp: vi.fn(), printSection: vi.fn(), printToolCard: vi.fn(), printStats: vi.fn(),
        createSpinner: vi.fn(() => ({ start: vi.fn().mockReturnThis(), stop: vi.fn().mockReturnThis(), succeed: vi.fn().mockReturnThis(), fail: vi.fn().mockReturnThis() })),
        pill: vi.fn(s => s),
    };
});

vi.mock("../src/cli/renderer.js", () => ({ printTable: vi.fn(), renderAnswer: vi.fn(s => s), estimateTokens: vi.fn(() => 0), estimateCost: vi.fn(() => "$0") }));

import { main } from "../src/index.js";

describe("CLI System Integration", () => {
    let mockRl: any;
    let inputs: string[] = [];
    let idx = 0;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.GEMINI_API_KEY = "key";
        process.env.NODE_ENV = "test";
        vi.stubGlobal("process", { ...process, exit: vi.fn() });
        idx = 0;
        mockRl = {
            question: vi.fn((p, cb) => {
                const val = idx < inputs.length ? inputs[idx++] : "/exit";
                cb(val);
            }),
            close: vi.fn(),
        };
        vi.mocked(readline.createInterface).mockReturnValue(mockRl as any);
    });

    it("should run the CLI main", async () => {
        inputs = ["/help", "/exit"];
        await main();
        expect(mockRl.close).toHaveBeenCalled();
    });
});
