import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import {
  VlmAnalysis,
  DetectedPerson,
  Relationship,
} from './types/image-memory.types';

/**
 * VlmService wraps the Google Gemini Vision API (gemini-2.5-flash).
 * It is responsible for analysing a single image and returning
 * structured information about the people visible and their relationships.
 */
@Injectable()
export class VlmService {
  private readonly logger = new Logger(VlmService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Analyse an image file and return a fully structured VlmAnalysis object.
   */
  async analyseImage(imagePath: string): Promise<VlmAnalysis> {
    this.logger.log(`Analysing image: ${imagePath}`);

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase().replace('.', '');
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

    const prompt = `You are an expert image analysis system. Analyse this image and return a JSON object with the following structure. Be meticulous about identifying every visible person.

Return ONLY valid JSON, no markdown, no extra text:

{
  "scene": "brief scene description",
  "atmosphere": "e.g. festive, productive, tense, cozy, formal",
  "rawDescription": "detailed paragraph about the image",
  "tags": ["tag1", "tag2"],
  "ocrText": "raw text extracted from any signs, documents, or labels in the image",
  "detectedPeople": [
    {
      "name": "unknown or inferred name if visible e.g. on a badge",
      "descriptors": ["tall", "dark hair", "blue shirt", "glasses"],
      "embedText": "A tall person in their 30s wearing a blue shirt and glasses, with dark curly hair",
      "age": "30-40",
      "gender": "male",
      "mood": "e.g. happy, curious, bored, angry"
    }
  ],
  "relationships": [
    {
      "person1Index": 0,
      "person2Index": 1,
      "relation": "father",
      "confidence": 0.85,
      "evidence": "The older man is holding the child's hand and they share similar facial features"
    }
  ]
}

Guidelines:
- mood should be a single word or short phrase describing the person's expression/emotion.
- atmosphere should describe the overall vibe of the image.
- ocrText should include any visible text, even if small
- person1Index and person2Index refer to array indices in detectedPeople
- Relations can be: father, mother, son, daughter, sibling, brother, sister, grandfather, grandmother, husband, wife, partner, friend, colleague, or unknown
- If no people are visible, return empty arrays
- confidence is between 0 and 1
- descriptors should be detailed enough for re-identification across photos`;

    const result = await this.model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ]);

    const text = result.response.text().trim();

    try {
      // Strip any accidental markdown code fences
      const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      const raw = JSON.parse(clean);

      // Map indexed relationships back to proper person objects
      const people: DetectedPerson[] = (raw.detectedPeople || []).map(
        (p: any) => ({
          personId: '', // assigned later by PersonService
          name: p.name || undefined,
          descriptors: p.descriptors || [],
          embedText: p.embedText || '',
          age: p.age || undefined,
          gender: p.gender || undefined,
          mood: p.mood || undefined,
        }),
      );

      const relationships: Omit<Relationship, 'person1Id' | 'person2Id'>[] = (
        raw.relationships || []
      ).map((r: any) => ({
        person1Index: r.person1Index,
        person2Index: r.person2Index,
        relation: r.relation || 'unknown',
        confidence: r.confidence ?? 0.5,
        evidence: r.evidence || '',
      }));

      return {
        scene: raw.scene || '',
        atmosphere: raw.atmosphere || '',
        rawDescription: raw.rawDescription || '',
        tags: raw.tags || [],
        ocrText: raw.ocrText || '',
        detectedPeople: people,
        relationships: relationships as any, // resolved by PersonService
      };
    } catch (err) {
      this.logger.error(`Failed to parse VLM response: ${text}`, err);
      return {
        scene: 'Parse error',
        rawDescription: text,
        tags: [],
        detectedPeople: [],
        relationships: [],
      };
    }
  }

  /**
   * Ask the VLM a free-form question about the image memory context.
   */
  async queryContext(systemContext: string, userQuery: string): Promise<string> {
    const prompt = `You are an intelligent assistant with access to an image-based memory system.

MEMORY CONTEXT:
${systemContext}

USER QUESTION: ${userQuery}

Answer the question based on the memory context above. Be specific and reference actual people, relationships, and images from the context. If the answer is not in the context, say so clearly.`;

    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}
