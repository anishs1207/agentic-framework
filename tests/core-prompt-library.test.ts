import { vi, describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import { PromptLibrary, PromptEntry } from "../src/core/prompt-library.js";

vi.mock("fs");

describe("PromptLibrary", () => {
    let library: PromptLibrary;

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock empty custom prompts
        vi.mocked(fs.existsSync).mockReturnValue(false);
        library = new PromptLibrary();
    });

    it("should list built-in prompts", () => {
        const list = library.list();
        expect(list.length).toBeGreaterThan(1);
        expect(list.some(p => p.name === "analyst")).toBe(true);
    });

    it("should group by category", () => {
        const groups = library.byCategory();
        // Built-ins have categories
        expect(Object.keys(groups).length).toBeGreaterThan(0);
    });

    it("should find by name (case insensitive)", () => {
        const found = library.find("CODER");
        expect(found?.name).toBe("coder");
    });

    it("should search name, description, and tags", () => {
        const search1 = library.search("data");
        expect(search1.some(p => p.name === "analyst")).toBe(true);

        const search3 = library.search("coding");
        expect(search3.some(p => p.name === "coder")).toBe(true);
    });

    it("should save and load custom prompts", () => {
        const custom: PromptEntry = {
            name: "my-bot",
            description: "Custom bot",
            category: "Personal",
            text: "Hello",
            tags: ["mine"]
        };

        library.saveCustom(custom);
        expect(fs.writeFileSync).toHaveBeenCalled();

        const found = library.find("my-bot");
        expect(found?.name).toBe("my-bot");
    });

    it("should delete custom prompts", () => {
        const custom: PromptEntry = {
            name: "to-delete",
            description: "Bye",
            category: "X",
            text: "X",
            tags: []
        };
        library.saveCustom(custom);
        
        const result = library.deleteCustom("to-delete");
        expect(result).toBe(true);
        expect(library.find("to-delete")).toBeUndefined();
    });

    it("should handle corrupt custom prompts file", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue("not json");
        const corruptLib = new PromptLibrary();
        // Should only have built-ins
        expect(corruptLib.list().length).toBeGreaterThan(0);
    });
});
