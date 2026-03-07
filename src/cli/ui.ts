import figlet from "figlet";
import boxen from "boxen";
import ora from "ora";
import chalk from "chalk";

// ──────────────────────────────────────────────────────────────────────────────
// Color palette
// ──────────────────────────────────────────────────────────────────────────────
export const theme = {
  primary:   chalk.hex("#7C3AED"),   // violet
  secondary: chalk.hex("#06B6D4"),   // cyan
  accent:    chalk.hex("#F59E0B"),   // amber
  success:   chalk.hex("#10B981"),   // emerald
  error:     chalk.hex("#EF4444"),   // red
  warn:      chalk.hex("#F97316"),   // orange
  muted:     chalk.hex("#6B7280"),   // gray
  white:     chalk.white,
  bold:      chalk.bold,
};

// ──────────────────────────────────────────────────────────────────────────────
// Banner
// ──────────────────────────────────────────────────────────────────────────────
export function printBanner() {
  const title = figlet.textSync("AgenticCLI", {
    font: "Small",
    horizontalLayout: "fitted",
  });

  // Paint the title with a manual gradient (violet → cyan)
  const lines = title.split("\n");
  const gradientSteps = ["#7C3AED", "#8B5CF6", "#6366F1", "#4F46E5", "#06B6D4"];
  const coloredLines = lines.map((line, i) => {
    const hex = gradientSteps[Math.min(i, gradientSteps.length - 1)];
    return chalk.bold.hex(hex)(line);
  });

  const banner = boxen(
    coloredLines.join("\n") +
    "\n" +
    theme.muted("  v2.0  •  Powered by Gemini  •  ReAct • Tools • Memory") +
    "\n" +
    theme.muted("  WhatsApp & Telegram bridges  •  Workflow builder"),
    {
      padding: 1,
      margin: { top: 1, bottom: 0, left: 1, right: 1 },
      borderStyle: "round",
      borderColor: "magenta",
    }
  );

  console.log(banner);
}

