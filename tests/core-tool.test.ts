import { describe, it, expect } from "vitest";
import { Tool, ToolRegistry, z } from "../src/core/tool.js";

describe("Core Tool", () => {
    describe("Tool", () => {
        it("should execute legacy tools with raw strings", async () => {
            const tool = new Tool({
                name: "test",
                description: "desc",
                func: async (input: string) => `echo ${input}`
            });
            
            const result = await tool.execute("hello");
            expect(result).toBe("echo hello");
            expect(tool.toSchema()).toContain("test: desc");
        });

        it("should execute structured tools with Zod validation", async () => {
            const schema = z.object({ query: z.string(), limit: z.number().optional() });
            const tool = new Tool({
                name: "search",
                description: "search tool",
                inputSchema: schema,
                func: async (input) => `Searching ${input.query} (limit ${input.limit ?? 10})`
            });

            const result = await tool.execute(JSON.stringify({ query: "vitest", limit: 5 }));
            expect(result).toBe("Searching vitest (limit 5)");
        });

        it("should return error for invalid JSON input in structured tools", async () => {
            const tool = new Tool({
                name: "search",
                description: "desc",
                inputSchema: z.object({ q: z.string() }),
                func: async () => "ok"
            });

            const result = await tool.execute("not json");
            expect(result).toContain("Input must be valid JSON");
        });

        it("should return validation error for Zod failures", async () => {
            const tool = new Tool({
                name: "search",
                description: "desc",
                inputSchema: z.object({ age: z.number() }),
                func: async () => "ok"
            });

            const result = await tool.execute(JSON.stringify({ age: "not a number" }));
            expect(result).toContain("Validation error");
            expect(result).toContain("age");
        });

        it("should include examples and input format in schema", () => {
            const tool = new Tool({
                name: "test",
                description: "desc",
                examples: ["ex1", "ex2"],
                inputSchema: z.string(),
                func: async () => "ok"
            });
            const schema = tool.toSchema();
            expect(schema).toContain("Examples: ex1, ex2");
            expect(schema).toContain("Input format: JSON");
        });
    });

    describe("ToolRegistry", () => {
        it("should register and retrieve tools", () => {
            const registry = new ToolRegistry();
            const tool = new Tool({ name: "t1", description: "d1", func: async () => "ok" });
            
            registry.register(tool);
            expect(registry.has("t1")).toBe(true);
            expect(registry.get("t1")).toBe(tool);
            expect(registry.listNames()).toEqual(["t1"]);
        });

        it("should list descriptions and schemas", () => {
            const registry = new ToolRegistry();
            registry.register(new Tool({ name: "t1", description: "d1", func: async () => "ok" }));
            registry.register(new Tool({ name: "t2", description: "d2", func: async () => "ok" }));

            expect(registry.listDescriptions()).toContain("t1 : d1");
            expect(registry.listDescriptions()).toContain("t2 : d2");
            expect(registry.listSchemas()).toContain("- t1: d1");
            expect(registry.listSchemas()).toContain("- t2: d2");
        });
    });
});
