// ──────────────────────────────────────────────────────────────────────────────
// Cron Scheduler — schedule agent tasks and workflows on cron-like intervals
// ──────────────────────────────────────────────────────────────────────────────

import { globalBus, AgentEvents } from "./events.js";
import { logger } from "./logger.js";

export interface CronJob {
  id: string;
  name: string;
  description?: string;
  /** Interval in milliseconds */
  intervalMs: number;
  /** Human-readable schedule string e.g. "every 5m", "every 1h", "every 30s" */
  schedule: string;
  /** The task type */
  type: "agent" | "workflow";
  /** For type=agent: the agent message to run */
  agentId?: string;
  input: string;
  /** Workflow name for type=workflow */
  workflowName?: string;
  enabled: boolean;
  /** Stats */
  runCount: number;
  lastRunAt?: Date;
  lastResult?: string;
  lastError?: string;
  nextRunAt?: Date;
  createdAt: Date;
}

/** Parse human-readable schedule strings → ms */
export function parseSchedule(schedule: string): number | null {
  const lower = schedule.trim().toLowerCase();

  // Handle "every Xs", "every Xm", "every Xh", "every Xd"
  const everyMatch = lower.match(/^every\s+(\d+(?:\.\d+)?)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days)$/);
  if (everyMatch) {
    const n = parseFloat(everyMatch[1]);
    const unit = everyMatch[2];
    if (unit.startsWith("s")) return Math.round(n * 1000);
    if (unit.startsWith("m")) return Math.round(n * 60_000);
    if (unit.startsWith("h")) return Math.round(n * 3_600_000);
    if (unit.startsWith("d")) return Math.round(n * 86_400_000);
  }

  // Handle plain "30s", "5m", "2h", "1d"
  const plainMatch = lower.match(/^(\d+(?:\.\d+)?)\s*(s|m|h|d)$/);
  if (plainMatch) {
    const n = parseFloat(plainMatch[1]);
    const unit = plainMatch[2];
    if (unit === "s") return Math.round(n * 1000);
    if (unit === "m") return Math.round(n * 60_000);
    if (unit === "h") return Math.round(n * 3_600_000);
    if (unit === "d") return Math.round(n * 86_400_000);
  }

  // "daily" shorthand
  if (lower === "daily") return 86_400_000;
  if (lower === "hourly") return 3_600_000;

  return null;
}

export type CronHandler = (job: CronJob) => Promise<void>;

export class Scheduler {
  private jobs: Map<string, CronJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private handler: CronHandler;

  constructor(handler: CronHandler) {
    this.handler = handler;
  }

  addJob(
    params: Omit<CronJob, "id" | "runCount" | "createdAt" | "enabled"> & { enabled?: boolean }
  ): CronJob {
    const id = params.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
    const job: CronJob = {
      ...params,
      id,
      enabled: params.enabled ?? true,
      runCount: 0,
      createdAt: new Date(),
      nextRunAt: new Date(Date.now() + params.intervalMs),
    };
    this.jobs.set(id, job);

    if (job.enabled) {
      this.startTimer(job);
    }

    logger.info(`⏰ Cron job "${job.name}" scheduled: ${job.schedule}`);
    return job;
  }

  removeJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    this.clearTimer(id);
    this.jobs.delete(id);
    logger.info(`🗑  Cron job "${job.name}" removed`);
    return true;
  }

  enableJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    job.enabled = true;
    job.nextRunAt = new Date(Date.now() + job.intervalMs);
    this.startTimer(job);
    return true;
  }

  disableJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    job.enabled = false;
    this.clearTimer(id);
    return true;
  }

  /** Run a job immediately (regardless of timer) */
  async runNow(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Job "${id}" not found`);
    await this.execute(job);
  }

  listJobs(): CronJob[] {
    return [...this.jobs.values()];
  }

  getJob(idOrName: string): CronJob | undefined {
    return (
      this.jobs.get(idOrName) ??
      [...this.jobs.values()].find(
        (j) => j.name.toLowerCase() === idOrName.toLowerCase()
      )
    );
  }

  stopAll() {
    for (const id of this.timers.keys()) {
      this.clearTimer(id);
    }
    logger.info("⏹  All cron jobs stopped");
  }

  private startTimer(job: CronJob) {
    this.clearTimer(job.id);
    const timer = setInterval(async () => {
      await this.execute(job);
    }, job.intervalMs);
    // Prevent the timer from blocking Node.js exit
    if (timer.unref) timer.unref();
    this.timers.set(job.id, timer);
  }

  private clearTimer(id: string) {
    const t = this.timers.get(id);
    if (t) {
      clearInterval(t);
      this.timers.delete(id);
    }
  }

  private async execute(job: CronJob) {
    job.runCount++;
    job.lastRunAt = new Date();
    job.nextRunAt = new Date(Date.now() + job.intervalMs);

    globalBus.emitSync(AgentEvents.CRON_FIRED, { jobId: job.id, name: job.name });
    logger.info(`🔔 Cron "${job.name}" fired (run #${job.runCount})`);

    try {
      await this.handler(job);
      logger.info(`✔  Cron "${job.name}" completed`);
    } catch (err: any) {
      job.lastError = err.message;
      globalBus.emitSync(AgentEvents.CRON_ERROR, { jobId: job.id, error: err.message });
      logger.error(`Cron "${job.name}" failed: ${err.message}`);
    }
  }
}
