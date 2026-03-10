// ─────────────────────────────────────────────────────────────────────────────
// SocialPilot AI — Main Entry Point
// AI Social Media Manager built in TypeScript on Gemini
// ─────────────────────────────────────────────────────────────────────────────

import "dotenv/config";
import * as readline from "readline";
import inquirer from "inquirer";
import ora from "ora";

import { ContentEngine } from "./core/engine.js";
import {
  loadBundles, createBundle, getBundle, deleteBundle, saveBundle,
  schedulePost, loadQueue, deleteScheduledPost, updatePostStatus,
  loadVoices, saveVoice, deleteVoice, loadConfig, saveConfig,
} from "./core/storage.js";
import { PostScheduler, simulatedPostHandler } from "./scheduler/index.js";
import {
  printBanner, printHelp, printPostCard, printBundleCard,
  printQueue, printStats, section, divider, c,
} from "./cli/ui.js";
import { validatePost, BEST_TIMES, PLATFORM_LIMITS } from "./platforms/formatters.js";
import type { Platform, BrandVoice, Tone } from "./core/types.js";
import { DEFAULT_CONFIG } from "./core/types.js";

// ── Init ───────────────────────────────────────────────────────────────────

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY || API_KEY === "your_gemini_api_key_here") {
  console.log(c.red.bold("\n  ✖  GEMINI_API_KEY is not set!"));
  console.log(c.muted("  Add it to .env  →  GEMINI_API_KEY=your_key\n"));
  process.exit(1);
}

const engine    = new ContentEngine(API_KEY);
const config    = loadConfig();
const scheduler = new PostScheduler(simulatedPostHandler);

// ── Helpers ────────────────────────────────────────────────────────────────

function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((res) => rl.question(prompt, res));
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString();
}

// ── Command handlers ───────────────────────────────────────────────────────

async function cmdGenerate(rl: readline.Interface) {
  // 1. Get the idea
  const idea = (await ask(rl, c.amber.bold("\n  💡  Your content idea:\n  › "))).trim();
  if (!idea) { console.log(c.red("  No idea provided.\n")); return; }

  // 2. Pick platforms
  const { platforms } = await inquirer.prompt<{ platforms: Platform[] }>([{
    type: "checkbox",
    name: "platforms",
    message: "Select platforms:",
    choices: [
      { name: "𝕏  Twitter thread",  value: "twitter",   checked: true },
      { name: "in LinkedIn post",    value: "linkedin",  checked: true },
      { name: "📸 Instagram caption",value: "instagram", checked: true },
    ],
  }]);
  if (platforms.length === 0) { console.log(c.muted("  No platforms selected.\n")); return; }

  // 3. Pick brand voice
  const voices  = loadVoices();
  const voiceChoices = [
    { name: "Default voice", value: "__default" },
    ...voices.map((v) => ({ name: `${v.name} (${v.tone})`, value: v.name })),
  ];
  const { voiceName } = await inquirer.prompt<{ voiceName: string }>([{
    type: "list",
    name: "voiceName",
    message: "Brand voice:",
    choices: voiceChoices,
  }]);

  const voice = voiceName === "__default"
    ? config.defaultVoice
    : voices.find((v) => v.name === voiceName) ?? config.defaultVoice;

  // 4. Generate
  const sp = ora({ text: c.muted("  ✨  Generating content with Gemini…"), color: "magenta", spinner: "dots2" }).start();
  try {
    const partial = await engine.generateBundle(idea, voice, platforms, config.maxThreadLength);
    sp.succeed(c.green("  Content generated!"));

    const bundle = createBundle(partial);

    // 5. Show each post
    section(`Bundle — ${bundle.id}`);
    console.log(c.muted(`  Idea: `) + c.white(idea));
    console.log(c.muted(`  Topics: `) + c.cyan(bundle.topics.join(", ")));

    for (const post of bundle.posts) {
      // Validate
      const warnings = validatePost(post);
      if (warnings.length) {
        warnings.forEach((w) => console.log(c.orange(`  ⚠  ${w}`)));
      }
      printPostCard(post.platform, post.content, post.thread, post.hashtags, post.engagementScore);
    }

    console.log(
      "\n  " + c.green("✔ Saved as bundle: ") + c.amber.bold(bundle.id) +
      c.muted(`  (use /schedule ${bundle.id} to queue posts)\n`)
    );
  } catch (err: any) {
    sp.fail(c.red("  Generation failed"));
    console.log(c.red(`  ${err.message}\n`));
  }
}

