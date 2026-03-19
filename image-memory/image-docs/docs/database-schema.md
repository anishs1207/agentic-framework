# Database Schema: The Atomic Vault

NIMS uses a hybrid storage approach. Heavy blobs (images, crops) are stored on disk, while relational and semantic data is stored in an atomic, file-backed JSON vault (`image-memory.json`).

## The Core JSON Schema

The `image-memory.json` file is structured to balance fast reads with robust data integrity.

### 1. Global State
The root of the file contains arrays for memories and identities:
```typescript
interface ImageMemoryStore {
  version: "1.0";
  memories: Memory[];
  identities: Identity[];
  edges: RelationshipEdge[];
}
```

### 2. The `Memory` Object
A memory represents a single visual ingestion event.
```typescript
interface Memory {
  id: string; // UUID
  originalPath: string; // Path to the raw image upload
  blurhash: string; // Fast-loading visual placeholder
  timestamp: string; // ISO-8601 extraction or upload time
  
  // VLM Outputs
  description: string; // Rich text caption from Gemini
  tags: string[]; // Explicit taxonomy
  
  // Spatial Data
  entities: EntityOccurrence[];
  
  // Semantic Search
  embedding: number[]; // 768-dimensional vector
}
```

### 3. The `Identity` Object
Created when the `Social Context Matcher` stabilizes a recognized person.
```typescript
interface Identity {
  id: string; // UUID
  aliases: string[]; // e.g., ["John", "Brother"]
  profileCropPath: string; // Best available crop
  faceEmbedding: number[]; // Averages of their known faces
}
```

### 4. The `RelationshipEdge` Object
Represents the strength of connections between identities.
```typescript
interface RelationshipEdge {
  sourceId: string;
  targetId: string;
  coAppearanceCount: number;
  confidenceScore: number; // 0.0 to 1.0
  lastSeenTogether: string; // ISO-8601
}
```

## Atomic Safety
We implement a **Write-Then-Rename** strategy to ensure the JSON vault never corrupts during a power loss or crash:
1. Write memory to `image-memory.tmp`
2. `fs.renameSync('image-memory.tmp', 'image-memory.json')` (This POSIX operation is atomic).

---

*Documentation Date: 2026-03-19*
