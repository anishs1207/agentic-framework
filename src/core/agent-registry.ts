// ──────────────────────────────────────────────────────────────────────────────
// Agent Registry — named, reusable agent profiles with persistence
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from "fs";
import * as path from "path";

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  role: string;          // e.g. "researcher", "coder", "analyst"
  systemPrompt?: string; // custom system prompt override
  model: string;
  temperature: number;
  maxIterations: number;
  tools: string[];       // tool names this agent should have access to
  createdAt: string;
  updatedAt: string;
}

const PROFILES_DIR = path.resolve("agent-profiles");

function ensureDir() {
  if (!fs.existsSync(PROFILES_DIR)) {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
  }
}

export class AgentProfileRegistry {
  private profiles: Map<string, AgentProfile> = new Map();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    ensureDir();
    const files = fs.readdirSync(PROFILES_DIR).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      try {
        const profile: AgentProfile = JSON.parse(
          fs.readFileSync(path.join(PROFILES_DIR, f), "utf-8")
        );
        this.profiles.set(profile.id, profile);
      } catch {
        // skip corrupt files
      }
    }
  }

  private saveToDisk(profile: AgentProfile) {
    ensureDir();
    const filename = path.join(PROFILES_DIR, `${profile.id}.json`);
    fs.writeFileSync(filename, JSON.stringify(profile, null, 2), "utf-8");
  }

  /** Register or update a profile */
  save(profile: AgentProfile) {
    profile.updatedAt = new Date().toISOString();
    this.profiles.set(profile.id, profile);
    this.saveToDisk(profile);
  }

  /** Create a new profile with generated ID */
  create(params: Omit<AgentProfile, "id" | "createdAt" | "updatedAt">): AgentProfile {
    const id = params.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
    const profile: AgentProfile = {
      ...params,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.save(profile);
    return profile;
  }

  get(id: string): AgentProfile | undefined {
    return this.profiles.get(id);
  }

  findByName(name: string): AgentProfile | undefined {
    const lower = name.toLowerCase();
    return [...this.profiles.values()].find(
      (p) => p.name.toLowerCase() === lower || p.id === lower
    );
  }

  list(): AgentProfile[] {
    return [...this.profiles.values()];
  }

  delete(id: string): boolean {
    if (!this.profiles.has(id)) return false;
    this.profiles.delete(id);
    const file = path.join(PROFILES_DIR, `${id}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return true;
  }

  /** Built-in presets */
  static presets(): Omit<AgentProfile, "id" | "createdAt" | "updatedAt">[] {
    return [
      {
        name: "Researcher",
        description: "Searches the web and Wikipedia to gather and summarise information",
        role: "researcher",
        model: "gemini-2.5-flash",
        temperature: 0.3,
        maxIterations: 10,
        tools: ["wikipedia", "weather", "getTime"],
      },
      {
        name: "Calculator",
        description: "Specialises in maths, unit conversion and currency",
        role: "maths specialist",
        model: "gemini-2.5-flash",
        temperature: 0.1,
        maxIterations: 6,
        tools: ["calculator", "unitConverter", "currencyConverter"],
      },
      {
        name: "Assistant",
        description: "General-purpose helpful assistant with access to all tools",
        role: "general assistant",
        model: "gemini-2.5-flash",
        temperature: 0.7,
        maxIterations: 8,
        tools: [], // empty = all tools
      },
    ];
  }
}

// Singleton
export const agentProfileRegistry = new AgentProfileRegistry();