async function cmdBundles() {
  const all = loadBundles();
  if (all.length === 0) {
    console.log(c.muted("\n  No bundles yet. Use /generate to create one.\n")); return;
  }
  section(`Content Bundles (${all.length})`);
  for (const b of all) {
    console.log(
      "  " + c.primary.bold(b.id.padEnd(16)) +
      c.muted(new Date(b.createdAt).toLocaleDateString().padEnd(14)) +
      c.white(b.idea.slice(0, 46)) +
      c.muted(` [${b.posts.length} posts]`)
    );
  }
  console.log();
}

async function cmdBundle(id: string) {
  const b = getBundle(id);
  if (!b) { console.log(c.red(`  ✖  Bundle "${id}" not found.\n`)); return; }
  printBundleCard(b);
  for (const post of b.posts) {
    printPostCard(post.platform, post.content, post.thread, post.hashtags, post.engagementScore);
  }
}

async function cmdSchedule(id: string, rl: readline.Interface) {
  const b = getBundle(id);
  if (!b) { console.log(c.red(`  ✖  Bundle "${id}" not found.\n`)); return; }

  section(`Schedule Bundle — ${id}`);

  for (const post of b.posts) {
    const platform = post.platform;
    const bestTimes = BEST_TIMES[platform];

    console.log(c.primary.bold(`\n  ${PLATFORM_LIMITS[platform].label} post:`));
    console.log(c.muted(post.content.slice(0, 80) + "…"));

    const { choice } = await inquirer.prompt<{ choice: string }>([{
      type: "list",
      name: "choice",
      message: `When to post on ${platform}?`,
      choices: [
        ...bestTimes.map((t) => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          const iso = `${d.toISOString().split("T")[0]}T${t}:00`;
          return { name: `Tomorrow ${t}  (${platform} optimal)`, value: iso };
        }),
        { name: "Custom time", value: "__custom" },
        { name: "Skip this platform", value: "__skip" },
      ],
    }]);

    if (choice === "__skip") { console.log(c.muted("  Skipped.")); continue; }

    let scheduledAt = choice;
    if (choice === "__custom") {
      const raw = (await ask(rl, c.muted("  Enter date/time (YYYY-MM-DDTHH:MM:SS): "))).trim();
      scheduledAt = raw || new Date(Date.now() + 3600_000).toISOString();
    }

    const content = post.thread ? post.thread.join("\n\n") : post.content;
    const sp = schedulePost({
      bundleId: id,
      platform,
      content,
      scheduledAt,
      status: "scheduled",
      label: b.idea.slice(0, 20),
    });

    console.log(c.green(`  ✔ Scheduled for ${fmt(sp.scheduledAt)}`));
  }

  console.log();
}

