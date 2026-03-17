# System Architecture

The Neural Image Memory System (NIMS) is a full-stack, distributed intelligence platform built for high-accuracy visual analysis and conversational recall.

## High-Level Flow

1.  **Ingestion Layer**: A React/Next.js frontend coordinates uploads to a NestJS backend.
2.  **Analysis Layer**: Images are processed through a Multi-Pass VLM (Google Gemini 2.5 Flash) and a Vector Embedding service.
3.  **Intelligence Layer**: A Social Consensus Model resolves identities and build-up relationship proof.
4.  **Recall Layer**: A Neural Assistant provides RAG-based (Retrieval-Augmented Generation) conversational access to the memory store.

---

## Backend (NestJS)

The backend is a set of orchestrated services designed for resilience and accuracy:

-   **`ImagePipeline`**: The primary orchestrator for ingestion. It directs the flow from raw image to structured knowledge.
-   **`VlmService`**: Wraps the Gemini API, performing both wide-angle scene analysis and targeted high-res identity crops.
-   **`PersonService`**: Implements the **Social Context Matcher** and **Relationship Consensus** engine.
-   **`ImageMemoryStore`**: An atomic, file-backed vault that ensures persistence through Write-Then-Rename (Atomic Snapshotting).
-   **`HighlightService`**: Synthesizes narratives and poetic vignettes from raw image data.
-   **`JournalService`**: Clusters temporal images into "Neural Journals" for easy storytelling.

## Frontend (Next.js)

The frontend is a modern, glassmorphic dashboard built with React and TailwindCSS (or Vanilla CSS for maximum control):

-   **Memory Vault (Gallery)**: A filtered view of all visual assets.
-   **Identity Explorer**: A deep view into the people and relationships in your life.
-   **Neural Assistant (Chat)**: A conversation bubble interface for multi-turn dialogues with your visual brain.
-   **Theme Engine**: Dynamically adapts the interface's accent colors based on the most recently uploaded or viewed memory.

## Data Layer

-   **Primary Vault**: `image-memory.json` (Atomic storage)
-   **Visual Assets**: Original images + High-res identity crops.
-   **Vector Space**: 768-dimensional embeddings for all people and images, enabling semantic search and similarity matching.

---

*Documentation Date: 2026-03-17*
