export interface DetectedPerson {
  personId: string;           // auto-assigned stable ID
  name?: string;              // if the VLM can infer a name or label
  descriptors: string[];      // visual features for re-identification
  embedText: string;          // prose summary used for fuzzy matching
  age?: string;               // estimated age range e.g. "30-40"
  gender?: string;
}

export interface Relationship {
  person1Id: string;
  person2Id: string;
  relation: string;           // e.g. "father", "daughter", "sibling"
  confidence: number;         // 0-1
  evidence: string;           // reasoning from VLM
}

export interface ImageRecord {
  imageId: string;
  filename: string;
  storagePath: string;
  uploadedAt: string;
  analysis: VlmAnalysis;
  detectedPersonIds: string[];
}

export interface VlmAnalysis {
  scene: string;
  detectedPeople: DetectedPerson[];
  relationships: Relationship[];
  rawDescription: string;
  tags: string[];
}

export interface PersonRecord {
  personId: string;
  canonicalDescriptors: string[];
  embedText: string;
  name?: string;
  age?: string;
  gender?: string;
  imageIds: string[];         // all images this person appears in
  firstSeen: string;
  lastSeen: string;
}

export interface MemoryStore {
  images: Record<string, ImageRecord>;
  people: Record<string, PersonRecord>;
  relationships: Relationship[];
}
