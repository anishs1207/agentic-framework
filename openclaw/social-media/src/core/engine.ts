// ─────────────────────────────────────────────────────────────────────────────
// AI Content Engine — Gemini-powered post generation
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BrandVoice, GeneratedPost, Platform, ContentBundle } from "./types.js";

export class ContentEngine {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, model = "gemini-2.5-flash") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = model;
  }

  private model() {
    return this.genAI.getGenerativeModel({ model: this.modelName });
  }

  private voiceInstructions(voice: BrandVoice): string {
    const parts: string[] = [`Tone: ${voice.tone}`];
    if (voice.name !== "Default") parts.push(`Brand: ${voice.name}`);
    if (voice.includeKeywords.length) parts.push(`Always include: ${voice.includeKeywords.join(", ")}`);
    if (voice.avoidKeywords.length) parts.push(`Never say: ${voice.avoidKeywords.join(", ")}`);
    if (!voice.useEmojis) parts.push("No emojis");
    if (!voice.useHashtags) parts.push("No hashtags");
    if (voice.customInstructions) parts.push(voice.customInstructions);
    return parts.join(". ");
  }

  // ── Generate a full Twitter thread ────────────────────────────────────────

  async generateTwitterThread(idea: string, voice: BrandVoice, maxTweets = 8): Promise<GeneratedPost> {
    const prompt = `
You are an expert Twitter/X content strategist. 
Write a compelling Twitter thread about: "${idea}"

Brand instructions: ${this.voiceInstructions(voice)}

Rules:
- Start with a HOOK tweet that makes people stop scrolling (max 240 chars)
- Each tweet max 280 chars
- ${maxTweets} tweets total maximum
- Number each tweet: "1/", "2/" etc
- End with a strong CTA tweet
- ${voice.useHashtags ? "Add 3-5 relevant hashtags to the LAST tweet only" : "No hashtags"}
- ${voice.useEmojis ? "Use emojis strategically (1-2 per tweet)" : "No emojis"}

Return ONLY a JSON object with this shape (no markdown, no explanation):
{
  "thread": ["tweet1 text", "tweet2 text", ...],
  "hashtags": ["#tag1", "#tag2"],
  "hookScore": 8
}`.trim();

    const result = await this.model().generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, "").trim();

    let parsed: { thread: string[]; hashtags: string[]; hookScore: number };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Fallback: split by newlines
      const lines = raw.split("\n").filter((l) => l.trim());
      parsed = { thread: lines.slice(0, maxTweets), hashtags: [], hookScore: 5 };
    }

    const fullText = parsed.thread.join("\n\n");
    return {
      platform: "twitter",
      content: parsed.thread[0], // hook tweet
      thread: parsed.thread,
      hashtags: parsed.hashtags ?? [],
      characterCount: fullText.length,
      engagementScore: parsed.hookScore,
    };
  }

  // ── Generate a LinkedIn post ───────────────────────────────────────────────

  async generateLinkedInPost(idea: string, voice: BrandVoice): Promise<GeneratedPost> {
    const prompt = `
You are a top LinkedIn content creator. Write a high-performing LinkedIn post about: "${idea}"

Brand instructions: ${this.voiceInstructions(voice)}

Rules:
- Start with a single SHORT powerful opening line (no more than 10 words) to hook readers
- Use line breaks generously — LinkedIn rewards white space
- 150–300 words total
- Include a personal angle or insight (first person is fine)
- End with a question to drive comments
- ${voice.useHashtags ? "Add 3-5 industry hashtags at the bottom" : "No hashtags"}
- ${voice.useEmojis ? "Use emojis sparingly as bullet bullets" : "No emojis"}

Return ONLY a JSON object (no markdown):
{
  "content": "full post text here",
  "hashtags": ["#tag1"],
  "engagementScore": 8
}`.trim();

    const result = await this.model().generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, "").trim();

    let parsed: { content: string; hashtags: string[]; engagementScore: number };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { content: raw, hashtags: [], engagementScore: 5 };
    }

    return {
      platform: "linkedin",
      content: parsed.content,
      hashtags: parsed.hashtags ?? [],
      characterCount: parsed.content.length,
      engagementScore: parsed.engagementScore,
    };
  }

  // ── Generate an Instagram caption ─────────────────────────────────────────

  async generateInstagramCaption(idea: string, voice: BrandVoice): Promise<GeneratedPost> {
    const prompt = `
You are an Instagram content expert. Write an engaging Instagram caption about: "${idea}"

Brand instructions: ${this.voiceInstructions(voice)}

Rules:
- First line is the HOOK (shown before "more" — max 125 chars, no period)
- Full caption 100–200 words
- ${voice.useEmojis ? "Use emojis throughout — Instagram audiences love them" : "Minimal emojis"}
- Include a clear CTA (save this, share with a friend, comment below, etc.)
- ${voice.useHashtags ? "Add 20-25 relevant hashtags in a separate block after 3 line breaks" : "No hashtags"}

Return ONLY a JSON object (no markdown):
{
  "content": "full caption including hashtags",
  "hashtags": ["#tag1", "#tag2"],
  "engagementScore": 9
}`.trim();

    const result = await this.model().generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, "").trim();

    let parsed: { content: string; hashtags: string[]; engagementScore: number };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { content: raw, hashtags: [], engagementScore: 5 };
    }

    return {
      platform: "instagram",
      content: parsed.content,
      hashtags: parsed.hashtags ?? [],
      characterCount: parsed.content.length,
      engagementScore: parsed.engagementScore,
    };
  }

  // ── Rewrite existing post for different platform ───────────────────────────

  async rewriteForPlatform(
    content: string,
    fromPlatform: Platform,
    toPlatform: Platform,
    voice: BrandVoice
  ): Promise<GeneratedPost> {
    const prompt = `
Rewrite the following ${fromPlatform} post for ${toPlatform}.
Brand instructions: ${this.voiceInstructions(voice)}

Original content:
"""
${content}
"""

Adapt the format, length, and style to ${toPlatform} best practices. 
Return ONLY JSON (no markdown):
{
  "content": "adapted post text",
  "hashtags": ["#tag"],
  "engagementScore": 7
}`.trim();

    const result = await this.model().generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, "").trim();

    let parsed: { content: string; hashtags: string[]; engagementScore: number };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { content: raw, hashtags: [], engagementScore: 5 };
    }

    return {
      platform: toPlatform,
      content: parsed.content,
      hashtags: parsed.hashtags ?? [],
      characterCount: parsed.content.length,
      engagementScore: parsed.engagementScore,
    };
  }

  // ── Extract topic tags from idea ───────────────────────────────────────────

  async extractTopics(idea: string): Promise<string[]> {
    const prompt = `Extract 3-5 short topic tags for this social media idea: "${idea}"
Return ONLY a JSON array of strings, e.g. ["AI", "productivity", "startups"]`;
    const result = await this.model().generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, "").trim();
    try { return JSON.parse(raw); } catch { return []; }
  }

  // ── Suggest best time slots ────────────────────────────────────────────────

  async suggestPostTimes(platform: Platform, timezone: string): Promise<string[]> {
    const prompt = `What are the 3 best times to post on ${platform} for maximum engagement in the ${timezone} timezone?
Return ONLY a JSON array of ISO datetime strings for tomorrow, e.g. ["2026-03-09T09:00:00", ...]`;
    const result = await this.model().generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, "").trim();
    try { return JSON.parse(raw); } catch {
      // Sensible defaults
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const base = tomorrow.toISOString().split("T")[0];
      return [`${base}T09:00:00`, `${base}T13:00:00`, `${base}T17:00:00`];
    }
  }

  // ── Full bundle generation ─────────────────────────────────────────────────

  async generateBundle(
    idea: string,
    voice: BrandVoice,
    platforms: Platform[],
    maxTweets = 8
  ): Promise<Omit<ContentBundle, "id" | "createdAt">> {
    const [posts, topics] = await Promise.all([
      Promise.all(
        platforms.map((p) => {
          if (p === "twitter") return this.generateTwitterThread(idea, voice, maxTweets);
          if (p === "linkedin") return this.generateLinkedInPost(idea, voice);
          return this.generateInstagramCaption(idea, voice);
        })
      ),
      this.extractTopics(idea),
    ]);

    return { idea, voice, posts, topics };
  }
}
