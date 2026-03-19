# Future Roadmap

The current version of NIMS lays the groundwork for personal visual intelligence. Future expansion involves multi-modality and predictive AI behaviors.

## Phase 1: Temporal Audio Integration (Memory Tapes)
- Adding the ability to attach voice recordings to specific memory nodes.
- When an image is fetched, an audio context (recorded later or during the event) can be played, bringing a multi-sensory dimension to the Memory Vault.

## Phase 2: Predictive Chronology Model
- Currently, NIMS answers "What happened in the past?". 
- Next, we will ingest temporal location data (EXIF location + time of day) along with the visual vector to predict *future* states. e.g., "Where will John likely be next Friday night based on historical photos?"

## Phase 3: The Neural Journal Export (PDF)
- Users will be able to export a completely automated, poetic "Life Book". 
- NIMS will cluster highly-rated images by temporal seasons, ask the Gemini VLM to synthesize a narrative chapter connecting them, and compile a LaTeX-formatted PDF complete with embedded identity avatars and relationship maps.

## Phase 4: Local VLM (Zero-Cloud Mode)
- Moving away from dependence on Google Gemini APIs toward open-source locally hosted multi-modal models (e.g., LLaVA or smaller param variants).
- Ensuring 100% data privacy where no pixel ever leaves the user's local silicon.

---

*Documentation Date: 2026-03-19*
