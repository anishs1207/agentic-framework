/**
 * WhatsApp Bridge
 *
 * Usage: /whatsapp
 *
 * Uses whatsapp-web.js to connect via a QR code scan.
 * All incoming DMs are answered by the AI Agent.
 *
 * Note: whatsapp-web.js requires Google Chrome / Chromium to be installed
 * and uses a local Puppeteer-managed browser session.
 */
import qrcode from "qrcode-terminal";
import { theme, createSpinner } from "./ui.js";
import type { Agent } from "../core/agent.js";

let activeClient: any = null;

export async function startWhatsAppBridge(agent: Agent): Promise<void> {
  if (activeClient) {
    console.log(theme.warn("  ⚠  WhatsApp is already connected.\n"));
    return;
  }

  console.log(
    "\n" + theme.secondary.bold("  WhatsApp Bridge") + "\n" +
    theme.muted("  Loading whatsapp-web.js (this may take a moment)…\n")
  );

  let Client: any;
  let LocalAuth: any;

  try {
    // Dynamic import to avoid startup cost when WhatsApp isn't used
    const wwjs = await import("whatsapp-web.js") as any;
    Client = wwjs.Client || wwjs.default?.Client;
    LocalAuth = wwjs.LocalAuth || wwjs.default?.LocalAuth;
  } catch {
    console.log(
      theme.error("  ✖ whatsapp-web.js not available.") + "\n" +
      theme.muted("  Run: npm install whatsapp-web.js\n")
    );
    return;
  }

  const spinner = createSpinner("Initialising WhatsApp client…").start();

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: "agentic-framework" }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  activeClient = client;

  client.on("qr", (qr: string) => {
    spinner.stop();
    console.log(
      "\n" + theme.accent.bold("  Scan this QR code with WhatsApp to connect:") + "\n"
    );
    qrcode.generate(qr, { small: true });
    console.log(
      "\n" + theme.muted("  Open WhatsApp → Settings → Linked Devices → Link a Device\n")
    );
  });

  client.on("ready", () => {
    console.log(
      theme.success.bold("  ✔ WhatsApp connected!") + "\n" +
      theme.muted("  Messages sent to your WhatsApp will be answered by the AI.") + "\n" +
      theme.muted("  Use /stop-whatsapp in the CLI to disconnect.\n")
    );
  });

  client.on("auth_failure", (msg: string) => {
    console.log(theme.error(`  ✖ WhatsApp auth failed: ${msg}\n`));
    activeClient = null;
  });

  client.on("disconnected", (reason: string) => {
    console.log(theme.warn(`  ⚠  WhatsApp disconnected: ${reason}\n`));
    activeClient = null;
  });

  client.on("message", async (msg: any) => {
    // Only handle direct messages (not group chats unless you want to)
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const text = msg.body?.trim();
    if (!text) return;

    try {
      // Show a "thinking" reaction first (optional)
      await msg.react("🤔");

      const result = await agent.run(text);
      const reply =
        result.output +
        (result.toolsUsed.length > 0
          ? `\n\n🔧 _Tools used: ${result.toolsUsed.join(", ")}_`
          : "");

      await msg.reply(reply);
      await msg.react("✅");
    } catch (err: any) {
      await msg.reply(`❌ Error: ${err.message}`);
      await msg.react("❌");
    }
  });

  try {
    spinner.text = "Starting WhatsApp session (opens Chromium)…";
    await client.initialize();
  } catch (err: any) {
    spinner.fail(theme.error(`  ✖ WhatsApp init failed: ${err.message}`));
    activeClient = null;
  }
}

export async function stopWhatsAppBridge(): Promise<void> {
  if (!activeClient) {
    console.log(theme.warn("  ⚠  No active WhatsApp session.\n"));
    return;
  }
  try {
    await activeClient.destroy();
  } catch { /* ignore */ }
  activeClient = null;
  console.log(theme.success("  ✔ WhatsApp disconnected.\n"));
}

export function isWhatsAppActive(): boolean {
  return activeClient !== null;
}
