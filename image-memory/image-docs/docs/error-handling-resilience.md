# Error Handling & System Resilience

Visual processing via VLMs isn't perfect. External APIs fail, images contain corrupt headers, and algorithms hallucinate. NIMS handles these edge cases defensively.

## 1. The Retry Circuit Breaker (VLM)
When communicating with Google Gemini via the `VlmService`:
- Rate limits or `502 Bad Gateway` responses trigger an exponential backoff retry system.
- If the return payload isn't valid JSON, the parser fails gracefully, increases the model temperature, and tries again (max 3 times).
- If all retries fail, the image falls back to a "Degraded State", skipping complex metadata extraction and relying solely on a generic image-to-text semantic embedding.

## 2. Zombie Crops and Disk Sync
If the pipeline decides a person is at `[ymin:10, xmin:20, ymax:40, xmax:50]` but the image is too small to extract a crop, the node process traditionally crashes (e.g., `ENOENT` error). 
- NIMS surrounds all filesystem extraction code in aggressive `try...catch` blocks.
- If an entity crop fails, the overarching image ingestion still succeeds. We simply do not attach an `IdentityProfile` avatar to that relationship graph. 

## 3. Frontend Fallbacks (Next.js)
If the user's connection drops, the frontend maintains a persistent Zustand state of their vault. 
- The Chat Assistant displays an "Offline Memory" indicator, disabling vector search but allowing local querying of previously loaded pages.
- Broken image URLs trigger a React `<Error Boundary>` specific to the Image module, rendering a broken-glass fallback SVG rather than bringing down the entire dashboard.

---

*Documentation Date: 2026-03-19*
