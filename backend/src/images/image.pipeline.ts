import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { VlmService } from './vlm.service';
import { PersonService } from './person.service';
import { ImageMemoryStore } from './image-memory.store';
import { ImageRecord } from './image-memory.types';

export interface PipelineResult {
  imageId: string;
  filename: string;
  scene: string;
  detectedPeopleCount: number;
  newPeopleCount: number;
  matchedPeopleCount: number;
  relationshipsExtracted: number;
  tags: string[];
  detectedPersonIds: string[];
}

/**
 * ImagePipeline orchestrates the full image ingestion flow:
 *
 *   [Upload] → [VLM Analysis] → [Person Resolution] → [Relationship Extraction] → [Store]
 *
 * Each stage is a discrete step, making it easy to swap out individual components.
 */
@Injectable()
export class ImagePipeline {
  private readonly logger = new Logger(ImagePipeline.name);

  constructor(
    private readonly vlm: VlmService,
    private readonly personService: PersonService,
    private readonly store: ImageMemoryStore,
  ) {}

  async run(
    filePath: string,
    filename: string,
  ): Promise<PipelineResult> {
    const imageId = uuidv4();
    const timestamp = new Date().toISOString();

    this.logger.log(`[Pipeline] START  imageId=${imageId} file=${filename}`);

    // ── Stage 1: VLM Analysis ─────────────────────────────────────────────
    this.logger.log(`[Pipeline] Stage 1: VLM analysis`);
    const analysis = await this.vlm.analyseImage(filePath);
    this.logger.log(
      `[Pipeline] VLM detected ${analysis.detectedPeople.length} people, ` +
        `${analysis.relationships.length} raw relationships`,
    );

    // ── Stage 2: Person Resolution ────────────────────────────────────────
    this.logger.log(`[Pipeline] Stage 2: Person resolution`);
    const existingPeople = this.store.getPeopleStore();
    const beforeCount = Object.keys(existingPeople).length;

    const { updatedPeople, resolvedPersonIds } =
      this.personService.resolvePeople(
        analysis.detectedPeople,
        existingPeople,
        imageId,
        timestamp,
      );

    const afterCount = Object.keys(updatedPeople).length;
    const newPeopleCount = afterCount - beforeCount;
    const matchedPeopleCount = analysis.detectedPeople.length - newPeopleCount;

    // Update person store
    this.store.setPeople(updatedPeople);

    // ── Stage 3: Relationship Extraction ──────────────────────────────────
    this.logger.log(`[Pipeline] Stage 3: Relationship extraction`);
    const existingRels = this.store.getAllRelationships();
    const updatedRels = this.personService.resolveRelationships(
      analysis.relationships as any,
      resolvedPersonIds,
      existingRels,
    );
    this.store.setRelationships(updatedRels);
    const newRelsCount = updatedRels.length - existingRels.length;

    // ── Stage 4: Persist Image Record ─────────────────────────────────────
    this.logger.log(`[Pipeline] Stage 4: Persisting image record`);
    const imageRecord: ImageRecord = {
      imageId,
      filename,
      storagePath: filePath,
      uploadedAt: timestamp,
      analysis: {
        ...analysis,
        detectedPeople: analysis.detectedPeople.map((p, i) => ({
          ...p,
          personId: resolvedPersonIds[i],
        })),
      },
      detectedPersonIds: resolvedPersonIds,
    };
    this.store.setImage(imageRecord);

    this.logger.log(
      `[Pipeline] DONE  imageId=${imageId} ` +
        `newPeople=${newPeopleCount} matchedPeople=${matchedPeopleCount} newRels=${newRelsCount}`,
    );

    return {
      imageId,
      filename,
      scene: analysis.scene,
      detectedPeopleCount: analysis.detectedPeople.length,
      newPeopleCount,
      matchedPeopleCount,
      relationshipsExtracted: newRelsCount,
      tags: analysis.tags,
      detectedPersonIds: resolvedPersonIds,
    };
  }
}
