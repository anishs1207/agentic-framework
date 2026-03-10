// ─────────────────────────────────────────────────────────────────────────────
// Platform formatters — enforce character limits, format threads, etc.
// ─────────────────────────────────────────────────────────────────────────────

import type { GeneratedPost, Platform } from "../core/types.js";

export const PLATFORM_LIMITS: Record<Platform, { maxChars: number; label: string; color: string }> = {
  twitter:   { maxChars: 280,   label: "X / Twitter",  color: "#1DA1F2" },
  linkedin:  { maxChars: 3000,  label: "LinkedIn",     color: "#0A66C2" },
  instagram: { maxChars: 2200,  label: "Instagram",    color: "#E1306C" },
};

export const PLATFORM_ICONS: Record<Platform, string> = {
  twitter:   "𝕏",
  linkedin:  "in",
  instagram: "📸",
};

/** Truncate to platform limit with ellipsis */
export function truncateToPlatform(text: string, platform: Platform): string {
  const limit = PLATFORM_LIMITS[platform].maxChars;
  if (text.length <= limit) return text;
  return text.slice(0, limit - 3) + "…";
}

/** Validate a generated post against platform rules, return list of warnings */
export function validatePost(post: GeneratedPost): string[] {
  const warnings: string[] = [];
  const limit = PLATFORM_LIMITS[post.platform].maxChars;

  if (post.platform === "twitter" && post.thread) {
    post.thread.forEach((t, i) => {
      if (t.length > 280) warnings.push(`Tweet ${i + 1} is ${t.length} chars (max 280)`);
    });
  } else {
    if (post.content.length > limit) {
      warnings.push(`${post.platform} post is ${post.content.length} chars (max ${limit})`);
    }
  }

  if (post.platform === "linkedin" && post.content.length < 50) {
    warnings.push("LinkedIn posts perform better with at least 50 characters");
  }

  if (post.platform === "instagram" && post.hashtags.length < 5) {
    warnings.push("Instagram posts typically need 5+ hashtags for reach");
  }

  return warnings;
}

/** Format a Twitter thread for display */
export function formatThread(thread: string[]): string {
  return thread
    .map((t, i) => `[${i + 1}/${thread.length}] ${t}`)
    .join("\n\n" + "─".repeat(40) + "\n\n");
}

/** Stats for a post bundle */
export function postStats(post: GeneratedPost): string {
  const score = post.engagementScore;
  const bar = score != null ? "█".repeat(score) + "░".repeat(10 - score) : "";
  return [
    `Platform:   ${PLATFORM_LIMITS[post.platform].label}`,
    `Length:     ${post.characterCount} chars`,
    `Hashtags:   ${post.hashtags.length}`,
    score != null ? `Engagement: ${bar} ${score}/10` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Platform-specific scheduling advice */
export const BEST_TIMES: Record<Platform, string[]> = {
  twitter:   ["08:00", "12:00", "17:00", "20:00"],
  linkedin:  ["07:30", "12:00", "17:30"],
  instagram: ["06:00", "12:00", "18:00", "21:00"],
};
