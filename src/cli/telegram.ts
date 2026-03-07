/**
 * Telegram Bridge
 *
 * Usage: /telegram
 *
 * Requires TELEGRAM_BOT_TOKEN in .env
 *
 * The bot will respond to every text message sent to it by routing the
 * message through the Agentic framework's Agent.
 */
import TelegramBot from "node-telegram-bot-api";
import { theme, createSpinner } from "./ui.js";
import type { Agent } from "../core/agent.js";

let activeTelegramBot: TelegramBot | null = null;

export async function startTelegramBridge(agent: Agent): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log(
      "\n" + theme.error.bold("  ✖ TELEGRAM_BOT_TOKEN not set in .env") +
      "\n" + theme.muted("  Get one from @BotFather on Telegram, then add:") +
      "\n" + theme.accent("  TELEGRAM_BOT_TOKEN=your_token_here") +
      "\n" + theme.muted("  to your .env file.\n")
    );
    return;
  }

  if (activeTelegramBot) {
    console.log(theme.warn("  ⚠  Telegram bot is already running.\n"));
    return;
  }

  const spinner = createSpinner("Connecting to Telegram…").start();

  try {
    const bot = new TelegramBot(token, { polling: true });
    activeTelegramBot = bot;
    spinner.succeed(theme.success("  ✔ Telegram bot is live!"));

    console.log(
      "\n" +
      theme.secondary.bold("  Telegram Bridge Active") + "\n" +
      theme.muted("  Messages sent to your bot will be answered by the AI.") + "\n" +
      theme.muted("  Use /stop-telegram in the CLI to disconnect.\n")
    );

    // Handle text messages
    bot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;

      if (!text) return;

      // Handle /start command
      if (text === "/start") {
        await bot.sendMessage(
          chatId,
          "👋 Hello! I'm an AI agent powered by Gemini.\n\nSend me any question and I'll answer using tools like weather, calculator, Wikipedia, and more!"
        );
        return;
      }

      // Show typing indicator while processing
      await bot.sendChatAction(chatId, "typing");

      try {
        const result = await agent.run(text);
        const reply =
          result.output +
          (result.toolsUsed.length > 0
            ? `\n\n_🔧 Tools used: ${result.toolsUsed.join(", ")}_`
            : "");

        await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
      } catch (err: any) {
        await bot.sendMessage(chatId, `❌ Error: ${err.message}`);
      }
    });

    bot.on("polling_error", (err) => {
      console.log(theme.error(`\n  Telegram polling error: ${err.message}\n`));
    });

  } catch (err: any) {
    spinner.fail(theme.error(`  ✖ Failed to start Telegram bot: ${err.message}`));
  }
}

export function stopTelegramBridge() {
  if (!activeTelegramBot) {
    console.log(theme.warn("  ⚠  No active Telegram bot.\n"));
    return;
  }
  activeTelegramBot.stopPolling();
  activeTelegramBot = null;
  console.log(theme.success("  ✔ Telegram bot stopped.\n"));
}

export function isTelegramActive(): boolean {
  return activeTelegramBot !== null;
}
