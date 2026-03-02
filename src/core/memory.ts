// ─── Message Types ─────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ─── Base Memory ───────────────────────────────────────────────────────

export abstract class BaseMemory {
  abstract addMessage(role: MessageRole, content: string, metadata?: Record<string, any>): void;
  abstract getMessages(): Message[];
  abstract getContext(): string;
  abstract clear(): void;
  abstract get length(): number;
}

// ─── Conversation Buffer Memory ────────────────────────────────────────
// Stores the full conversation history (like LangChain's ConversationBufferMemory)

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

// ─── Conversation Window Memory ────────────────────────────────────────
// Keeps only the last K interactions (like LangChain's ConversationBufferWindowMemory)

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
