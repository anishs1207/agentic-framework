# Backend Architecture: The Nervous System

The backend of the Neural Image Memory System (NIMS) is built using **NestJS**, structured around robust orchestration of data processing pipelines (primarily image parsing, embeddings, and relationship graphs). It operates as the "nervous system", digesting visual data into structured memories.

## Core Modules & Flow
The backend relies on the following key modules:

### 1. The Ingestion Pipeline (`ImagePipeline`)
When a user uploads an image to the system, it enters the `ImagePipeline`. This coordinates the step-by-step conversion of raw bits into semantic knowledge:
- **Image Validation:** Checks format and resolution.
- **Pass 1 - The Scout (`VlmService`):** Fast pass using Gemini Flash to generate a high-level scene description and list of visible entities.
- **Pass 2 - Identity Extraction:** Bounding boxes are generated for detected people. The pipeline creates high-resolution profile crops of these identities.

### 3. The Identity Controller (`PersonService`)
It is not enough to find random faces. The system builds enduring identities across your digital life:
- **Crop Storage:** Profile photos of users are stored for reference.
- **Social Context Matcher:** Compares newly found faces with established identities to perform Person Re-identification.
- **Relationship Map:** If Person A and Person B appear frequently in the same images across varying locales, the backend builds a relational confidence score linking the two.

### 4. The Visual Language Model (`VlmService`)
This system communicates with multi-modal LLMs (specifically Google's Gemini models) using sophisticated prompting techniques. It doesn't just ask "what's in the image?", it prompts for mood, lighting, explicit object taxonomy, and potential hidden contexts.

### 5. Vector Embedding & Search 
- Each image and extracted entity is transformed into a dense vector (e.g., 768-dimensions) representation.
- This allows the Neural Assistant to perform **Semantic Similarity Searches**. Instead of searching for the text string "beach", it searches for the mathematical representation of the concept of a beach.

### 6. Atomic Storage (`ImageMemoryStore`)
Data integrity is paramount. 
- Memories are persisted to flat JSON (`image-memory.json`) using a strict **Write-Then-Rename** pattern. This atomic snapshotting protects against corruption during unexpected crashes or restarts.

## Data Structures
Below is a simplified schema of how the backend understands an image memory:
```json
{
  "id": "12345",
  "path": "/uploads/photo1.jpg",
  "description": "Sunset at the beach with friends",
  "entities": [
    { "id": "person_abc", "name": "John Doe", "boundingBox": [10, 20, 100, 200] }
  ],
  "embeddings": [0.12, -0.45, 0.99]
}
```

*Documentation Date: 2026-03-19*
