// Message Types 
export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Base Memory 
export abstract class BaseMemory {
  abstract addMessage(role: MessageRole, content: string, metadata?: Record<string, any>): void;
  abstract getMessages(): Message[];
  abstract getContext(): string;
  abstract clear(): void;
  abstract get length(): number;
}

// Conversation Buffer Memory 
// Stores the full conversation history 

export class ConversationBufferMemory extends BaseMemory {
  private messages: Message[] = [];

  addMessage(role: MessageRole, content: string, metadata?: Record<string, any>) {
    this.messages.push({
      role,
      content,
      timestamp: new Date(),
      metadata,
    });
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getContext(): string {
    if (this.messages.length === 0) return "";

    return this.messages
      .map((m) => {
        const prefix =
          m.role === "user" ? "Human" :
          m.role === "assistant" ? "AI" :
          m.role === "tool" ? "Tool" :
          "System";
        return `${prefix}: ${m.content}`;
      })
      .join("\n");
  }

  clear() {
    this.messages = [];
  }

  get length(): number {
    return this.messages.length;
  }
}

// Conversation Window Memory 
// Keeps only the last K interactions 

export class ConversationWindowMemory extends BaseMemory {
  private messages: Message[] = [];
  private windowSize: number;

  constructor(windowSize: number = 10) {
    super();
    this.windowSize = windowSize;
  }

  addMessage(role: MessageRole, content: string, metadata?: Record<string, any>) {
    this.messages.push({
      role,
      content,
      timestamp: new Date(),
      metadata,
    });

    // Trim to window size
    if (this.messages.length > this.windowSize) {
      this.messages = this.messages.slice(-this.windowSize);
    }
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getContext(): string {
    if (this.messages.length === 0) return "";

    return this.messages
      .map((m) => {
        const prefix =
          m.role === "user" ? "Human" :
          m.role === "assistant" ? "AI" :
          m.role === "tool" ? "Tool" :
          "System";
        return `${prefix}: ${m.content}`;
      })
      .join("\n");
  }

  clear() {
    this.messages = [];
  }

  get length(): number {
    return this.messages.length;
  }
}

// Summarizer Memory
// Keeps the last `recentWindow` messages verbatim, and compresses older
// messages into a running summary string. This lets the agent retain
// long-term context without ever blowing up the prompt size.
//
// Usage:
//   const memory = new SummarizerMemory({ maxRecent: 6, summaryPrefix: "Earlier:" });
//   memory.addSummary("User asked about Paris. AI explained the Eiffel Tower.");

export interface SummarizerMemoryOptions {
  /** How many recent messages to keep verbatim (default: 6) */
  maxRecent?: number;
  /** A label prepended to the summary block (default: "Earlier conversation summary:") */
  summaryPrefix?: string;
}

export class SummarizerMemory extends BaseMemory {
  private recentMessages: Message[] = [];
  private summary: string = "";
  private maxRecent: number;
  private summaryPrefix: string;

  constructor(options: SummarizerMemoryOptions = {}) {
    super();
    this.maxRecent = options.maxRecent ?? 6;
    this.summaryPrefix = options.summaryPrefix ?? "Earlier conversation summary:";
  }

  addMessage(role: MessageRole, content: string, metadata?: Record<string, any>) {
    this.recentMessages.push({ role, content, timestamp: new Date(), metadata });

    // When we exceed the window, compress the oldest message into the summary
    if (this.recentMessages.length > this.maxRecent) {
      const oldest = this.recentMessages.shift()!;
      const prefix =
        oldest.role === "user" ? "Human" :
        oldest.role === "assistant" ? "AI" :
        oldest.role === "tool" ? "Tool" :
        "System";
      const snippet = oldest.content.length > 200
        ? oldest.content.slice(0, 200) + "..."
        : oldest.content;
      this.summary = this.summary
        ? `${this.summary}\n${prefix}: ${snippet}`
        : `${prefix}: ${snippet}`;
    }
  }

  /** Manually inject a summary string (e.g. from an external summarizer LLM call) */
  addSummary(text: string) {
    this.summary = this.summary ? `${this.summary}\n${text}` : text;
  }

  getSummary(): string {
    return this.summary;
  }

  getMessages(): Message[] {
    return [...this.recentMessages];
  }

  getContext(): string {
    const parts: string[] = [];

    if (this.summary) {
      parts.push(`${this.summaryPrefix}\n${this.summary}`);
      parts.push("---");
    }

    if (this.recentMessages.length > 0) {
      parts.push(
        this.recentMessages
          .map((m) => {
            const prefix =
              m.role === "user" ? "Human" :
              m.role === "assistant" ? "AI" :
              m.role === "tool" ? "Tool" :
              "System";
            return `${prefix}: ${m.content}`;
          })
          .join("\n")
      );
    }

    return parts.join("\n");
  }

  clear() {
    this.recentMessages = [];
    this.summary = "";
  }

  get length(): number {
    return this.recentMessages.length + (this.summary ? 1 : 0);
  }
}
