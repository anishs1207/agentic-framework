import { Tool } from "../core/tool.js";
import { z } from "../core/tool.js";
import * as fs from "fs";
import * as path from "path";

// ──────────────────────────────────────────────────────────────────────────────
// File System Tool
// Lets the agent read / write / list files in a sandboxed working directory
// ──────────────────────────────────────────────────────────────────────────────

const FileOpSchema = z.object({
  op: z.enum(["read", "write", "append", "list", "exists", "delete", "mkdir"]),
  filepath: z.string().min(1),
  content: z.string().optional(),
});

type FileOp = z.infer<typeof FileOpSchema>;

const SANDBOX_DIR = path.resolve("agent-workspace");

function sandboxedPath(filepath: string): string {
  const resolved = path.resolve(SANDBOX_DIR, filepath.replace(/^[/\\]+/, ""));
  // Security: ensure path stays within sandbox
  if (!resolved.startsWith(SANDBOX_DIR)) {
    throw new Error(`Path traversal detected. Access denied: ${filepath}`);
  }
  return resolved;
}

export const fileSystemTool = new Tool<FileOp>({
  name: "fileSystem",
  description:
    "Read, write, append, list, delete files or check existence inside the agent workspace (./agent-workspace/). " +
    "Useful for saving intermediate results, reading configuration, or persisting data.",
  inputDescription: 'JSON: { op: "read"|"write"|"append"|"list"|"exists"|"delete"|"mkdir", filepath: string, content?: string }',
  inputSchema: FileOpSchema,
  examples: [
    '{"op":"write","filepath":"notes.txt","content":"Hello world"}',
    '{"op":"read","filepath":"notes.txt"}',
    '{"op":"list","filepath":"."}',
  ],
  func: async ({ op, filepath, content }) => {
    // Ensure sandbox exists
    if (!fs.existsSync(SANDBOX_DIR)) {
      fs.mkdirSync(SANDBOX_DIR, { recursive: true });
    }

    try {
      const absPath = sandboxedPath(filepath);

      switch (op) {
        case "read": {
          if (!fs.existsSync(absPath)) return `File not found: ${filepath}`;
          const data = fs.readFileSync(absPath, "utf-8");
          return data.length > 4000 ? data.slice(0, 4000) + "\n...(truncated)" : data;
        }

        case "write": {
          const dir = path.dirname(absPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(absPath, content ?? "", "utf-8");
          return `✔ Written ${(content ?? "").length} bytes to ${filepath}`;
        }

        case "append": {
          const dir = path.dirname(absPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.appendFileSync(absPath, content ?? "", "utf-8");
          return `✔ Appended to ${filepath}`;
        }

        case "list": {
          const target = fs.existsSync(absPath) ? absPath : SANDBOX_DIR;
          const entries = fs.readdirSync(target, { withFileTypes: true });
          if (entries.length === 0) return "(empty directory)";
          return entries
            .map((e) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`)
            .join("\n");
        }

        case "exists":
          return fs.existsSync(absPath) ? `exists: true` : `exists: false`;

        case "delete":
          if (!fs.existsSync(absPath)) return `File not found: ${filepath}`;
          fs.unlinkSync(absPath);
          return `✔ Deleted ${filepath}`;

        case "mkdir":
          fs.mkdirSync(absPath, { recursive: true });
          return `✔ Directory created: ${filepath}`;

        default:
          return `Unknown operation: ${op}`;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return `ERROR: ${errMsg}`;
    }
  },
});
