# API Reference

The Neural Image Memory System (NIMS) backend provides a RESTful API built with NestJS to interact with memories, identities, and the Neural Assistant.

## Endpoints Overview

### 1. Image Lifecycle

#### `POST /api/images/upload`
Uploads a new image to the memory vault.
- **Request Body:** `multipart/form-data` containing the file under the key `image`.
- **Response:**
  ```json
  {
    "success": true,
    "memoryId": "uuid-v4",
    "status": "processing"
  }
  ```
*Note: Processing is asynchronous due to VLM latency.*

#### `GET /api/images`
Retrieves all memories, paginated.
- **Query Params:** `page`, `limit`
- **Response:** Array of `Memory` objects.

#### `GET /api/images/search`
Performs a semantic vector search.
- **Query Params:** `q` (The text query, e.g., "sunset at the beach")
- **Response:** Array of matched `Memory` objects sorted by cosine similarity.

### 2. Identities & Social Graph

#### `GET /api/identities`
Retrieves all unique individuals tracked by the system.
- **Response:** Array of `Identity` objects including high-resolution crop URLs.

#### `GET /api/identities/:id/relationships`
Retrieves the social graph for a specific identity.
- **Response:**
  ```json
  [
    { "targetId": "uuid-v4", "name": "Jane", "confidence": 0.95, "coAppearanceCount": 12 }
  ]
  ```

### 3. Neural Assistant Configuration

#### `POST /api/chat`
Sends a message to the RAG-enabled memory assistant.
- **Request Body:**
  ```json
  {
    "message": "When was the last time I saw David?",
    "history": []
  }
  ```
- **Response:**
  ```json
  {
    "reply": "You last saw David at the coffee shop on March 14th.",
    "contextImages": ["url1", "url2"]
  }
  ```

---

*Documentation Date: 2026-03-19*
