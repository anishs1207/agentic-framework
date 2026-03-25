import { vi, describe, it, expect, beforeEach, afterEach, Mock } from "vitest";
import { Scheduler, parseSchedule, CronJob } from "../src/core/scheduler.js";
import { globalBus } from "../src/core/events.js";

vi.mock("../src/core/events.js", () => ({
    globalBus: {
        emitSync: vi.fn(),
        emit: vi.fn()
    },
    AgentEvents: {
        CRON_FIRED: "cron:fired",
        CRON_ERROR: "cron:error"
    }
}));

vi.mock("../src/core/logger.js", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn()
    }
}));

describe("Core Scheduler", () => {
    describe("parseSchedule", () => {
        it("should parse 'every X units' format", () => {
            expect(parseSchedule("every 10 seconds")).toBe(10000);
            expect(parseSchedule("every 5m")).toBe(300000);
            expect(parseSchedule("every 1h")).toBe(3600000);
            expect(parseSchedule("every 2 days")).toBe(172800000);
        });

        it("should parse shorthand formats", () => {
            expect(parseSchedule("30s")).toBe(30000);
            expect(parseSchedule("daily")).toBe(86400000);
            expect(parseSchedule("hourly")).toBe(3600000);
        });

        it("should return null for invalid schedules", () => {
            expect(parseSchedule("whenever")).toBeNull();
        });
    });

    describe("Scheduler Class", () => {
        let scheduler: Scheduler;
        let mockHandler: Mock<(job: CronJob) => Promise<void>>;

        beforeEach(() => {
            vi.useFakeTimers();
            vi.clearAllMocks();
            mockHandler = vi.fn().mockResolvedValue(undefined);
            scheduler = new Scheduler(mockHandler);
        });

        afterEach(() => {
            scheduler.stopAll();
            vi.useRealTimers();
        });

        it("should add and execute a job on interval", async () => {
            const job = scheduler.addJob({
                name: "Test Job",
                schedule: "10s",
                intervalMs: 10000,
                type: "agent",
                input: "do something",
                enabled: true
            });

            expect(scheduler.listJobs()).toHaveLength(1);
            
            // Advance time
            await vi.advanceTimersByTimeAsync(10001);
            
            expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({ id: job.id }));
            expect(job.runCount).toBe(1);
            expect(globalBus.emitSync).toHaveBeenCalled();
        });

        it("should not execute disabled jobs", async () => {
            scheduler.addJob({
                name: "Disabled Job",
                schedule: "1s",
                intervalMs: 1000,
                type: "agent",
                input: "test",
                enabled: false
            });

            await vi.advanceTimersByTimeAsync(2000);
            expect(mockHandler).not.toHaveBeenCalled();
        });

        it("should enable and disable jobs", async () => {
            const job = scheduler.addJob({
                name: "Toggle Job",
                schedule: "1s",
                intervalMs: 1000,
                type: "agent",
                input: "test",
                enabled: false
            });

            scheduler.enableJob(job.id);
            await vi.advanceTimersByTimeAsync(1100);
            expect(mockHandler).toHaveBeenCalledTimes(1);

            scheduler.disableJob(job.id);
            await vi.advanceTimersByTimeAsync(2000);
            expect(mockHandler).toHaveBeenCalledTimes(1);
        });

        it("should run job manually with runNow", async () => {
            const job = scheduler.addJob({
                name: "Manual Job",
                schedule: "1h",
                intervalMs: 3600000,
                type: "agent",
                input: "test"
            });

            await scheduler.runNow(job.id);
            expect(mockHandler).toHaveBeenCalledTimes(1);
        });

        it("should handle handler errors", async () => {
            mockHandler.mockRejectedValue(new Error("Handler fail"));
            const job = scheduler.addJob({
                name: "Fail Job",
                schedule: "1s",
                intervalMs: 1000,
                type: "agent",
                input: "test"
            });

            await vi.advanceTimersByTimeAsync(1100);
            expect(job.lastError).toBe("Handler fail");
            expect(globalBus.emitSync).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ error: "Handler fail" }));
        });

        it("should remove jobs", () => {
            const job = scheduler.addJob({
                name: "Remove Me", schedule: "1s", intervalMs: 1000, type: "agent", input: "x"
            });
            expect(scheduler.removeJob(job.id)).toBe(true);
            expect(scheduler.listJobs()).toHaveLength(0);
        });
    });
});
