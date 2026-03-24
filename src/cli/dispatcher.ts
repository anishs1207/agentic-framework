import * as readline from "readline";
import { theme, printHelp, printSection, printToolCard, printStats, createSpinner, type SessionStats } from "./ui.js";
import { isTelegramActive, stopTelegramBridge } from "./telegram.js";
import { stopWhatsAppBridge, isWhatsAppActive } from "./whatsapp.js";
import { renderAnswer, estimateTokens, estimateCost } from "./renderer.js";
import { 
  ToolRegistry, 
  ConversationWindowMemory, 
  Agent, 
  AgentPool, 
  Scheduler, 
  ExecutionTracer
} from "../core/index.js";

export interface CommandContext {
  apiKey: string;
  currentModel: string;
  currentTemperature: number;
  verbose: boolean;
  persona: string | null;
  traceMode: boolean;
  stats: SessionStats;
  memory: ConversationWindowMemory;
  registry: ToolRegistry;
  agent: Agent;
  pool: AgentPool;
  scheduler: Scheduler;
  aliases: Record<string, string>;
  rl: readline.Interface;
  onUpdateAgent: (newAgent: Agent) => void;
  onUpdateModel: (newModel: string) => void;
  onUpdateTemperature: (newTemp: number) => void;
  onUpdateVerbose: (newVerbose: boolean) => void;
  onUpdatePersona: (newPersona: string | null) => void;
  onUpdateTraceMode: (newTraceMode: boolean) => void;
}

export async function handleCommand(userInput: string, ctx: CommandContext): Promise<boolean> {
  const trimmed = userInput.trim();
  if (!trimmed) return true;

  if (trimmed.startsWith("/")) {
    const rawParts = trimmed.split(/\s+/);
    const rawCmd = rawParts[0].toLowerCase();

    // ── Resolve alias first ─────────────────────────────────────────────
    const resolvedLine = ctx.aliases[rawCmd]
      ? ctx.aliases[rawCmd] + (rawParts.length > 1 ? " " + rawParts.slice(1).join(" ") : "")
      : trimmed;
    const parts = resolvedLine.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // ── /exit /quit ──────────────────────────────────────────────────────
    if (cmd === "/exit" || cmd === "/quit") {
      ctx.scheduler.stopAll();
      if (isTelegramActive()) stopTelegramBridge();
      if (isWhatsAppActive()) await stopWhatsAppBridge();
      console.log("\n" + theme.accent.bold("  👋 Goodbye! Happy building.\n"));
      ctx.rl.close();
      return false; // Signal to stop the loop
    }

    // ── /help ────────────────────────────────────────────────────────────
    if (cmd === "/help") {
      printHelp();
      return true;
    }

    // ── /tools ───────────────────────────────────────────────────────────
    if (cmd === "/tools") {
      printSection("Tool Details");
      ctx.registry.listNames().forEach((name) => {
        const tool = ctx.registry.get(name)!;
        printToolCard(tool);
      });
      return true;
    }

    // ── /memory ──────────────────────────────────────────────────────────
    if (cmd === "/memory") {
      const messages = ctx.memory.getMessages();
      if (messages.length === 0) {
        console.log("\n" + theme.muted("  🧠 Memory is empty.\n"));
      } else {
        printSection(`Memory (${messages.length} messages)`);
        messages.forEach((m, i) => {
          const role =
            m.role === "user" ? theme.secondary("Human") :
              m.role === "assistant" ? theme.primary("AI") :
                theme.accent("Tool");
          const snippet = m.content.length > 80 ? m.content.slice(0, 80) + "…" : m.content;
          console.log("  " + theme.muted(`${i + 1}.`) + " [" + role + "] " + theme.muted(snippet));
        });
        console.log();
      }
      return true;
    }

    // ── /clear ───────────────────────────────────────────────────────────
    if (cmd === "/clear") {
      ctx.memory.clear();
      console.log("\n" + theme.success("  ✔ Memory cleared.\n"));
      return true;
    }

    // ── /verbose ─────────────────────────────────────────────────────────
    if (cmd === "/verbose") {
      const newVerbose = !ctx.verbose;
      ctx.onUpdateVerbose(newVerbose);
      console.log(
        "\n" + (newVerbose
          ? theme.success("  ✔ Verbose ON — agent internals will be shown.\n")
          : theme.warn("  Verbose OFF — only final answers shown.\n"))
      );
      return true;
    }

    // ── /model <name> ────────────────────────────────────────────────────
    if (cmd === "/model") {
      const newModel = args[0];
      if (!newModel) {
        console.log(
          "\n  " + theme.muted("Current model: ") + theme.secondary(ctx.currentModel) +
          "\n  " + theme.muted("Example: /model gemini-2.0-flash-exp\n")
        );
        return true;
      }
      ctx.onUpdateModel(newModel);
      console.log("\n" + theme.success(`  ✔ Model switched to: ${newModel}\n`));
      return true;
    }

    // ── /temperature <n> ─────────────────────────────────────────────────
    if (cmd === "/temperature" || cmd === "/temp") {
      const val = parseFloat(args[0]);
      if (isNaN(val) || val < 0 || val > 2) {
        console.log("\n" + theme.warn("  ⚠  Provide a number 0–2.  Example: /temperature 0.3\n"));
        return true;
      }
      ctx.onUpdateTemperature(val);
      console.log("\n" + theme.success(`  ✔ Temperature set to: ${val}\n`));
      return true;
    }

    // ── /stats ───────────────────────────────────────────────────────────
    if (cmd === "/stats") {
      printStats(ctx.stats);
      return true;
    }

    // ── unknown command ───────────────────────────────────────────────────
    console.log(
      "\n" + theme.error(`  ✖ Unknown command: ${cmd}`) +
      "\n" + theme.muted("  Type /help to see all commands.\n")
    );
    return true;
  }

  // ── Normal agent query ────────────────────────────────────────────────────
  console.log();
  const spinner = ctx.verbose ? null : createSpinner("Thinking…").start();
  const startTime = Date.now();

  let input = trimmed;
  if (ctx.persona) input = `[System: ${ctx.persona}]\n\n${trimmed}`;

  const tracer = ctx.traceMode
    ? new ExecutionTracer({ input: trimmed, model: ctx.currentModel, temperature: ctx.currentTemperature, maxIterations: 8 })
    : null;

  try {
    const result = await ctx.agent.run(input);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (spinner) spinner.stop();

    if (!ctx.verbose) {
      console.log("\n" + theme.primary.bold("  🤖 Answer:"));
      console.log(renderAnswer(result.output));
    }

    const inTok = estimateTokens(input);
    const outTok = estimateTokens(result.output);
    const cost = estimateCost(inTok, outTok);

    console.log(
      "\n" + theme.muted(
        `  ⏱  ${duration}s | ${result.iterations} iter | tools: ${
          result.toolsUsed.length > 0 ? result.toolsUsed.join(", ") : "none"
        } | ~${inTok + outTok} tokens | est. ${cost}`
      ) + "\n"
    );

    if (tracer) {
      tracer.finish(result.output, true);
      const tracePath = tracer.save();
      console.log(theme.muted(`  💾 Trace saved: ${tracePath}\n`));
    }

    ctx.stats.totalQueries++;
    ctx.stats.totalIterations += result.iterations;
    ctx.stats.totalDurationMs += Date.now() - startTime;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (spinner) spinner.fail();
    if (tracer) { tracer.finish("", false, errorMsg); tracer.save(); }
    ctx.stats.errors++;
    console.log("\n" + theme.error(`  ✖ ${errorMsg}\n`));
  }

  return true;
}
