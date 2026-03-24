import { vi, describe, it, expect, beforeEach } from "vitest";
import { startTelegramBridge, stopTelegramBridge, isTelegramActive } from "../src/cli/telegram.js";
import { startWhatsAppBridge, stopWhatsAppBridge, isWhatsAppActive } from "../src/cli/whatsapp.js";
import { Agent } from "../src/core/index.js";

// Mock external libraries
vi.mock("node-telegram-bot-api", () => {
    return {
        default: class {
            on = vi.fn();
            sendMessage = vi.fn();
            stopPolling = vi.fn();
        }
    };
});

vi.mock("whatsapp-web.js", () => {
    return {
        Client: class {
            on = vi.fn();
            initialize = vi.fn().mockResolvedValue(undefined);
            sendMessage = vi.fn();
            destroy = vi.fn().mockResolvedValue(undefined);
        },
        LocalAuth: class {},
    };
});

vi.mock("qrcode-terminal", () => ({
    generate: vi.fn()
}));

const mockAgent = { run: vi.fn() };

describe("CLI Bridges", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    describe("Telegram Bridge", () => {
        beforeEach(() => {
            process.env.TELEGRAM_BOT_TOKEN = "fake-token";
        });

        it("should start and stop telegram bridge", () => {
            expect(isTelegramActive()).toBe(false);
            startTelegramBridge(mockAgent as unknown as Agent);
            expect(isTelegramActive()).toBe(true);
            stopTelegramBridge();
            expect(isTelegramActive()).toBe(false);
        });

        it("should handle missing token", () => {
            process.env.TELEGRAM_BOT_TOKEN = "";
            startTelegramBridge(mockAgent as unknown as Agent);
            expect(isTelegramActive()).toBe(false);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining("TELEGRAM_BOT_TOKEN not set"));
        });
    });

    describe("WhatsApp Bridge", () => {
        it("should start and stop whatsapp bridge", async () => {
            expect(isWhatsAppActive()).toBe(false);
            await startWhatsAppBridge(mockAgent as unknown as Agent);
            expect(isWhatsAppActive()).toBe(true);
            await stopWhatsAppBridge();
            expect(isWhatsAppActive()).toBe(false);
        });
    });
});