// ──────────────────────────────────────────────────────────────────────────────
// Section header
// ──────────────────────────────────────────────────────────────────────────────
export function printSection(title: string) {
  console.log(
    "\n" +
    theme.primary.bold(`  ▸ ${title}`) +
    "\n" +
    theme.muted("  " + "─".repeat(50))
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Help
// ──────────────────────────────────────────────────────────────────────────────
export function printHelp() {
  const commands = [
    ["/chat",            "Switch to direct chat mode (default)"],
    ["/tools",           "List all available tools with details"],
    ["/tool-add",        "Interactively create a new custom tool"],
    ["/workflow",        "Build & run a multi-step agentic workflow"],
    ["/workflow-list",   "Show saved workflows"],
    ["/workflow-run <n>","Run a saved workflow by name"],
    ["/memory",          "Show current conversation memory"],
    ["/clear",           "Clear conversation memory"],
    ["/verbose",         "Toggle verbose mode (show/hide agent internals)"],
    ["/model <name>",    "Switch Gemini model (e.g. gemini-2.0-flash-exp)"],
    ["/temperature <n>", "Set LLM temperature (0–1)"],
    ["/persona <text>",  "Set a custom system persona for the agent"],
    ["/stats",           "Session statistics dashboard"],
    ["/export [file]",   "Export conversation to file"],
    ["/whatsapp",        "Start WhatsApp bridge (scan QR to connect)"],
    ["/telegram",        "Start Telegram bot bridge"],
    ["/help",            "Show this help"],
    ["/exit",            "Exit"],
  ];

  printSection("Commands");
  for (const [cmd, desc] of commands) {
    console.log(
      "  " +
      theme.accent.bold(cmd.padEnd(24)) +
      theme.muted(desc)
    );
  }
  console.log();
}

// ──────────────────────────────────────────────────────────────────────────────
// Spinner factory
// ──────────────────────────────────────────────────────────────────────────────
export function createSpinner(text: string) {
  return ora({
    text: theme.muted(text),
    spinner: "dots2",
    color: "magenta",
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Info box
// ──────────────────────────────────────────────────────────────────────────────
export function infoBox(title: string, content: string, color: "green" | "cyan" | "yellow" | "red" = "cyan") {
  console.log(
    boxen(content, {
      title,
      titleAlignment: "left",
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      margin: { top: 0, bottom: 0, left: 2, right: 0 },
      borderStyle: "round",
      borderColor: color,
    })
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Compact tool card
// ──────────────────────────────────────────────────────────────────────────────
export function printToolCard(tool: { name: string; description: string; inputDescription: string; examples: string[] }) {
  const content =
    theme.muted("Description: ") + tool.description + "\n" +
    theme.muted("Input:       ") + tool.inputDescription +
    (tool.examples.length ? "\n" + theme.muted("Examples:    ") + tool.examples.slice(0, 2).join(" | ") : "");

  console.log(
    boxen(content, {
      title: theme.primary.bold("⚙  " + tool.name),
      titleAlignment: "left",
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      margin: { top: 0, bottom: 0, left: 2, right: 0 },
      borderStyle: "single",
      borderColor: "magenta",
    })
  );
  console.log();
}

// ──────────────────────────────────────────────────────────────────────────────
// Stats dashboard
// ──────────────────────────────────────────────────────────────────────────────
export interface SessionStats {
  startTime: Date;
  totalQueries: number;
  totalIterations: number;
  totalToolCalls: number;
  toolCallCounts: Record<string, number>;
  totalDurationMs: number;
  errors: number;
  model: string;
  temperature: number;
}

export function printStats(stats: SessionStats) {
  const uptimeSec = ((Date.now() - stats.startTime.getTime()) / 1000).toFixed(0);
  const avgDuration =
    stats.totalQueries > 0
      ? (stats.totalDurationMs / stats.totalQueries / 1000).toFixed(1)
      : "0.0";

  let content =
    theme.muted("Model:        ") + theme.secondary(stats.model) + "\n" +
    theme.muted("Temperature:  ") + theme.secondary(String(stats.temperature)) + "\n" +
    theme.muted("Uptime:       ") + theme.success(uptimeSec + "s") + "\n" +
    theme.muted("Queries:      ") + theme.success(String(stats.totalQueries)) + "\n" +
    theme.muted("Iterations:   ") + theme.success(String(stats.totalIterations)) + "\n" +
    theme.muted("Tool calls:   ") + theme.success(String(stats.totalToolCalls)) + "\n" +
    theme.muted("Avg resp:     ") + theme.success(avgDuration + "s") + "\n" +
    theme.muted("Errors:       ") + (stats.errors > 0 ? theme.error(String(stats.errors)) : theme.success("0"));

  if (Object.keys(stats.toolCallCounts).length > 0) {
    content += "\n\n" + theme.accent.bold("Tool Usage:");
    const sorted = Object.entries(stats.toolCallCounts).sort(([, a], [, b]) => b - a);
    for (const [tool, count] of sorted) {
      const bar = "█".repeat(Math.min(count * 3, 24));
      content += "\n" + theme.muted(tool.padEnd(22)) + theme.primary(bar) + " " + theme.accent(String(count));
    }
  }

  console.log(
    "\n" + boxen(content, {
      title: theme.primary.bold("📊 Session Stats"),
      titleAlignment: "left",
      padding: 1,
      margin: { top: 0, bottom: 1, left: 2, right: 0 },
      borderStyle: "round",
      borderColor: "magenta",
    })
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Workflow card
// ──────────────────────────────────────────────────────────────────────────────
export function printWorkflowCard(name: string, steps: string[], description?: string) {
  let content = (description ? theme.muted(description) + "\n\n" : "") +
    theme.accent.bold("Steps:\n") +
    steps.map((s, i) => `  ${theme.primary.bold(`${i + 1}.`)} ${s}`).join("\n");

  console.log(
    boxen(content, {
      title: theme.secondary.bold("⚡ " + name),
      titleAlignment: "left",
      padding: 1,
      margin: { top: 0, bottom: 1, left: 2, right: 0 },
      borderStyle: "round",
      borderColor: "cyan",
    })
  );
}