async function cmdRewrite(rl: readline.Interface) {
  const bundles = loadBundles();
  if (bundles.length === 0) { console.log(c.muted("\n  No bundles. Generate content first.\n")); return; }

  const { bundleId } = await inquirer.prompt<{ bundleId: string }>([{
    type: "list",
    name: "bundleId",
    message: "Which bundle?",
    choices: bundles.map((b) => ({ name: `${b.id}  —  ${b.idea.slice(0, 50)}`, value: b.id })),
  }]);

  const bundle = getBundle(bundleId)!;

  const { fromPlatform } = await inquirer.prompt<{ fromPlatform: Platform }>([{
    type: "list",
    name: "fromPlatform",
    message: "Rewrite from:",
    choices: bundle.posts.map((p) => ({ name: PLATFORM_LIMITS[p.platform].label, value: p.platform })),
  }]);

  const remainingPlatforms = (["twitter", "linkedin", "instagram"] as Platform[]).filter((p) => p !== fromPlatform);
  const { toPlatform } = await inquirer.prompt<{ toPlatform: Platform }>([{
    type: "list",
    name: "toPlatform",
    message: "Rewrite to:",
    choices: remainingPlatforms.map((p) => ({ name: PLATFORM_LIMITS[p].label, value: p })),
  }]);

  const sourcePost = bundle.posts.find((p) => p.platform === fromPlatform)!;
  const sp = ora({ text: c.muted(`  Rewriting for ${toPlatform}…`), color: "magenta", spinner: "dots2" }).start();

  try {
    const rewritten = await engine.rewriteForPlatform(
      sourcePost.content, fromPlatform, toPlatform, bundle.voice
    );
    sp.succeed(c.green("  Rewritten!"));
    printPostCard(toPlatform, rewritten.content, rewritten.thread, rewritten.hashtags, rewritten.engagementScore);

    // Ask to add to bundle
    const { save } = await inquirer.prompt<{ save: boolean }>([{
      type: "confirm", name: "save", message: "Add this to the bundle?", default: true,
    }]);
    if (save) {
      bundle.posts = bundle.posts.filter((p) => p.platform !== toPlatform);
      bundle.posts.push(rewritten);
      saveBundle(bundle);
      console.log(c.green("  ✔ Added to bundle.\n"));
    }
  } catch (err: any) {
    sp.fail(); console.log(c.red(`  ✖ ${err.message}\n`));
  }
}

async function cmdVoiceCreate(rl: readline.Interface) {
  section("Create Brand Voice");

  const { name, tone, emojis, hashtags, keywords, avoid, custom } = await inquirer.prompt<{
    name: string; tone: Tone; emojis: boolean; hashtags: boolean;
    keywords: string; avoid: string; custom: string;
  }>([
    { type: "input",   name: "name",     message: "Voice name:" },
    { type: "list",    name: "tone",     message: "Tone:", choices: ["professional","casual","humorous","inspirational","educational"] },
    { type: "confirm", name: "emojis",   message: "Use emojis?",    default: true },
    { type: "confirm", name: "hashtags", message: "Use hashtags?",  default: true },
    { type: "input",   name: "keywords", message: "Keywords to include (comma-separated, or blank):", default: "" },
    { type: "input",   name: "avoid",    message: "Words/phrases to avoid (comma-separated, or blank):", default: "" },
    { type: "input",   name: "custom",   message: "Any custom AI instructions (or blank):", default: "" },
  ]);

  if (!name) { console.log(c.red("  Name required.\n")); return; }

  const voice: BrandVoice = {
    name,
    tone,
    useEmojis: emojis,
    useHashtags: hashtags,
    includeKeywords: keywords ? keywords.split(",").map((k: string) => k.trim()) : [],
    avoidKeywords: avoid   ? avoid.split(",").map((k: string) => k.trim())   : [],
    customInstructions: custom,
  };

  saveVoice(voice);
  console.log(c.green(`\n  ✔ Brand voice "${name}" saved!\n`));
}

async function cmdVoices() {
  const voices = loadVoices();
  if (voices.length === 0) {
    console.log(c.muted("\n  No custom voices. Use /voice-create to add one.\n")); return;
  }
  section("Brand Voices");
  for (const v of voices) {
    console.log(
      "  " + c.primary.bold(v.name.padEnd(20)) +
      c.amber(v.tone.padEnd(16)) +
      c.muted(`emojis:${v.useEmojis ? "✔" : "✘"}  hashtags:${v.useHashtags ? "✔" : "✘"}`)
    );
    if (v.customInstructions) console.log("    " + c.muted(v.customInstructions.slice(0, 60)));
  }
  console.log();
}

// ── Main REPL ──────────────────────────────────────────────────────────────

