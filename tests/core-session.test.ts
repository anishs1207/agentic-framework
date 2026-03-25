import { vi, describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import { saveSession, loadSession, listSessions, deleteSession, generateSessionId, SavedSession } from "../src/core/session.js";

vi.mock("fs");

describe("Core Session", () => {
    const mockSession: SavedSession = {
        id: "test-id",
        name: "Test Session",
        savedAt: "2024-03-25T10:00:00Z",
        model: "gpt-4",
        temperature: 0.7,
        persona: null,
        verbose: true,
        stats: {
            startTime: new Date(),
            totalQueries: 10,
            totalIterations: 20,
            totalToolCalls: 5,
            toolCallCounts: { "calc": 5 },
            totalDurationMs: 5000,
            errors: 0,
            model: "gpt-4",
            temperature: 0.7
        },
        messages: [{ role: "user", content: "hello", timestamp: new Date() }],
        aliases: {}
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should save a session correctly", () => {
        saveSession(mockSession);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining("test-id.json"),
            expect.stringContaining('"id": "test-id"'),
            "utf-8"
        );
    });

    it("should load a session and re-hydrate timestamps", () => {
        const serialised = {
            ...mockSession,
            stats: { ...mockSession.stats, startTime: mockSession.stats.startTime.toISOString() },
            messages: mockSession.messages.map(m => ({ ...m, timestamp: (m.timestamp as Date).toISOString() }))
        };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(serialised));

        const loaded = loadSession("test-id");
        expect(loaded).not.toBeNull();
        expect(loaded?.messages[0].timestamp).toBeInstanceOf(Date);
        expect(loaded?.stats.startTime).toBeInstanceOf(Date);
    });

    it("should return null if session file does not exist or is corrupt", () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        expect(loadSession("missing")).toBeNull();

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue("corrupt json");
        expect(loadSession("corrupt")).toBeNull();
    });

    it("should list available sessions", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(fs.readdirSync).mockReturnValue(["s1.json", "s2.json", "not-a-session.txt"] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ id: "s1" }));

        const list = listSessions();
        expect(list).toHaveLength(2);
        expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });

    it("should delete a session", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        const result = deleteSession("test-id");
        expect(result).toBe(true);
        expect(fs.unlinkSync).toHaveBeenCalled();

        vi.mocked(fs.existsSync).mockReturnValue(false);
        const result2 = deleteSession("missing");
        expect(result2).toBe(false);
    });

    it("should generate a session ID", () => {
        const id = generateSessionId("My Session");
        expect(id).toMatch(/my-session-\w+/);
    });
});
