// ─────────────────────────────────────────────────────────────────────────────
// Types — shared across the whole app
// ─────────────────────────────────────────────────────────────────────────────

export type Platform = "twitter" | "linkedin" | "instagram";
export type Tone = "professional" | "casual" | "humorous" | "inspirational" | "educational";
export type PostStatus = "draft" | "scheduled" | "posted" | "failed";

export interface BrandVoice {
  name: string;
  tone: Tone;
  /** Keywords / phrases to always include or avoid */
  includeKeywords: string[];
  avoidKeywords: string[];
  /** Custom instructions for the AI */
  customInstructions: string;
  /** Emojis allowed? */
  useEmojis: boolean;
  /** Include hashtags? */
  useHashtags: boolean;
}

export interface GeneratedPost {
  platform: Platform;
  content: string;
  /** For Twitter — split into thread parts */
  thread?: string[];
  hashtags: string[];
  characterCount: number;
  /** Rough engagement score predicted (0–10) */
  engagementScore?: number;
}

export interface ContentBundle {
  id: string;
  idea: string;
  createdAt: string;
  voice: BrandVoice;
  posts: GeneratedPost[];
  /** Optional AI-generated topic tags */
  topics: string[];
}

export interface ScheduledPost {
  id: string;
  bundleId: string;
  platform: Platform;
  content: string;
  scheduledAt: string;       // ISO string
  status: PostStatus;
  postedAt?: string;
  error?: string;
  /** Human-readable label */
  label: string;
}

export interface AppConfig {
  defaultVoice: BrandVoice;
  timezone: string;
  maxThreadLength: number;    // max tweets in a Twitter thread
  defaultPlatforms: Platform[];
}

export const DEFAULT_CONFIG: AppConfig = {
  defaultVoice: {
    name: "Default",
    tone: "professional",
    includeKeywords: [],
    avoidKeywords: [],
    customInstructions: "",
    useEmojis: true,
    useHashtags: true,
  },
  timezone: "UTC",
  maxThreadLength: 10,
  defaultPlatforms: ["twitter", "linkedin", "instagram"],
};
