// ─────────────────────────────────────────────────────────────────────────────
// Terminal UI — banner, colours, tables, cards
// ─────────────────────────────────────────────────────────────────────────────

import chalk from "chalk";
import boxen from "boxen";
import figlet from "figlet";
import type { ContentBundle, ScheduledPost, Platform } from "../core/types.js";
import { PLATFORM_LIMITS, PLATFORM_ICONS, postStats, formatThread } from "../platforms/formatters.js";

// ── Colour palette ─────────────────────────────────────────────────────────

export const c = {
  primary:   chalk.hex("#7C3AED"),   // violet
  cyan:      chalk.hex("#06B6D4"),
  amber:     chalk.hex("#F59E0B"),
  green:     chalk.hex("#10B981"),
  red:       chalk.hex("#EF4444"),
  orange:    chalk.hex("#F97316"),
  muted:     chalk.hex("#6B7280"),
  white:     chalk.white,
  twitter:   chalk.hex("#1DA1F2"),
  linkedin:  chalk.hex("#0A66C2"),
  instagram: chalk.hex("#E1306C"),
};

export const platformColor = (p: Platform) =>
  p === "twitter" ? c.twitter :
  p === "linkedin" ? c.linkedin :
  c.instagram;

// ── Banner ─────────────────────────────────────────────────────────────────

export function printBanner() {
  const title = figlet.textSync("SocialPilot", { font: "Small", horizontalLayout: "fitted" });
  const lines = title.split("\n");
  const grad  = ["#7C3AED", "#8B5CF6", "#06B6D4", "#0A66C2", "#E1306C"];
  const colored = lines.map((l, i) => chalk.bold.hex(grad[Math.min(i, grad.length - 1)])(l));

  console.log(
    boxen(
      colored.join("\n") +
      "\n" + c.muted("  AI Social Media Manager  •  Powered by Gemini") +
      "\n" + c.muted("  𝕏 Twitter  •  in LinkedIn  •  📸 Instagram"),
      {
        padding: 1,
        margin: { top: 1, bottom: 0, left: 1, right: 1 },
        borderStyle: "round",
        borderColor: "magenta",
      }
    )
  );
}

// ── Section header ─────────────────────────────────────────────────────────

export function section(title: string) {
  console.log("\n" + c.primary.bold(`  ▸ ${title}`) + "\n" + c.muted("  " + "─".repeat(52)));
}

// ── Divider ────────────────────────────────────────────────────────────────

export function divider() { console.log(c.muted("  " + "─".repeat(52))); }

// ── Generated post card ────────────────────────────────────────────────────

export function printPostCard(
  platform: Platform,
  content: string,
  thread?: string[],
  hashtags?: string[],
  engagementScore?: number
) {
  const pColor = platformColor(platform);
  const icon   = PLATFORM_ICONS[platform];
  const label  = PLATFORM_LIMITS[platform].label;

  let body = thread && platform === "twitter"
    ? formatThread(thread)
    : content;

  if (hashtags?.length && !body.includes(hashtags[0])) {
    body += "\n\n" + c.cyan(hashtags.slice(0, 8).join(" "));
  }

  const score = engagementScore != null
    ? "\n\n" + c.muted("Engagement score: ") +
      c.amber("█".repeat(engagementScore) + "░".repeat(10 - engagementScore)) +
      c.amber(` ${engagementScore}/10`)
    : "";

  console.log(
    "\n" + boxen(body + score, {
      title: pColor.bold(`${icon}  ${label}`),
      titleAlignment: "left",
      padding: 1,
      margin: { top: 0, bottom: 0, left: 2, right: 0 },
      borderStyle: "round",
      borderColor: platform === "twitter" ? "blue" : platform === "linkedin" ? "blue" : "magenta",
    })
  );
}

// ── Bundle summary card ────────────────────────────────────────────────────

export function printBundleCard(bundle: ContentBundle) {
  const platforms = bundle.posts.map((p) =>
    platformColor(p.platform)(`${PLATFORM_ICONS[p.platform]} ${p.platform}`)
  ).join("  ");

  const content =
    c.muted("Idea:     ") + c.white(bundle.idea.slice(0, 60)) + "\n" +
    c.muted("Topics:   ") + c.cyan(bundle.topics.slice(0, 4).join(", ")) + "\n" +
    c.muted("Created:  ") + c.muted(new Date(bundle.createdAt).toLocaleString()) + "\n" +
    c.muted("Voice:    ") + c.amber(bundle.voice.name) + " · " + c.muted(bundle.voice.tone) + "\n" +
    c.muted("Posts:    ") + platforms;

  console.log(
    "\n" + boxen(content, {
      title: c.primary.bold(`📦  Bundle — ${bundle.id}`),
      titleAlignment: "left",
      padding: 1,
      margin: { top: 0, bottom: 0, left: 2, right: 0 },
      borderStyle: "round",
      borderColor: "magenta",
    })
  );
}

