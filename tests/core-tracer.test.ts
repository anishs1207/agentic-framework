import { vi, describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import { ExecutionTracer } from "../src/core/tracer.js";

vi.mock("fs");

describe("ExecutionTracer", () => {
    let tracer: ExecutionTracer;

    beforeEach(() => {
        vi.clearAllMocks();
        tracer = new ExecutionTracer({
            input: "test input",
            model: "gpt-4",
            temperature: 0.5,
            maxIterations: 10
        });
    });

    it("should capture steps correctly", () => {
        tracer.beginStep(1, 400); // 100 tokens approx
        tracer.recordThought("reasoning...");
        tracer.recordAction("search", "google");
        tracer.recordObservation("found 1 result");
        tracer.endStep();

        const trace = tracer.getTrace();
        expect(trace.steps).toHaveLength(1);
        expect(trace.steps[0].iteration).toBe(1);
        expect(trace.steps[0].approxPromptTokens).toBe(100);
        expect(trace.steps[0].action).toBe("search");
        expect(trace.steps[0].observation).toBe("found 1 result");
    });

    it("should record final answers and tools used", () => {
        tracer.beginStep(1);
        tracer.recordFinalAnswer("42");
        tracer.endStep();
        tracer.recordToolUsed("calculator");
        tracer.finish("Answer: 42", true);

        const trace = tracer.getTrace();
        expect(trace.steps[0].isFinalAnswer).toBe(true);
        expect(trace.toolsUsed).toContain("calculator");
        expect(trace.succeeded).toBe(true);
        expect(trace.finalOutput).toBe("Answer: 42");
        expect(trace.finishedAt).toBeDefined();
    });

    it("should record errors", () => {
        tracer.beginStep(1);
        tracer.recordError("Network timeout");
        tracer.endStep();
        tracer.finish("failed", false, "timeout");

        const trace = tracer.getTrace();
        expect(trace.steps[0].error).toBe("Network timeout");
        expect(trace.succeeded).toBe(false);
        expect(trace.error).toBe("timeout");
    });

    it("should save the trace to disk", () => {
        const file = tracer.save();
        expect(fs.writeFileSync).toHaveBeenCalled();
        expect(file).toContain(".json");
    });

    it("should generate a summary table", () => {
        tracer.beginStep(1);
        tracer.recordThought("thought 1");
        tracer.endStep();
        
        tracer.beginStep(2);
        tracer.recordAction("act", "input");
        tracer.recordObservation("obs");
        tracer.endStep();

        tracer.beginStep(3);
        tracer.recordFinalAnswer("done");
        tracer.endStep();

        const summary = tracer.summary();
        expect(summary).toContain("Step 1");
        expect(summary).toContain("Step 2");
        expect(summary).toContain("Step 3");
        expect(summary).toContain("Final");
    });
});
