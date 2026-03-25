import { describe, it, expect } from "vitest";
import { jsonTool } from "../src/tools/jsonTool.js";

describe("JSON Tool", () => {
    it("should parse and summarise valid JSON", async () => {
        const input = JSON.stringify({ op: "parse", data: '{"user": {"name": "Alice", "age": 30}}' });
        const result = await jsonTool.execute(input);
        expect(result).toContain("Valid JSON");
        expect(result).toContain("user: {name: Alice, age: 30}");
    });

    it("should stringify data", async () => {
        const input = JSON.stringify({ op: "stringify", data: '{"a": 1}' });
        const result = await jsonTool.execute(input);
        expect(result).toContain('"a": 1');
    });

    it("should get value by path", async () => {
        const input = JSON.stringify({ op: "get", data: '{"a": {"b": 2}}', path: "a.b" });
        const result = await jsonTool.execute(input);
        expect(result).toBe("2");
    });

    it("should handle missing path in get", async () => {
        const input = JSON.stringify({ op: "get", data: '{"a": 1}', path: "b.c" });
        const result = await jsonTool.execute(input);
        expect(result).toBe("(not found)");
    });

    it("should list keys and values", async () => {
        const inputK = JSON.stringify({ op: "keys", data: '{"a": 1, "b": 2}' });
        expect(await jsonTool.execute(inputK)).toBe("a, b");

        const inputV = JSON.stringify({ op: "values", data: '{"a": 1}' });
        expect(await jsonTool.execute(inputV)).toBe('a: 1');
    });

    it("should handle invalid JSON data", async () => {
        const input = JSON.stringify({ op: "parse", data: "invalid json" });
        const result = await jsonTool.execute(input);
        expect(result).toContain("ERROR parsing JSON");
    });

    it("should summarise deep objects and arrays", async () => {
        const complex = {
            arr: [1, 2, 3, 4],
            obj: { a: 1, b: 2, c: 3, d: 4, e: 5 },
            deep: { deep2: { deep3: { deep4: { deep5: "stop" } } } }
        };
        const input = JSON.stringify({ op: "summarise", data: JSON.stringify(complex) });
        const result = await jsonTool.execute(input);
        expect(result).toContain("arr: Array(4)");
        expect(result).toContain("obj: {a: 1, b: 2, c: 3, d: 4, ...}");
        expect(result).toContain("(...)"); // depth limit
    });
});
