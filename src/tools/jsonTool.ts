import { Tool } from "../core/tool.js";
import { z } from "../core/tool.js";

// ──────────────────────────────────────────────────────────────────────────────
// JSON Tool — parse, query, format, transform JSON data
// ──────────────────────────────────────────────────────────────────────────────

const JsonSchema = z.object({
  op: z.enum(["parse", "stringify", "get", "keys", "values", "summarise"]),
  data: z.string().min(1),
  /** For op=get: dot-notation path like "user.address.city" */
  path: z.string().optional(),
});

type JsonInput = z.infer<typeof JsonSchema>;

function getByPath(obj: any, dotPath: string): any {
  const parts = dotPath.split(".");
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function summarise(obj: any, depth = 0): string {
  if (depth > 3) return "(...)";
  if (obj === null) return "null";
  if (Array.isArray(obj)) {
    return `Array(${obj.length}) [${obj.slice(0, 2).map((v) => summarise(v, depth + 1)).join(", ")}${obj.length > 2 ? ", ..." : ""}]`;
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    const pairs = keys.slice(0, 4).map((k) => `${k}: ${summarise(obj[k], depth + 1)}`);
    return `{${pairs.join(", ")}${keys.length > 4 ? ", ..." : ""}}`;
  }
  return String(obj);
}

export const jsonTool = new Tool<JsonInput>({
  name: "jsonTool",
  description:
    "Parse, query, or transform JSON data. Operations: parse (validate), stringify, get (extract nested value by dot-path), keys, values, summarise.",
  inputDescription: 'JSON: { op: "parse"|"stringify"|"get"|"keys"|"values"|"summarise", data: string, path?: string }',
  inputSchema: JsonSchema,
  examples: [
    '{"op":"parse","data":"{\\"name\\":\\"Alice\\",\\"age\\":30}"}',
    '{"op":"get","data":"{\\"user\\":{\\"name\\":\\"Bob\\"}}","path":"user.name"}',
    '{"op":"keys","data":"{\\"a\\":1,\\"b\\":2}"}',
    '{"op":"summarise","data":"[1,2,3,{\\"x\\":true}]"}',
  ],
  func: async ({ op, data, path }) => {
    try {
      const parsed = JSON.parse(data);

      switch (op) {
        case "parse":
          return `Valid JSON. Type: ${Array.isArray(parsed) ? "array" : typeof parsed}. Summarise: ${summarise(parsed)}`;

        case "stringify":
          return JSON.stringify(parsed, null, 2);

        case "get": {
          if (!path) return "ERROR: 'path' is required for op=get";
          const val = getByPath(parsed, path);
          return val === undefined ? `(not found)` : JSON.stringify(val, null, 2);
        }

        case "keys":
          if (typeof parsed !== "object" || Array.isArray(parsed)) return "ERROR: data must be a JSON object";
          return Object.keys(parsed).join(", ");

        case "values":
          if (typeof parsed !== "object" || Array.isArray(parsed)) return "ERROR: data must be a JSON object";
          return Object.entries(parsed)
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join("\n");

        case "summarise":
          return summarise(parsed);

        default:
          return `Unknown op: ${op}`;
      }
    } catch (e: any) {
      return `ERROR parsing JSON: ${e.message}`;
    }
  },
});
