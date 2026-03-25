import { vi, describe, it, expect, beforeEach } from "vitest";
import { EventBus, globalBus } from "../src/core/events.js";

describe("EventBus", () => {
    let bus: EventBus;

    beforeEach(() => {
        bus = new EventBus(5); // Small history for testing
    });

    it("should subscribe and emit events", async () => {
        const handler = vi.fn();
        bus.on("test", handler);
        
        await bus.emit("test", { data: 123 }, "unit-test");
        
        expect(handler).toHaveBeenCalledWith({ data: 123 });
        expect(bus.getHistory()).toHaveLength(1);
        expect(bus.getHistory()[0].source).toBe("unit-test");
    });

    it("should unsubscribe correctly", async () => {
        const handler = vi.fn();
        const unsub = bus.on("test", handler);
        unsub();
        
        await bus.emit("test", {});
        expect(handler).not.toHaveBeenCalled();
    });

    it("should handle 'once' subscriptions", async () => {
        const handler = vi.fn();
        bus.once("test", handler);
        
        await bus.emit("test", { msg: "first" });
        await bus.emit("test", { msg: "second" });
        
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith({ msg: "first" });
    });

    it("should catch all events with wildcard", async () => {
        const handler = vi.fn();
        bus.on("*", handler);
        
        await bus.emit("event1", { val: 1 });
        await bus.emit("event2", { val: 2 });
        
        expect(handler).toHaveBeenCalledTimes(2);
    });

    it("should emit events synchronously", () => {
        const handler = vi.fn();
        bus.on("sync", handler);
        
        bus.emitSync("sync", "hello");
        expect(handler).toHaveBeenCalledWith("hello");
    });

    it("should limit history size", () => {
        for (let i = 0; i < 10; i++) {
            bus.emitSync("type", i);
        }
        expect(bus.getHistory(100)).toHaveLength(5); // maxHistory was 5
    });

    it("should reset listeners and history", () => {
        bus.on("test", () => {});
        bus.emitSync("test", {});
        bus.reset();
        
        expect(bus.getHistory()).toHaveLength(0);
        // How to check listeners? emit and check if anyone responds.
        const handler = vi.fn();
        bus.on("test", handler);
        bus.reset();
        bus.emitSync("test", {});
        expect(handler).not.toHaveBeenCalled();
    });

    it("should have a global bus singleton", () => {
        expect(globalBus).toBeInstanceOf(EventBus);
    });

    it("should handle error in off for non-existent type", () => {
        // Just for branch coverage
        bus.off("non-existent", () => {});
    });
});
