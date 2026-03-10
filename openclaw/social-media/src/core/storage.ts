// ─────────────────────────────────────────────────────────────────────────────
// Storage — persist bundles, scheduled posts, brand voices to disk
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from "fs";
import * as path from "path";
import type { ContentBundle, ScheduledPost, BrandVoice, AppConfig } from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";

const DATA_DIR   = path.resolve("data");
const BUNDLES    = path.join(DATA_DIR, "bundles.json");
const QUEUE      = path.join(DATA_DIR, "queue.json");
const VOICES     = path.join(DATA_DIR, "voices.json");
const CONFIG_F   = path.join(DATA_DIR, "config.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON<T>(file: string, fallback: T): T {
  ensureDir();
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}

function writeJSON(file: string, data: unknown) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

function nanoid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Bundles ───────────────────────────────────────────────────────────────────

export function saveBundles(bundles: ContentBundle[]) { writeJSON(BUNDLES, bundles); }
export function loadBundles(): ContentBundle[]         { return readJSON<ContentBundle[]>(BUNDLES, []); }

export function saveBundle(bundle: ContentBundle): ContentBundle {
  const all = loadBundles();
  const idx = all.findIndex((b) => b.id === bundle.id);
  if (idx !== -1) all[idx] = bundle; else all.unshift(bundle);
  saveBundles(all);
  return bundle;
}

export function createBundle(partial: Omit<ContentBundle, "id" | "createdAt">): ContentBundle {
  const bundle: ContentBundle = {
    ...partial,
    id: nanoid(),
    createdAt: new Date().toISOString(),
  };
  saveBundle(bundle);
  return bundle;
}

export function getBundle(id: string): ContentBundle | undefined {
  return loadBundles().find((b) => b.id === id);
}

export function deleteBundle(id: string): boolean {
  const all = loadBundles();
  const filtered = all.filter((b) => b.id !== id);
  if (filtered.length === all.length) return false;
  saveBundles(filtered);
  return true;
}

// ── Scheduled queue ───────────────────────────────────────────────────────────

export function loadQueue(): ScheduledPost[]   { return readJSON<ScheduledPost[]>(QUEUE, []); }
export function saveQueue(q: ScheduledPost[])  { writeJSON(QUEUE, q); }

export function schedulePost(partial: Omit<ScheduledPost, "id">): ScheduledPost {
  const post: ScheduledPost = { ...partial, id: nanoid() };
  const all = loadQueue();
  all.push(post);
  // Sort by scheduled time
  all.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  saveQueue(all);
  return post;
}

export function updatePostStatus(
  id: string,
  status: ScheduledPost["status"],
  extra: Partial<ScheduledPost> = {}
) {
  const all = loadQueue();
  const idx = all.findIndex((p) => p.id === id);
  if (idx !== -1) { all[idx] = { ...all[idx], status, ...extra }; saveQueue(all); }
}

export function deleteScheduledPost(id: string): boolean {
  const all = loadQueue();
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;
  saveQueue(filtered);
  return true;
}

export function getDuePostsNow(): ScheduledPost[] {
  const now = Date.now();
  return loadQueue().filter(
    (p) => p.status === "scheduled" && new Date(p.scheduledAt).getTime() <= now
  );
}

// ── Brand voices ──────────────────────────────────────────────────────────────

export function loadVoices(): BrandVoice[]   { return readJSON<BrandVoice[]>(VOICES, []); }
export function saveVoices(v: BrandVoice[]) { writeJSON(VOICES, v); }

export function saveVoice(voice: BrandVoice) {
  const all = loadVoices();
  const idx = all.findIndex((v) => v.name === voice.name);
  if (idx !== -1) all[idx] = voice; else all.push(voice);
  saveVoices(all);
}

export function getVoice(name: string): BrandVoice | undefined {
  return loadVoices().find((v) => v.name === name);
}

export function deleteVoice(name: string): boolean {
  const all = loadVoices();
  const filtered = all.filter((v) => v.name !== name);
  if (filtered.length === all.length) return false;
  saveVoices(filtered);
  return true;
}

// ── Config ────────────────────────────────────────────────────────────────────

export function loadConfig(): AppConfig { return readJSON<AppConfig>(CONFIG_F, DEFAULT_CONFIG); }
export function saveConfig(c: AppConfig) { writeJSON(CONFIG_F, c); }
