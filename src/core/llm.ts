import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger.js";

// LLM Configuration 
export interface LLMConfig {
  apiKey: string;
  modelName?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  temperature?: number;
  maxOutputTokens?: number;
}

// LLM Wrapper with Retry Logic
export class LLM {
  private model: any;
  private maxRetries: number;
  private retryDelayMs: number;
  modelName: string;

  constructor(config: LLMConfig) {
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelayMs = config.retryDelayMs ?? 2000;
    this.modelName = config.modelName ?? "gemini-2.5-flash";

    const genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxOutputTokens ?? 2048,
      },
    });
  }

  async generate(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        const response = result.response;
        return response.text();
      } catch (error: any) {
        lastError = error;

        // Don't retry on auth errors
        if (error.status === 401 || error.status === 403) {
          throw error;
        }

        if (attempt < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1); // exponential backoff
          logger.retry(attempt, this.maxRetries, error.message?.slice(0, 80) || "Unknown error");
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error("LLM generation failed after retries");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
