# VLM Prompt Engineering

The accuracy of NIMS heavily relies on how it communicates with multi-modal LLMs (Google Gemini Flash 2.5). We use structured, multi-pass prompting to extract both broad context and granular metadata.

## The Problem with Naive Prompts
If you ask an LLM, "What is in this image?", it might say, "A man at a beach." This is useless for an intelligence system. We need structured, deterministic JSON outputs that include spatial coordinates and specific semantic tags.

## Pass 1: The Scene Analyzer
This prompt is designed to establish the core environment and emotional tone of the memory.

**System Prompt Example:**
```text
You are a highly analytical visual intelligence system. 
Analyze the provided image and return ONLY a valid JSON object. Do not include markdown formatting like ```json.
Analyze for the following keys:
- "scene_description": A poetic but accurate 2-sentence description of the event.
- "time_of_day": (Morning, Afternoon, Evening, Night)
- "environment": (Indoor, Outdoor, Urban, Nature)
- "mood": (Joyful, Melancholic, Chaotic, Serene)
```

## Pass 2: Spatial Entity Extraction
Once the scene is understood, we perform a second pass to isolate identities. We ask the VLM to return normalized bounding boxes `[ymin, xmin, ymax, xmax]`.

**System Prompt Example:**
```text
Identify all human subjects in this image.
For each subject, provide a bounding box using values between 0.0 and 1.0 representing [ymin, xmin, ymax, xmax].
Return a JSON array of objects with keys `id_description` (e.g., "Man in blue shirt") and `box`.
```

## Prompt Resilience
VLMs sometimes hallucinate or fail to return valid JSON. The `VlmService` implements:
1. **JSON Sanitization:** Automatic stripping of markdown backticks or conversational prefixes ("Here is the JSON you requested:").
2. **Retry Logic:** If the JSON parse fails, the service retries up to 3 times with a slightly increased temperature to break deterministic loops.

---

*Documentation Date: 2026-03-19*
