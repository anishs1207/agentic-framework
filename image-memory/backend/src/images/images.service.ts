import { Injectable, NotFoundException } from '@nestjs/common';
import { ImageMemoryStore } from './image-memory.store';
import { ImagePipeline } from './image.pipeline';
import { VlmService } from './vlm.service';
import { ImageRecord, PersonRecord, Relationship } from './types/image-memory.types';
import * as fs from 'fs';
import * as path from 'path';

import { VectorService } from './vector.service';

@Injectable()
export class ImagesService {
  constructor(
    private readonly store: ImageMemoryStore,
    private readonly pipeline: ImagePipeline,
    private readonly vlm: VlmService,
    private readonly vector: VectorService,
  ) {}

  /**
   * Process a newly uploaded image through the full pipeline.
   */
  async ingestImage(file: Express.Multer.File) {
    const result = await this.pipeline.run(file.path, file.originalname);
    return result;
  }

  // ─── Image endpoints ────────────────────────────────────────────────────

  getAllImages(): ImageRecord[] {
    return this.store.getAllImages();
  }

  getImage(imageId: string): ImageRecord {
    const img = this.store.getImage(imageId);
    if (!img) throw new NotFoundException(`Image ${imageId} not found`);
    return img;
  }

  getImageFile(imageId: string): { path: string; filename: string } {
    const img = this.store.getImage(imageId);
    if (!img) throw new NotFoundException(`Image ${imageId} not found`);
    
    let filePath = img.storagePath;
    // Fallback: if absolute path doesn't exist, try relative to current directory
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'data', 'uploads', path.basename(img.storagePath));
    }

    if (!fs.existsSync(filePath))
      throw new NotFoundException(`Image file not found on disk`);
    
    return { path: filePath, filename: img.filename };
  }

  // ─── People endpoints ───────────────────────────────────────────────────

  getAllPeople(): PersonRecord[] {
    return this.store.getAllPeople();
  }

  getPerson(personId: string): PersonRecord & { images: ImageRecord[] } {
    const person = this.store.getPerson(personId);
    if (!person) throw new NotFoundException(`Person ${personId} not found`);
    const images = person.imageIds
      .map((id) => this.store.getImage(id))
      .filter(Boolean) as ImageRecord[];
    return { ...person, images };
  }

  updatePersonName(personId: string, name: string): PersonRecord {
    const people = this.store.getPeopleStore();
    const person = people[personId];
    if (!person) throw new NotFoundException(`Person ${personId} not found`);
    
    person.name = name;
    this.store.setPeople(people);
    return person;
  }

  // ─── Relationship endpoints ─────────────────────────────────────────────

  getAllRelationships(): Relationship[] {
    return this.store.getAllRelationships();
  }

  getRelationshipsForPerson(personId: string): Relationship[] {
    this.getPerson(personId); // validate existence
    return this.store.getRelationshipsForPerson(personId);
  }

  // ─── Event endpoints ────────────────────────────────────────────────────

  getAllEvents() {
    return this.store.getAllEvents();
  }

  getMoodHistory(personId: string) {
    const person = this.store.getPerson(personId);
    if (!person) throw new NotFoundException(`Person ${personId} not found`);
    return person.moodHistory || [];
  }

  // ─── Memory query endpoint ──────────────────────────────────────────────

  async queryMemory(query: string): Promise<{ answer: string; context: string }> {
    const context = this.store.buildMemoryContext();
    const answer = await this.vlm.queryContext(context, query);
    return { answer, context };
  }

  getStats() {
    const images = this.store.getAllImages();
    const people = this.store.getAllPeople();
    const relationships = this.store.getAllRelationships();
    return {
      totalImages: images.length,
      totalPeople: people.length,
      totalRelationships: relationships.length,
      relationshipBreakdown: this.groupBy(relationships, 'relation'),
    };
  }

  async searchImages(query: string) {
    const queryEmbed = await this.vector.generateEmbedding(query);
    const allImages = this.store.getAllImages();

    const results = allImages
      .filter((img) => img.embedding)
      .map((img) => ({
        ...img,
        score: this.vector.cosineSimilarity(queryEmbed, img.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return results;
  }

  searchByText(text: string) {
    const allImages = this.store.getAllImages();
    const query = text.toLowerCase();

    return allImages.filter(
      (img) =>
        img.analysis.ocrText?.toLowerCase().includes(query) ||
        img.analysis.rawDescription.toLowerCase().includes(query) ||
        img.analysis.tags.some(tag => tag.toLowerCase().includes(query)),
    );
  }

  // ─── Enhanced Features ──────────────────────────────────────────────────

  /**
   * Find images visually similar to a specific image.
   */
  findSimilarImages(imageId: string, limit = 5) {
    const target = this.getImage(imageId);
    if (!target.embedding) {
      return [];
    }

    const allImages = this.store.getAllImages();
    return allImages
      .filter((img) => img.embedding && img.imageId !== imageId)
      .map((img) => ({
        ...img,
        similarity: this.vector.cosineSimilarity(target.embedding!, img.embedding!),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Get filtered images based on various criteria.
   */
  getFilteredImages(filters: {
    personId?: string;
    tag?: string;
    atmosphere?: string;
  }) {
    let images = this.store.getAllImages();

    if (filters.personId) {
      images = images.filter((img) =>
        img.detectedPersonIds.includes(filters.personId!),
      );
    }

    if (filters.tag) {
      const tagLower = filters.tag.toLowerCase();
      images = images.filter((img) =>
        img.analysis.tags.some((t) => t.toLowerCase() === tagLower),
      );
    }

    if (filters.atmosphere) {
      const atmLower = filters.atmosphere.toLowerCase();
      images = images.filter((img) =>
        img.analysis.atmosphere?.toLowerCase().includes(atmLower),
      );
    }

    return images;
  }

  /**
   * Returns images grouped by event, serving as a chronological overview.
   */
  getTimeline() {
    const events = this.store.getAllEvents();
    // Enrich events with their actual image objects
    return events
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .map((ev) => ({
        ...ev,
        images: ev.imageIds
          .map((id) => this.store.getImage(id))
          .filter(Boolean),
      }));
  }

  async clearData() {
    this.store.clear();
    
    const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
    const cropsDir = path.join(process.cwd(), 'data', 'crops');

    // Helper to delete files in a directory
    const cleanDir = (dirPath: string) => {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const fullPath = path.join(dirPath, file);
          if (fs.statSync(fullPath).isFile()) {
            fs.unlinkSync(fullPath);
          }
        }
      }
    };

    cleanDir(uploadsDir);
    cleanDir(cropsDir);
    
    return { message: 'All memory data and files have been cleared.' };
  }

  private groupBy<T>(arr: T[], key: keyof T): Record<string, number> {
    return arr.reduce(
      (acc, item) => {
        const k = String(item[key]);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
