# Vector Search Engine

Semantic memory retrieval in NIMS is powered by high-dimensional vector embeddings, allowing the system to understand the *meaning* of an image rather than just looking at its tags.

## The Semantic Space
Every user query (e.g., "A happy day at the beach") and every image memory is mapped into the same continuous 768-dimensional space using specialized embedding models (e.g., Google Multimodal Embeddings).

### 1. Generating Embeddings
When an image is ingested, the `ImagePipeline` generates its embedding:
```javascript
const embedding = await this.vlmService.generateEmbedding(imageBuffer);
```
This embedding isn't just pixel data; it represents the semantic concepts (sand, joy, sunshine, friends).

### 2. Searching the Vault
When you ask the Neural Assistant a question, your text is also embedded into a vector. We then iterate through the atomic JSON vault:
```javascript
let bestMatches = [];
for (const memory of store.memories) {
  const similarity = cosineSimilarity(queryVector, memory.embedding);
  if (similarity > 0.8) { // Configurable threshold
    bestMatches.push(memory);
  }
}
```

## Why Cosine Similarity?
Unlike calculating standard Euclidean distance, **Cosine Similarity** measures the angle between two vectors. This means the magnitude (or length) of the vector matters less than its direction. It is the industry standard for semantic NLP and computer vision tasks.

## Caching & Speed
To ensure real-time chat responses, NIMS eventually loads all known 768-dim embeddings into RAM at startup. Searching an array of 10,000 vectors takes less than a millisecond in Node.js.

---

*Documentation Date: 2026-03-19*
