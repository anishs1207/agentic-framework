// ─────────────────────────────────────────────────────────────────────────────
// Post Scheduler — watches the queue and fires posts at the right time
// ─────────────────────────────────────────────────────────────────────────────

import { getDuePostsNow, updatePostStatus, loadQueue } from "./storage.js";
import type { ScheduledPost } from "./types.js";

type PostHandler = (post: ScheduledPost) => Promise<{ success: boolean; error?: string }>;

export class PostScheduler {
  private timer: NodeJS.Timeout | null = null;
  private handler: PostHandler;
  private intervalMs: number;
  private running = false;

  constructor(handler: PostHandler, checkIntervalMs = 30_000) {
    this.handler = handler;
    this.intervalMs = checkIntervalMs;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.tick();
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    this.timer.unref(); // don't block process exit
    console.log(`  ⏰  Scheduler started — checking every ${this.intervalMs / 1000}s`);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.running = false;
  }

  private async tick() {
    const due = getDuePostsNow();
    for (const post of due) {
      // Mark in-progress to prevent double-firing
      updatePostStatus(post.id, "posted");
      const result = await this.handler(post);
      if (result.success) {
        updatePostStatus(post.id, "posted", { postedAt: new Date().toISOString() });
      } else {
        updatePostStatus(post.id, "failed", { error: result.error });
      }
    }
  }

  /** Statistics */
  stats() {
    const all = loadQueue();
    return {
      total:     all.length,
      scheduled: all.filter((p) => p.status === "scheduled").length,
      posted:    all.filter((p) => p.status === "posted").length,
      failed:    all.filter((p) => p.status === "failed").length,
      draft:     all.filter((p) => p.status === "draft").length,
    };
  }

  isRunning() { return this.running; }
}

// ── Default post handler (simulated — extend for real platform APIs) ───────────

export async function simulatedPostHandler(post: ScheduledPost): Promise<{ success: boolean; error?: string }> {
  // Simulate a network call
  await new Promise((res) => setTimeout(res, 500));
  // 95% success rate simulation
  const success = Math.random() > 0.05;
  if (!success) return { success: false, error: "Simulated platform API error" };
  return { success: true };
}
