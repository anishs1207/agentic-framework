import { Tool } from "../core/tool.js";
import { z } from "../core/tool.js";
import https from "https";
import http from "http";
import { URL } from "url";

// ──────────────────────────────────────────────────────────────────────────────
// HTTP Fetch Tool
// Performs HTTP GET/POST requests — useful for hitting APIs
// ──────────────────────────────────────────────────────────────────────────────

const HttpSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  timeout: z.number().min(1000).max(30000).optional().default(10000),
});

type HttpInput = z.infer<typeof HttpSchema>;

function httpRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const mod = isHttps ? https : http;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        "User-Agent": "AgenticFramework/2.0",
        ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {}),
        ...headers,
      },
    };

    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        const status = `HTTP ${res.statusCode} ${res.statusMessage}`;
        const preview = raw.length > 3000 ? raw.slice(0, 3000) + "\n...(truncated)" : raw;
        resolve(`${status}\n\n${preview}`);
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    });

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

export const httpFetchTool = new Tool<HttpInput>({
  name: "httpFetch",
  description:
    "Make HTTP requests to external APIs or URLs. Supports GET, POST, PUT, DELETE, PATCH. " +
    "Can send custom headers and a request body. Returns the HTTP status and response body.",
  inputDescription: 'JSON: { url: string, method?: "GET"|"POST"|..., headers?: {}, body?: string, timeout?: number }',
  inputSchema: HttpSchema,
  examples: [
    '{"url":"https://httpbin.org/get"}',
    '{"url":"https://httpbin.org/post","method":"POST","body":"{\\"name\\":\\"agent\\"}"}',
    '{"url":"https://api.github.com/repos/octocat/Hello-World","headers":{"Accept":"application/vnd.github+json"}}',
  ],
  func: async ({ url, method, headers, body, timeout }) => {
    try {
      return await httpRequest(url, method ?? "GET", (headers ?? {}) as Record<string, string>, body, timeout ?? 10000);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return `ERROR: ${errMsg}`;
    }
  },
});
