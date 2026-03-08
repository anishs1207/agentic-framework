// ──────────────────────────────────────────────────────────────────────────────
// Rich Table & UI Renderer
// Provides: printTable, printKeyValue, printTimeline, printDiff, countTokens
// ──────────────────────────────────────────────────────────────────────────────

import chalk from "chalk";
import boxen from "boxen";
import { theme } from "./ui.js";

// ─── Token estimator ──────────────────────────────────────────────────────────

/** Rough estimate: 1 token ≈ 4 chars (OpenAI/Gemini average) */
export function estimateTokens(text: string): number {
  return Math.round(text.length / 4);
}

/** Rough cost estimate in USD for Gemini Flash (as of 2025 pricing) */
export function estimateCost(inputTokens: number, outputTokens: number): string {
  // Gemini 2.5 Flash: ~$0.075 / 1M input, ~$0.30 / 1M output
  const cost = (inputTokens * 0.075 + outputTokens * 0.30) / 1_000_000;
  if (cost < 0.0001) return "< $0.0001";
  return `$${cost.toFixed(5)}`;
}

// ─── Table renderer ───────────────────────────────────────────────────────────

export interface TableColumn {
  key: string;
  header: string;
  width?: number;
  align?: "left" | "right" | "center";
  color?: (val: string) => string;
}

export function printTable<T extends Record<string, any>>(
  rows: T[],
  columns: TableColumn[],
  title?: string
): void {
  if (rows.length === 0) {
    console.log(theme.muted("  (empty table)"));
    return;
  }

  // Compute column widths
  const widths = columns.map((col) => {
    const dataMax = Math.max(...rows.map((r) => String(r[col.key] ?? "").length));
    return col.width ?? Math.max(col.header.length, dataMax, 4);
  });

  const sep = "  " + widths.map((w) => "─".repeat(w + 2)).join("┼") ;
  const header =
    "  " +
    columns
      .map((col, i) => " " + theme.accent.bold(col.header.padEnd(widths[i])) + " ")
      .join(theme.muted("│"));

  if (title) {
    console.log("\n" + theme.primary.bold(`  ▸ ${title}`));
  }
  console.log(theme.muted(sep.replace(/─/g, "─").replace(/┼/g, "┬")));
  console.log(header);
  console.log(theme.muted(sep));

  for (const row of rows) {
    const line =
      "  " +
      columns
        .map((col, i) => {
          let val = String(row[col.key] ?? "");
          if (val.length > widths[i]) val = val.slice(0, widths[i] - 1) + "…";
          const padded = col.align === "right"
            ? val.padStart(widths[i])
            : val.padEnd(widths[i]);
          const colored = col.color ? col.color(padded) : theme.white(padded);
          return " " + colored + " ";
        })
        .join(theme.muted("│"));
    console.log(line);
  }
  console.log(theme.muted(sep.replace(/┬/g, "┴")));
  console.log();
}

// ─── Key-value card ───────────────────────────────────────────────────────────

export function printKeyValue(
  pairs: [string, string][],
  title?: string,
  borderColor: "magenta" | "cyan" | "green" | "yellow" = "magenta"
): void {
  const content = pairs
    .map(([key, val]) => theme.muted(key.padEnd(18)) + theme.white(val))
    .join("\n");

  console.log(
    "\n" + boxen(content, {
      title: title ? theme.primary.bold(title) : undefined,
      titleAlignment: "left",
      padding: 1,
      margin: { top: 0, bottom: 1, left: 2, right: 0 },
      borderStyle: "round",
      borderColor,
    })
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  label: string;
  detail?: string;
  durationMs?: number;
  status?: "done" | "error" | "warn" | "info";
}

export function printTimeline(events: TimelineEvent[], title?: string): void {
  if (title) console.log("\n" + theme.primary.bold(`  ▸ ${title}`));
  const total = events.reduce((s, e) => s + (e.durationMs ?? 0), 0);

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const isLast = i === events.length - 1;
    const icon =
      e.status === "done"  ? theme.success("✔") :
      e.status === "error" ? theme.error("✖") :
      e.status === "warn"  ? theme.warn("⚠") :
      theme.secondary("›");
    const connector = isLast ? "  └─" : "  ├─";
    const timing = e.durationMs != null
      ? theme.muted(` (${e.durationMs}ms${total ? ` · ${((e.durationMs / total) * 100).toFixed(0)}%` : ""})`)
      : "";
    console.log(
      theme.muted(connector) + " " + icon + " " +
      theme.white(e.label) + timing
    );
    if (e.detail) {
      const indent = isLast ? "      " : "  │   ";
      console.log(indent + theme.muted(e.detail.slice(0, 80)));
    }
  }
  console.log();
}

// ─── Markdown-ish answer renderer ─────────────────────────────────────────────

/**
 * Render a final answer with basic markdown-inspired formatting:
 * - # Heading → bold cyan
 * - **bold** → chalk bold
 * - `code` → accent colour
 * - bullet - item → indented with dot
 * - numbered 1. item → indented with number
 */
export function renderAnswer(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      // Headings
      if (/^###\s+/.test(line)) return "\n" + theme.secondary.bold(line.replace(/^###\s+/, "   "));
      if (/^##\s+/.test(line))  return "\n" + theme.primary.bold(line.replace(/^##\s+/, "  "));
      if (/^#\s+/.test(line))   return "\n" + chalk.bold.hex("#F59E0B")(line.replace(/^#\s+/, " "));

      // Bullets
      if (/^\s*[-*]\s+/.test(line)) {
        return line.replace(/^(\s*)[-*]\s+/, (_, indent) => `${indent}  ${theme.secondary("•")} `);
      }

      // Numbered
      if (/^\s*\d+\.\s+/.test(line)) {
        return line.replace(/^(\s*)(\d+)\.\s+/, (_, indent, n) => `${indent}  ${theme.accent.bold(n + ".")} `);
      }

      // Inline: **bold**
      line = line.replace(/\*\*(.+?)\*\*/g, (_, t) => chalk.bold(t));

      // Inline: `code`
      line = line.replace(/`(.+?)`/g, (_, t) => theme.accent(t));

      return "  " + line;
    })
    .join("\n");
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

export function progressBar(current: number, total: number, width = 24): string {
  const pct = total > 0 ? Math.min(current / total, 1) : 0;
  const filled = Math.round(pct * width);
  const empty = width - filled;
  return (
    theme.primary("█".repeat(filled)) +
    theme.muted("░".repeat(empty)) +
    " " +
    theme.accent(`${Math.round(pct * 100)}%`)
  );
}

// ─── Notification pill ────────────────────────────────────────────────────────

export function pill(text: string, color: "primary" | "success" | "error" | "warn" | "secondary" | "accent" = "primary"): string {
  return theme[color](`[${text}]`);
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function divider(char = "─", width = 60): string {
  return theme.muted("  " + char.repeat(width));
}
