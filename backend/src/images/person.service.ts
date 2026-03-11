import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PersonRecord, DetectedPerson, Relationship } from './image-memory.types';

/**
 * PersonService handles cross-image person identity resolution.
 *
 * Strategy: For each newly detected person, compute a similarity score
 * against every existing PersonRecord using descriptor overlap + embedText
 * comparison. If the score exceeds a threshold, merge into the existing
 * person; otherwise create a new PersonRecord.
 *
 * This is intentionally lightweight (no embedding model required) — it
 * uses a keyword-overlap heuristic which works well for text descriptors
 * produced by the VLM (hair colour, clothing, glasses, etc.).
 */
@Injectable()
export class PersonService {
  private readonly logger = new Logger(PersonService.name);
  private readonly MATCH_THRESHOLD = 0.35; // ≥35% descriptor overlap → same person

  /**
   * Given a list of DetectedPerson objects (with empty personIds) and the
   * current people store, resolve identities and return:
   *  - updatedPeople: the mutated store
   *  - resolvedPersonIds: personId assigned to each input person (same order)
   */
  resolvePeople(
    detected: DetectedPerson[],
    existingPeople: Record<string, PersonRecord>,
    imageId: string,
    timestamp: string,
  ): { updatedPeople: Record<string, PersonRecord>; resolvedPersonIds: string[] } {
    const updatedPeople = { ...existingPeople };
    const resolvedPersonIds: string[] = [];

    for (const person of detected) {
      const matchId = this.findBestMatch(person, updatedPeople);

      if (matchId) {
        // Merge into existing record
        const existing = updatedPeople[matchId];
        existing.imageIds = Array.from(new Set([...existing.imageIds, imageId]));
        existing.lastSeen = timestamp;
        // Merge descriptors uniquely
        existing.canonicalDescriptors = Array.from(
          new Set([...existing.canonicalDescriptors, ...person.descriptors]),
        );
        if (person.name && !existing.name) existing.name = person.name;
        if (person.age && !existing.age) existing.age = person.age;
        if (person.gender && !existing.gender) existing.gender = person.gender;

        resolvedPersonIds.push(matchId);
        this.logger.log(`Person matched to existing record ${matchId}`);
      } else {
        // Create new record
        const personId = uuidv4();
        updatedPeople[personId] = {
          personId,
          canonicalDescriptors: [...person.descriptors],
          embedText: person.embedText,
          name: person.name,
          age: person.age,
          gender: person.gender,
          imageIds: [imageId],
          firstSeen: timestamp,
          lastSeen: timestamp,
        };
        resolvedPersonIds.push(personId);
        this.logger.log(`New person created with id ${personId}`);
      }
    }

    return { updatedPeople, resolvedPersonIds };
  }

  /**
   * Resolve raw VLM relationships (which use array indices) into proper
   * person-ID-keyed Relationship objects, deduplicating against existing ones.
   */
  resolveRelationships(
    rawRelationships: any[],
    resolvedPersonIds: string[],
    existingRelationships: Relationship[],
  ): Relationship[] {
    const updated = [...existingRelationships];

    for (const rel of rawRelationships) {
      const p1Id = resolvedPersonIds[rel.person1Index];
      const p2Id = resolvedPersonIds[rel.person2Index];
      if (!p1Id || !p2Id) continue;

      // Check if this relationship already exists
      const alreadyExists = updated.some(
        (r) =>
          ((r.person1Id === p1Id && r.person2Id === p2Id) ||
            (r.person1Id === p2Id && r.person2Id === p1Id)) &&
          r.relation === rel.relation,
      );

      if (!alreadyExists) {
        updated.push({
          person1Id: p1Id,
          person2Id: p2Id,
          relation: rel.relation,
          confidence: rel.confidence,
          evidence: rel.evidence,
        });
      }
    }

    return updated;
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private findBestMatch(
    person: DetectedPerson,
    existing: Record<string, PersonRecord>,
  ): string | null {
    let bestId: string | null = null;
    let bestScore = 0;

    for (const [id, record] of Object.entries(existing)) {
      const score = this.descriptorSimilarity(
        person.descriptors,
        record.canonicalDescriptors,
      );
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    return bestScore >= this.MATCH_THRESHOLD ? bestId : null;
  }

  private descriptorSimilarity(a: string[], b: string[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const setA = new Set(a.map((s) => s.toLowerCase().trim()));
    const setB = new Set(b.map((s) => s.toLowerCase().trim()));
    let overlap = 0;
    for (const token of setA) {
      // partial match: check if any token in B contains this token or vice versa
      for (const t of setB) {
        if (t.includes(token) || token.includes(t)) {
          overlap++;
          break;
        }
      }
    }
    return overlap / Math.max(setA.size, setB.size);
  }
}
