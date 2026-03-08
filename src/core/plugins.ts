// ──────────────────────────────────────────────────────────────────────────────
// Plugin Loader
// Dynamically loads custom tools from ./plugins/*.js (or *.ts via tsx)
// Each plugin file should export a default Tool instance or an array of them.
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import type { Tool } from "./tool.js";
import { logger } from "./logger.js";

const PLUGINS_DIR = path.resolve("plugins");

export interface PluginLoadResult {
  file: string;
  tools: Tool<any>[];
  error?: string;
}

/** Scan ./plugins/ and dynamically import each .js file */
export async function loadPlugins(): Promise<PluginLoadResult[]> {
  const results: PluginLoadResult[] = [];

  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    // Write an example plugin
    writeExamplePlugin();
    return results;
  }

  const files = fs.readdirSync(PLUGINS_DIR).filter((f) => f.endsWith(".js") || f.endsWith(".mjs"));

  for (const file of files) {
    const fullPath = path.join(PLUGINS_DIR, file);
    try {
      const url = pathToFileURL(fullPath).href;
      const mod = await import(url);

      const exported = mod.default;
      if (!exported) {
        results.push({ file, tools: [], error: "No default export found" });
        continue;
      }

      const tools: Tool<any>[] = Array.isArray(exported) ? exported : [exported];
      const valid = tools.filter((t) => t && typeof t.execute === "function");

      if (valid.length === 0) {
        results.push({ file, tools: [], error: "Default export is not a Tool or Tool[]" });
        continue;
      }

      logger.info(`🔌 Plugin loaded: ${file} (${valid.length} tool${valid.length > 1 ? "s" : ""})`);
      results.push({ file, tools: valid });
    } catch (err: any) {
      results.push({ file, tools: [], error: err.message });
      logger.error(`Plugin load failed (${file}): ${err.message}`);
    }
  }

  return results;
}

/** Write a sample plugin so users know the format */
function writeExamplePlugin() {
  const example = `// Example AgenticCLI Plugin
// Export a Tool instance as the default export.
// Build with: npx tsc --module esnext --target es2022 --moduleResolution node your-plugin.ts

// (Compiled JS only in ./plugins/ — for .ts, transpile first)

// import { Tool } from "../src/core/tool.js";
// 
// const myTool = new Tool({
//   name: "myTool",
//   description: "Describe what this tool does",
//   inputDescription: "string input",
//   func: async (input) => {
//     return \`You said: \${input}\`;
//   },
// });
// 
// export default myTool;

// This file is intentionally empty — add your .js plugin files here.
`;
  fs.writeFileSync(path.join(PLUGINS_DIR, "README.md"), example, "utf-8");
}

export function listPluginFiles(): string[] {
  if (!fs.existsSync(PLUGINS_DIR)) return [];
  return fs.readdirSync(PLUGINS_DIR).filter((f) => f.endsWith(".js") || f.endsWith(".mjs"));
}
