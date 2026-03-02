import { z, ZodSchema, ZodIssue } from "zod";

// ─── Re-export zod for convenience ──────────────────────────────────────────
export { z };

// ─── Tool Schema (LangChain-style) ───────────────────────────────────────────

export interface ToolSchema {
  name: string;
  description: string;
  inputDescription?: string;
  examples?: string[];
}

// ─── Zod Validation Result ───────────────────────────────────────────────────

export type ValidationSuccess<T> = { success: true; data: T };
export type ValidationFailure = { success: false; error: string };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ─── Tool (raw-string input, optional Zod validation) ────────────────────────

/**
 * Config for a Tool with an optional Zod schema.
 *
 * When `inputSchema` is provided the raw string input is treated as JSON and
 * parsed+validated before being forwarded to `func`.  If validation fails the
 * error message is returned immediately without calling `func`.
 *
 * If `inputSchema` is omitted the tool behaves exactly as before – the raw
 * string is passed straight to `func`.
 */
export interface ToolConfig<TInput = string> {
  name: string;
  description: string;
  inputDescription?: string;
  examples?: string[];
  /** Optional Zod schema. When supplied, the input JSON is validated first. */
  inputSchema?: ZodSchema<TInput>;
  func: (input: TInput) => Promise<string>;
}

export class Tool<TInput = string> {
  name: string;
  description: string;
  inputDescription: string;
  examples: string[];
  inputSchema?: ZodSchema<TInput>;
  func: (input: TInput) => Promise<string>;

  constructor(config: ToolConfig<TInput>) {
    this.name = config.name;
    this.description = config.description;
    this.inputDescription = config.inputDescription ?? "string input";
    this.examples = config.examples ?? [];
    this.inputSchema = config.inputSchema;
    this.func = config.func;
  }

  /**
   * Validate a raw value against this tool's Zod schema (if any).
   * Returns a discriminated union for easy error handling.
   */
  validate(raw: unknown): ValidationResult<TInput> {
    if (!this.inputSchema) {
      return { success: true, data: raw as TInput };
    }
    const result = this.inputSchema.safeParse(raw);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return {
      success: false,
      error: formatZodIssues(result.error.issues),
    };
  }

  /**
   * Execute the tool.
   *
   * - If `inputSchema` is defined: the raw string is JSON-parsed first, then
   *   validated with Zod.  On failure a descriptive error string is returned.
   * - If `inputSchema` is absent: the raw string is passed directly as before.
   */
  async execute(rawInput: string): Promise<string> {
    if (!this.inputSchema) {
      // Legacy path – no schema, pass raw string as-is.
      return await (this.func as unknown as (input: string) => Promise<string>)(rawInput);
    }

    // Structured path – parse JSON, then validate with Zod.
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawInput);
    } catch {
      return `Validation error: Input must be valid JSON.\nReceived: ${rawInput}`;
    }

    const validation = this.validate(parsed);
    if (!validation.success) {
      return `Validation error:\n${(validation as ValidationFailure).error}`;
    }

    return await this.func((validation as ValidationSuccess<TInput>).data);
  }

  /** Returns a formatted schema description for prompts */
  toSchema(): string {
    let schema = `- ${this.name}: ${this.description}`;
    schema += `\n    Input: ${this.inputDescription}`;
    if (this.inputSchema) {
      schema += `\n    Input format: JSON`;
    }
    if (this.examples.length > 0) {
      schema += `\n    Examples: ${this.examples.join(", ")}`;
    }
    return schema;
  }
}

// ─── Helper: format Zod issues into a readable string ───────────────────────

function formatZodIssues(issues: ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.length ? `"${issue.path.join(".")}"` : "input";
      return `• ${path}: ${issue.message}`;
    })
    .join("\n");
}

// ─── Tool Registry ───────────────────────────────────────────────────────────

export class ToolRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Map<string, Tool<any>>;

  constructor() {
    this.tools = new Map();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(tool: Tool<any>): this {
    this.tools.set(tool.name, tool);
    return this; // allow chaining
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(name: string): Tool<any> | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  listNames(): string[] {
    return [...this.tools.keys()];
  }

  /** Returns simple name:description listing */
  listDescriptions(): string {
    return [...this.tools.values()]
      .map((t) => `${t.name} : ${t.description}`)
      .join("\n");
  }

  /** Returns detailed schemas for the LLM prompt */
  listSchemas(): string {
    return [...this.tools.values()]
      .map((t) => t.toSchema())
      .join("\n");
  }
}
