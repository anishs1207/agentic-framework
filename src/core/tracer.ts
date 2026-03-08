// ──────────────────────────────────────────────────────────────────────────────
// Execution Tracer
// Captures a detailed trace of every agent iteration: timing, tokens-approx,
// tool calls, thoughts, and errors. Exported as a structured JSON trace file.
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from "fs";
import * as path from "path";

export interface TraceStep {
  iteration: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  thought?: string;
  action?: string;
  actionInput?: string;
  observation?: string;
  error?: string;
  isFinalAnswer?: boolean;
  finalAnswer?: string;
  /** Rough prompt token count (characters / 4) */
  approxPromptTokens?: number;
}

export interface AgentTrace {
  id: string;
  input: string;
  startedAt: string;
  finishedAt?: string;
  totalDurationMs?: number;
  model: string;
  temperature: number;
  maxIterations: number;
  steps: TraceStep[];
  finalOutput?: string;
  toolsUsed: string[];
  succeeded: boolean;
  error?: string;
}

const TRACES_DIR = path.resolve("traces");

function ensureDir() {
  if (!fs.existsSync(TRACES_DIR)) {
    fs.mkdirSync(TRACES_DIR, { recursive: true });
  }
}

export class ExecutionTracer {
  private trace: AgentTrace;
  private currentStep: Partial<TraceStep> | null = null;
  private stepStart = 0;

  constructor(params: {
    input: string;
    model: string;
    temperature: number;
    maxIterations: number;
  }) {
    this.trace = {
      id: "trace-" + Date.now().toString(36),
      input: params.input,
      startedAt: new Date().toISOString(),
      model: params.model,
      temperature: params.temperature,
      maxIterations: params.maxIterations,
      steps: [],
      toolsUsed: [],
      succeeded: false,
    };
  }

  beginStep(iteration: number, promptLength?: number) {
    this.stepStart = Date.now();
    this.currentStep = {
      iteration,
      startMs: this.stepStart,
      approxPromptTokens: promptLength ? Math.round(promptLength / 4) : undefined,
    };
  }

  recordThought(thought: string) {
    if (this.currentStep) this.currentStep.thought = thought;
  }

  recordAction(action: string, input: string) {
    if (this.currentStep) {
      this.currentStep.action = action;
      this.currentStep.actionInput = input;
    }
  }

  recordObservation(observation: string) {
    if (this.currentStep) this.currentStep.observation = observation.slice(0, 500);
  }

  recordError(error: string) {
    if (this.currentStep) this.currentStep.error = error;
  }

  recordFinalAnswer(answer: string) {
    if (this.currentStep) {
      this.currentStep.isFinalAnswer = true;
      this.currentStep.finalAnswer = answer;
    }
  }

  endStep() {
    if (!this.currentStep) return;
    const now = Date.now();
    const step: TraceStep = {
      ...(this.currentStep as any),
      endMs: now,
      durationMs: now - this.stepStart,
    };
    this.trace.steps.push(step);
    this.currentStep = null;
  }

  recordToolUsed(toolName: string) {
    if (!this.trace.toolsUsed.includes(toolName)) {
      this.trace.toolsUsed.push(toolName);
    }
  }

  finish(output: string, succeeded: boolean, error?: string) {
    const now = Date.now();
    this.trace.finishedAt = new Date().toISOString();
    this.trace.totalDurationMs = now - Date.parse(this.trace.startedAt);
    this.trace.finalOutput = output;
    this.trace.succeeded = succeeded;
    if (error) this.trace.error = error;
  }

  getTrace(): AgentTrace { return this.trace; }

  /** Save the trace to ./traces/<id>.json */
  save(): string {
    ensureDir();
    const file = path.join(TRACES_DIR, `${this.trace.id}.json`);
    fs.writeFileSync(file, JSON.stringify(this.trace, null, 2), "utf-8");
    return file;
  }

  /** Human-readable summary table */
  summary(): string {
    const t = this.trace;
    const rows = t.steps.map((s) => {
      const type = s.isFinalAnswer
        ? "✅ Final"
        : s.action
        ? `🔧 ${s.action}`
        : "💭 Think";
      const timing = `${s.durationMs}ms`;
      const detail = s.finalAnswer
        ? s.finalAnswer.slice(0, 50)
        : s.observation
        ? s.observation.slice(0, 50)
        : s.thought?.slice(0, 50) ?? "";
      return `  Step ${s.iteration}  ${type.padEnd(18)} ${timing.padEnd(8)} ${detail}`;
    });

    return [
      `Trace: ${t.id}`,
      `Input: ${t.input.slice(0, 60)}`,
      `Model: ${t.model} | Temp: ${t.temperature} | Duration: ${(t.totalDurationMs ?? 0) / 1000}s`,
      `Steps: ${t.steps.length} | Tools: ${t.toolsUsed.join(", ") || "none"}`,
      "─".repeat(70),
      ...rows,
    ].join("\n");
  }
}
