import { describe, it, expect } from "vitest";
import { PromptTemplate } from "../src/core/prompt.js";

describe("PromptTemplate", () => {
    it("should format templates correctly", () => {
        const template = new PromptTemplate("Hello {name}, you have {count} messages.", ["name", "count"]);
        const result = template.format({ name: "Alice", count: "5" });
        expect(result).toBe("Hello Alice, you have 5 messages.");
    });

    it("should handle missing variables with empty strings", () => {
        const template = new PromptTemplate("Hello {name}, you have {count} messages.", ["name", "count"]);
        const result = template.format({ name: "Alice" });
        expect(result).toBe("Hello Alice, you have  messages.");
    });

    it("should create template from string automatically", () => {
        const template = PromptTemplate.fromTemplate("Hello {name}, welcome to {place}.");
        const result = template.format({ name: "Bob", place: "Paris" });
        expect(result).toBe("Hello Bob, welcome to Paris.");
    });

    it("should handle multiple instances of the same variable", () => {
        const template = PromptTemplate.fromTemplate("{name} said {name} is happy.");
        const result = template.format({ name: "Bob" });
        expect(result).toBe("Bob said Bob is happy.");
    });

    it("should handle templates with no variables", () => {
        const template = PromptTemplate.fromTemplate("Simple text");
        expect(template.format({})).toBe("Simple text");
    });
});
