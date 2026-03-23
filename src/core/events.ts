// ──────────────────────────────────────────────────────────────────────────────
// Event Bus — typed pub/sub for inter-agent and system-wide communication
// ──────────────────────────────────────────────────────────────────────────────

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface EventRecord {
  type: string;
  payload: unknown;
  emittedAt: Date;
  source?: string; // e.g. agent name
}

export class EventBus {
  private listeners: Map<string, EventHandler<unknown>[]> = new Map();
  private history: EventRecord[] = [];
  private maxHistory: number;

  constructor(maxHistory = 500) {
    this.maxHistory = maxHistory;
  }

  /** Subscribe to an event type */
  on<T = unknown>(type: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(handler as EventHandler<unknown>);

    // Return unsubscribe function
    return () => this.off(type, handler);
  }

  /** Unsubscribe a handler */
  off<T = unknown>(type: string, handler: EventHandler<T>) {
    const handlers = this.listeners.get(type);
    if (!handlers) return;
    const idx = handlers.indexOf(handler as EventHandler<unknown>);
    if (idx !== -1) handlers.splice(idx, 1);
  }

  /** Subscribe to an event type, fire only once */
  once<T = unknown>(type: string, handler: EventHandler<T>): () => void {
    const wrapper: EventHandler<T> = async (payload) => {
      unsub();
      await handler(payload);
    };
    const unsub = this.on(type, wrapper);
    return unsub;
  }

  /** Emit an event to all subscribers */
  async emit<T = unknown>(type: string, payload: T, source?: string): Promise<void> {
    const record: EventRecord = { type, payload, emittedAt: new Date(), source };
    this.history.push(record);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    const handlers = this.listeners.get(type) ?? [];
    const wildcards = this.listeners.get("*") ?? [];
    const all = [...handlers, ...wildcards];

    await Promise.allSettled(all.map((h) => h(payload)));
  }

  /** Emit synchronously (no async handlers) */
  emitSync<T = unknown>(type: string, payload: T, source?: string): void {
    const record: EventRecord = { type, payload, emittedAt: new Date(), source };
    this.history.push(record);
    if (this.history.length > this.maxHistory) this.history.shift();

    const handlers = this.listeners.get(type) ?? [];
    const wildcards = this.listeners.get("*") ?? [];
    [...handlers, ...wildcards].forEach((h) => h(payload));
  }

  /** Get recent event history */
  getHistory(limit = 50): EventRecord[] {
    return this.history.slice(-limit);
  }

  /** Clear all listeners and history */
  reset() {
    this.listeners.clear();
    this.history = [];
  }
}

// Singleton global event bus
export const globalBus = new EventBus();

// Built-in event types
export const AgentEvents = {
  AGENT_CREATED:    "agent:created",
  AGENT_STARTED:    "agent:started",
  AGENT_COMPLETED:  "agent:completed",
  AGENT_ERROR:      "agent:error",
  TOOL_CALLED:      "tool:called",
  TOOL_RESULT:      "tool:result",
  WORKFLOW_STARTED: "workflow:started",
  WORKFLOW_STEP:    "workflow:step",
  WORKFLOW_DONE:    "workflow:done",
  CRON_FIRED:       "cron:fired",
  CRON_ERROR:       "cron:error",
  MESSAGE_SENT:     "message:sent",
} as const;