// ── Scheduled queue table ──────────────────────────────────────────────────

export function printQueue(posts: ScheduledPost[]) {
  if (posts.length === 0) {
    console.log("\n" + c.muted("  No posts in queue. Use 'Schedule' from a bundle to add some.\n"));
    return;
  }

  section("Post Queue");

  const sep = "  " + ["─".repeat(10), "─".repeat(12), "─".repeat(22), "─".repeat(10)].join("┼");
  console.log(c.muted(sep.replace(/┼/g, "┬")));
  console.log(
    "  " +
    c.amber.bold(" Platform   ") + c.muted("│") +
    c.amber.bold(" Status     ") + c.muted("│") +
    c.amber.bold(" Scheduled At         ") + c.muted("│") +
    c.amber.bold(" Preview   ")
  );
  console.log(c.muted(sep));

  for (const p of posts) {
    const statusColor =
      p.status === "posted"    ? c.green :
      p.status === "failed"    ? c.red :
      p.status === "scheduled" ? c.cyan :
      c.muted;

    console.log(
      "  " +
      platformColor(p.platform)(` ${PLATFORM_ICONS[p.platform]} ${p.platform.padEnd(9)}`) + c.muted("│") +
      statusColor(` ${p.status.padEnd(11)}`) + c.muted("│") +
      c.muted(` ${new Date(p.scheduledAt).toLocaleString().padEnd(21)}`) + c.muted("│") +
      c.muted(` ${p.label.slice(0, 10)}`)
    );
  }

  console.log(c.muted(sep.replace(/┬/g, "┴")));
  console.log();
}

// ── Help ───────────────────────────────────────────────────────────────────

export function printHelp() {
  const cmds: [string, string][] = [
    ["/generate",      "Generate posts for all platforms from an idea"],
    ["/bundles",       "View all saved content bundles"],
    ["/bundle <id>",   "View a specific bundle and its posts"],
    ["/schedule <id>", "Schedule posts from a bundle to the queue"],
    ["/queue",         "View the scheduled post queue"],
    ["/rewrite",       "Rewrite a post for a different platform"],
    ["/voices",        "List saved brand voices"],
    ["/voice-create",  "Create a new brand voice / persona"],
    ["/voice-delete",  "Delete a brand voice"],
    ["/delete <id>",   "Delete a content bundle"],
    ["/stats",         "Queue statistics dashboard"],
    ["/help",          "Show this help"],
    ["/exit",          "Exit"],
  ];

  section("Commands");
  for (const [cmd, desc] of cmds) {
    console.log("  " + c.amber.bold(cmd.padEnd(22)) + c.muted(desc));
  }
  console.log();
}

// ── Stats dashboard ────────────────────────────────────────────────────────

export function printStats(stats: Record<string, number>, bundleCount: number) {
  const content =
    c.muted("Total bundles:    ") + c.cyan(String(bundleCount)) + "\n" +
    c.muted("Queue total:      ") + c.white(String(stats.total)) + "\n" +
    c.muted("Scheduled:        ") + c.cyan(String(stats.scheduled)) + "\n" +
    c.muted("Posted:           ") + c.green(String(stats.posted)) + "\n" +
    c.muted("Failed:           ") + (stats.failed > 0 ? c.red(String(stats.failed)) : c.green("0")) + "\n" +
    c.muted("Drafts:           ") + c.muted(String(stats.draft));

  console.log(
    "\n" + boxen(content, {
      title: c.primary.bold("📊  Dashboard"),
      titleAlignment: "left",
      padding: 1,
      margin: { top: 0, bottom: 1, left: 2, right: 0 },
      borderStyle: "round",
      borderColor: "magenta",
    })
  );
}

// ── Spinner wrapper ────────────────────────────────────────────────────────

export { default as ora } from "ora";

export function spinner(text: string) {
  // lazy import ora
  const ora = require("ora");
  return ora({ text: c.muted(text), spinner: "dots2", color: "magenta" });
}
