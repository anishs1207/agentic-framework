import { vi, describe, it, expect, beforeEach } from "vitest";
import { LLM } from "../src/core/llm.js";

// Hoist mocks
const { mockGenerateContent, MockGoogleGenerativeAI } = vi.hoisted(() => {
    const genContent = vi.fn();
    return {
        mockGenerateContent: genContent,
        MockGoogleGenerativeAI: vi.fn().mockImplementation(function() {
            return {
                getGenerativeModel: vi.fn().mockReturnValue({
                    generateContent: genContent
                })
            };
        })
    };
});

vi.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: MockGoogleGenerativeAI
}));

vi.mock("../src/core/logger.js", () => ({
    logger: {
        retry: vi.fn(),
        info: vi.fn(),
        error: vi.fn()
    }
}));

describe("Core LLM", () => {
    let llm: LLM;

    beforeEach(() => {
        vi.clearAllMocks();
        llm = new LLM({
            apiKey: "test-key",
            maxRetries: 2,
            retryDelayMs: 10
        });
    });

    it("should succeed and return text on first attempt", async () => {
        mockGenerateContent.mockResolvedValue({
            response: { text: () => "Hello world" }
        });

        const result = await llm.generate("say hi");
        expect(result).toBe("Hello world");
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("should retry on error and succeed on second attempt", async () => {
        mockGenerateContent
            .mockRejectedValueOnce(new Error("Network error"))
            .mockResolvedValueOnce({
                response: { text: () => "Success after retry" }
            });

        const result = await llm.generate("try again");
        expect(result).toBe("Success after retry");
        expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries", async () => {
        mockGenerateContent.mockRejectedValue(new Error("Fatal error"));

        await expect(llm.generate("fail me")).rejects.toThrow("Fatal error");
        expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("should not retry on auth errors (401/403)", async () => {
        const authError = new Error("Unauthorized") as Error & { status?: number };
        authError.status = 401;
        mockGenerateContent.mockRejectedValue(authError);

        await expect(llm.generate("no access")).rejects.toThrow("Unauthorized");
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("should handle error without status or message", async () => {
        mockGenerateContent.mockRejectedValue("Literal error string");
        await expect(llm.generate("raw error")).rejects.toBe("Literal error string");
        expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
});