async function main() {
  printBanner();
  scheduler.start();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(
    "\n  " + c.muted("Type ") + c.amber.bold("/generate") + c.muted(" to create your first post bundle, or ") +
    c.amber.bold("/help") + c.muted(" to see all commands.\n")
  );

  while (true) {
    const queueCount = loadQueue().filter((p) => p.status === "scheduled").length;
    const pill = queueCount > 0 ? c.cyan(`[${queueCount} queued]`) + " " : "";

    const prompt =
      c.primary.bold("❯ ") +
      c.white.bold("SocialPilot") +
      " " + pill +
      c.primary(" › ");

    const raw = await ask(rl, prompt);
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s+/);
    const cmd   = parts[0].toLowerCase();
    const args  = parts.slice(1);

    // ── /exit ──────────────────────────────────────────────────────────────
    if (cmd === "/exit" || cmd === "/quit") {
      scheduler.stop();
      console.log("\n" + c.green("  👋  See you next time!\n"));
      rl.close();
      process.exit(0);
    }

    // ── /help ──────────────────────────────────────────────────────────────
    if (cmd === "/help") { printHelp(); continue; }

    // ── /generate ──────────────────────────────────────────────────────────
    if (cmd === "/generate") { await cmdGenerate(rl); continue; }

    // ── /bundles ───────────────────────────────────────────────────────────
    if (cmd === "/bundles") { await cmdBundles(); continue; }

    // ── /bundle <id> ────────────────────────────────────────────────────────
    if (cmd === "/bundle") {
      if (!args[0]) { console.log(c.muted("  Usage: /bundle <id>\n")); continue; }
      await cmdBundle(args[0]);
      continue;
    }

    // ── /schedule <id> ──────────────────────────────────────────────────────
    if (cmd === "/schedule") {
      if (!args[0]) {
        // List bundles to pick from
        const all = loadBundles();
        if (all.length === 0) { console.log(c.muted("  No bundles yet.\n")); continue; }
        const { id } = await inquirer.prompt<{ id: string }>([{
          type: "list", name: "id", message: "Which bundle to schedule?",
          choices: all.map((b) => ({ name: `${b.id}  ${b.idea.slice(0, 50)}`, value: b.id })),
        }]);
        await cmdSchedule(id, rl);
      } else {
        await cmdSchedule(args[0], rl);
      }
      continue;
    }

    // ── /queue ──────────────────────────────────────────────────────────────
    if (cmd === "/queue") {
      const filter = args[0] as any;
      const all    = loadQueue();
      const posts  = filter ? all.filter((p) => p.status === filter || p.platform === filter) : all;
      printQueue(posts);
      continue;
    }

    // ── /delete <id> ─────────────────────────────────────────────────────────
    if (cmd === "/delete") {
      if (!args[0]) { console.log(c.muted("  Usage: /delete <bundle-id>\n")); continue; }
      const ok = deleteBundle(args[0]);
      console.log(ok ? c.green(`  ✔ Bundle deleted.\n`) : c.red(`  ✖ Not found.\n`));
      continue;
    }

    // ── /rewrite ────────────────────────────────────────────────────────────
    if (cmd === "/rewrite") { await cmdRewrite(rl); continue; }

    // ── /voices ─────────────────────────────────────────────────────────────
    if (cmd === "/voices") { await cmdVoices(); continue; }

    // ── /voice-create ────────────────────────────────────────────────────────
    if (cmd === "/voice-create") { await cmdVoiceCreate(rl); continue; }

    // ── /voice-delete <name> ────────────────────────────────────────────────
    if (cmd === "/voice-delete") {
      if (!args[0]) { console.log(c.muted("  Usage: /voice-delete <name>\n")); continue; }
      const ok = deleteVoice(args.join(" "));
      console.log(ok ? c.green(`  ✔ Voice deleted.\n`) : c.red(`  ✖ Not found.\n`));
      continue;
    }

    // ── /stats ──────────────────────────────────────────────────────────────
    if (cmd === "/stats") {
      const st = new PostScheduler(simulatedPostHandler).stats();
      printStats(st, loadBundles().length);
      continue;
    }

    // ── Unknown ──────────────────────────────────────────────────────────────
    console.log(c.red(`\n  ✖  Unknown command: ${cmd}`) + c.muted("  (type /help)\n"));
  }
}

main().catch((err) => {
  console.error(c.red("Fatal: " + err.message));
  process.exit(1);
});
