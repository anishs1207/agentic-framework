import { vi, describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import { AgentProfileRegistry, AgentProfile } from "../src/core/agent-registry.js";

vi.mock("fs", () => ({
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    readFileSync: vi.fn().mockReturnValue("{}"),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn()
}));

describe("AgentProfileRegistry", () => {
    let registry: AgentProfileRegistry;

    const mockProfile: AgentProfile = {
        id: "test-agent",
        name: "Test Agent",
        description: "A test agent",
        role: "tester",
        model: "gpt-4",
        temperature: 0.7,
        maxIterations: 5,
        tools: ["tool1"],
        createdAt: "2024-03-25T10:00:00Z",
        updatedAt: "2024-03-25T10:00:00Z"
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fs.existsSync).mockReturnValue(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(fs.readdirSync).mockReturnValue(["test-agent.json"] as any);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockProfile));
        registry = new AgentProfileRegistry();
    });

    it("should load profiles from disk on instantiation", () => {
        expect(registry.get("test-agent")).toBeDefined();
        expect(registry.list()).toHaveLength(1);
    });

    it("should handle corrupt profiles during load", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(fs.readdirSync).mockReturnValue(["corrupt.json"] as any);
        vi.mocked(fs.readFileSync).mockReturnValue("not json");
        const corruptRegistry = new AgentProfileRegistry();
        expect(corruptRegistry.list()).toHaveLength(0);
    });

    it("should create and save a new profile", () => {
        const newProfile = registry.create({
            name: "New Agent",
            description: "New desc",
            role: "coder",
            model: "gemini",
            temperature: 0.1,
            maxIterations: 10,
            tools: []
        });

        expect(newProfile.id).toContain("new-agent");
        expect(fs.writeFileSync).toHaveBeenCalled();
        expect(registry.findByName("New Agent")).toEqual(newProfile);
    });

    it("should find profile by name or ID (case-insensitive)", () => {
        expect(registry.findByName("TEST AGENT")).toEqual(mockProfile);
        expect(registry.findByName("test-agent")).toEqual(mockProfile);
    });

    it("should delete a profile and its file", () => {
        const result = registry.delete("test-agent");
        expect(result).toBe(true);
        expect(registry.get("test-agent")).toBeUndefined();
        expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it("should return false when deleting non-existent profile", () => {
        expect(registry.delete("missing")).toBe(false);
    });

    it("should provide presets", () => {
        const presets = AgentProfileRegistry.presets();
        expect(presets).toHaveLength(3);
        expect(presets[0].name).toBe("Researcher");
    });
});
