import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.model.embedContent(text);
      return result.embedding.values;
    } catch (err) {
      this.logger.error(`Failed to generate embedding: ${err.message}`);
      return [];
    }
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
