// ──────────────────────────────────────────────────────────────────────────────
// Session Persistence
// Save / list / load full CLI sessions: memory, stats, config, persona, and
// command aliases — so you can pick up exactly where you left off.
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from "fs";
import * as path from "path";
import type { Message } from "./memory.js";
import type { SessionStats } from "../cli/ui.js";

export interface SavedSession {
  id: string;
  name: string;
  savedAt: string;
  model: string;
  temperature: number;
  persona: string | null;
  verbose: boolean;
  stats: SessionStats;
  messages: Message[];
  aliases: Record<string, string>;
}

const SESSIONS_DIR = path.resolve("sessions");

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function sessionPath(id: string): string {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

export function saveSession(session: SavedSession): void {
  ensureDir();
  // Messages may have Date objects; serialise them
  const serialisable = {
    ...session,
    messages: session.messages.map((m) => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
    })),
  };
  fs.writeFileSync(sessionPath(session.id), JSON.stringify(serialisable, null, 2), "utf-8");
}

export function loadSession(id: string): SavedSession | null {
  const p = sessionPath(id);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
    // Re-hydrate timestamps
    raw.messages = (raw.messages ?? []).map((m: Record<string, unknown>) => ({
      ...m,
      timestamp: new Date(m.timestamp as string),
    }));
    raw.stats.startTime = new Date(raw.stats.startTime);
    return raw as SavedSession;
  } catch {
    return null;
  }
}

export function listSessions(): SavedSession[] {
  ensureDir();
  return fs
    .readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), "utf-8")) as SavedSession;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as SavedSession[];
}

export function deleteSession(id: string): boolean {
  const p = sessionPath(id);
  if (!fs.existsSync(p)) return false;
  fs.unlinkSync(p);
  return true;
}

export function generateSessionId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
}
