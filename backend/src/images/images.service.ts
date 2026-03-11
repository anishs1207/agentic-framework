import { Injectable, NotFoundException } from '@nestjs/common';
import { ImageMemoryStore } from './image-memory.store';
import { ImagePipeline } from './image.pipeline';
import { VlmService } from './vlm.service';
import { ImageRecord, PersonRecord, Relationship } from './image-memory.types';
import * as fs from 'fs';

@Injectable()
export class ImagesService {
  constructor(
    private readonly store: ImageMemoryStore,
    private readonly pipeline: ImagePipeline,
    private readonly vlm: VlmService,
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
    if (!fs.existsSync(img.storagePath))
      throw new NotFoundException(`Image file not found on disk`);
    return { path: img.storagePath, filename: img.filename };
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

  // ─── Relationship endpoints ─────────────────────────────────────────────

  getAllRelationships(): Relationship[] {
    return this.store.getAllRelationships();
  }

  getRelationshipsForPerson(personId: string): Relationship[] {
    this.getPerson(personId); // validate existence
    return this.store.getRelationshipsForPerson(personId);
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
