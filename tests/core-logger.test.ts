import { vi, describe, it, expect, beforeEach } from "vitest";
import { Logger } from "../src/core/logger.js";

describe("Core Logger", () => {
    let logger: Logger;

    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(process.stdout, "write").mockImplementation(() => true as unknown as boolean);
        logger = new Logger(true);
    });

    it("should log headers and subheaders", () => {
        logger.header("Main Title");
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Main Title"));

        logger.subHeader("Sub Title");
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Sub Title"));
    });

    it("should log thoughts only when verbose", () => {
        logger.thought(1, "Deep thinking");
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Thought"));

        const quietLogger = new Logger(false);
        vi.clearAllMocks();
        quietLogger.thought(1, "Quiet thinking");
        expect(console.log).not.toHaveBeenCalled();
    });

    it("should log actions and observations", () => {
        logger.action("search", "query");
        // It uses two arguments in source
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Action"), expect.stringContaining("search(query)"));

        logger.observation("found something");
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Observation"), expect.stringContaining("found something"));
    });

    it("should log final answers", () => {
        logger.finalAnswer("Result is 42");
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Final Answer"));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Result is 42"));
    });

    it("should log errors, warnings and info", () => {
        logger.error("Boom");
        // Concatenated in source: c(...) + c(...)
        expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/Error.*Boom/s));

        logger.warn("Careful");
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Careful"));

        logger.info("Just so you know");
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Just so you know"));
    });

    it("should show thinking indicator based on verbose mode", () => {
        // Clear mocks to be sure
        vi.clearAllMocks();
        logger.thinking();
        expect(process.stdout.write).not.toHaveBeenCalled();

        const quietLogger = new Logger(false);
        quietLogger.thinking();
        expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining("Thinking"));
    });

    it("should log tool list and memory count", () => {
        logger.toolList(["tool1", "tool2"]);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("tool1"));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("tool2"));

        logger.memory(5);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Memory"));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("5"));
    });

    it("should log retries and separators", () => {
        logger.retry(1, 3, "Auth error");
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Retry 1/3"));

        logger.separator();
        expect(console.log).toHaveBeenCalled();
    });
});
