# Testing Strategy

Ensuring the Neural Image Memory System works flawlessly is critical because the data involves high-latency, multi-stage LLM pipelines.

## 1. Backend Unit Testing (Jest)
- NestJS providers (like the `PersonService` and `ImageMemoryStore`) have isolated unit tests ensuring complex algorithms evaluate correctly without needing actual images.
- We mock the `VlmService` (which normally hits the real Gemini API) to return deterministic JSON results during the tests. 
- Example: Tests confirm that the write-then-rename function won't corrupt the vault if it receives a `null` memory list.

## 2. Integration / E2E Scripts
Because NIMS orchestrates file-system operations and REST calls:
- The backend contains a custom E2E Node.js script: `test_all_apis.js`.
- This script sequentially:
  1. Uploads a fake image payload.
  2. Verifies the status endpoint.
  3. Checks if the `data/` and `uploads/crops` directories were properly updated.
  4. Runs a mock search.
  
## 3. Frontend Component Tests
In Next.js, we utilize React Testing Library and Cypress.
- We simulate the complex Intersection Observer inside `MemoryCard.tsx` to verify that `blurhashes` swap to real images correctly upon scroll.
- Cypress is used for end-to-end verification of the RAG Chat stream, confirming that when a mock chunked SSE response arrives, the chat bubbles animate and render correctly without crashing the UI.

---

*Documentation Date: 2026-03-19*
