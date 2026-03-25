import { vi, describe, it, expect, beforeEach } from "vitest";
import { startTelegramBridge, stopTelegramBridge, isTelegramActive } from "../src/cli/telegram.js";
import { startWhatsAppBridge, stopWhatsAppBridge, isWhatsAppActive } from "../src/cli/whatsapp.js";
import { Agent } from "../src/core/index.js";

// Mock external libraries
const mockTelegramBot = {
    on: vi.fn(),
    sendMessage: vi.fn(),
    stopPolling: vi.fn(),
    sendChatAction: vi.fn(),
};

vi.mock("node-telegram-bot-api", () => {
    return {
        default: class MockTelegram {
            constructor() { return mockTelegramBot; }
        }
    };
});

const mockWhatsAppClient = {
    on: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined),
    react: vi.fn(),
    reply: vi.fn(),
};

vi.mock("whatsapp-web.js", () => {
    return {
        Client: class MockClient {
            constructor() { return mockWhatsAppClient; }
        },
        LocalAuth: class {},
    };
});

vi.mock("qrcode-terminal", () => ({
    generate: vi.fn()
}));

const mockAgent = { 
  run: vi.fn().mockResolvedValue({ output: "AI reply", toolsUsed: ["web_search"] }) 
};

describe("CLI Bridges", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        
        // Reset state
        stopTelegramBridge();
        await stopWhatsAppBridge();
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

        it("should handle incoming telegram messages", async () => {
            startTelegramBridge(mockAgent as unknown as Agent);
            
            // Find the message handler
            const messageHandler = mockTelegramBot.on.mock.calls.find(call => call[0] === "message")?.[1];
            expect(messageHandler).toBeDefined();

            // Simulate /start
            await messageHandler({ chat: { id: 123 }, text: "/start" });
            expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining("Hello"));

            // Simulate normal message
            await messageHandler({ chat: { id: 123 }, text: "How's the weather?" });
            expect(mockAgent.run).toHaveBeenCalledWith("How's the weather?");
            expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining("AI reply"), expect.anything());
        });

        it("should handle telegram agent errors", async () => {
          mockAgent.run.mockRejectedValueOnce(new Error("Down"));
          startTelegramBridge(mockAgent as unknown as Agent);
          const messageHandler = mockTelegramBot.on.mock.calls.find(call => call[0] === "message")?.[1];
          await messageHandler({ chat: { id: 123 }, text: "error" });
          expect(mockTelegramBot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining("Error: Down"));
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

        it("should handle incoming whatsapp messages", async () => {
          await startWhatsAppBridge(mockAgent as unknown as Agent);
          
          const messageHandler = mockWhatsAppClient.on.mock.calls.find(call => call[0] === "message")?.[1];
          expect(messageHandler).toBeDefined();

          const mockMsg = {
            body: "Hi",
            getChat: vi.fn().mockResolvedValue({ isGroup: false }),
            react: vi.fn(),
            reply: vi.fn(),
          };

          await messageHandler(mockMsg);
          expect(mockAgent.run).toHaveBeenCalledWith("Hi");
          expect(mockMsg.reply).toHaveBeenCalledWith(expect.stringContaining("AI reply"));
        });

        it("should ignore whatsapp group messages", async () => {
          await startWhatsAppBridge(mockAgent as unknown as Agent);
          const messageHandler = mockWhatsAppClient.on.mock.calls.find(call => call[0] === "message")?.[1];
          const mockMsg = {
            body: "Group msg",
            getChat: vi.fn().mockResolvedValue({ isGroup: true }),
          };
          await messageHandler(mockMsg);
          expect(mockAgent.run).not.toHaveBeenCalled();
        });
    });
});

