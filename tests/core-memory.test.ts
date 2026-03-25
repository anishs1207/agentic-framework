import { describe, it, expect, beforeEach } from "vitest";
import { ConversationBufferMemory, ConversationWindowMemory, SummarizerMemory } from "../src/core/memory.js";

describe("Core Memory", () => {
    describe("ConversationBufferMemory", () => {
        let memory: ConversationBufferMemory;

        beforeEach(() => {
            memory = new ConversationBufferMemory();
        });

        it("should store and retrieve messages", () => {
            memory.addMessage("user", "hello");
            memory.addMessage("assistant", "hi");
            expect(memory.length).toBe(2);
            expect(memory.getMessages()).toHaveLength(2);
            expect(memory.getContext()).toContain("Human: hello");
            expect(memory.getContext()).toContain("AI: hi");
        });

        it("should clear messages", () => {
            memory.addMessage("user", "hello");
            memory.clear();
            expect(memory.length).toBe(0);
        });

        it("should handle empty context", () => {
            expect(memory.getContext()).toBe("");
        });
    });

    describe("ConversationWindowMemory", () => {
        it("should limit messages to window size", () => {
            const memory = new ConversationWindowMemory(2);
            memory.addMessage("user", "m1");
            memory.addMessage("assistant", "m2");
            memory.addMessage("user", "m3");
            
            expect(memory.length).toBe(2);
            expect(memory.getMessages()[0].content).toBe("m2");
            expect(memory.getMessages()[1].content).toBe("m3");
        });
    });

    describe("SummarizerMemory", () => {
        it("should keep recent messages and compress older ones", () => {
            const memory = new SummarizerMemory({ maxRecent: 2 });
            memory.addMessage("user", "m1");
            memory.addMessage("assistant", "m2");
            memory.addMessage("user", "m3");
            
            expect(memory.getMessages()).toHaveLength(2);
            expect(memory.getContext()).toContain("m2");
            expect(memory.getContext()).toContain("m3");
            expect(memory.getContext()).toContain("Earlier conversation summary:");
            expect(memory.getContext()).toContain("Human: m1");
        });

        it("should allow manual summary injection", () => {
            const memory = new SummarizerMemory();
            memory.addSummary("Previous talk about cars.");
            expect(memory.getContext()).toContain("Previous talk about cars.");
        });

        it("should handle various roles in summary", () => {
            const memory = new SummarizerMemory({ maxRecent: 1 });
            memory.addMessage("tool", "tool-res");
            memory.addMessage("system", "sys-msg");
            
            expect(memory.getContext()).toContain("Tool: tool-res");
            expect(memory.getContext()).toContain("System: sys-msg");
        });

        it("should truncate long summaries", () => {
            const memory = new SummarizerMemory({ maxRecent: 0 });
            const longText = "a".repeat(300);
            memory.addMessage("user", longText);
            expect(memory.getSummary()).toHaveLength(200 + 7 + 3); // "Human: " + 200 + "..."
        });
    });
});
