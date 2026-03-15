# Backend - Image Memory API

This is the backend service for the **Agentic Framework**, providing an intelligent **Image Memory System**. Built with NestJS, Prisma, and PostgreSQL, this system leverages Google's Vision-Language Model (VLM) to analyze, index, and organize uploaded images.

## Features

- **Image Ingestion & Analysis**: Upload images and automatically extract metadata, a scene description, tags, and OCR text using Google Generative AI.
- **Person Identification**: Detects and identifies individuals across multiple images, keeping track of their first and last seen timestamps, approximate age, and gender.
- **Relationship Extraction**: Uses VLM to infer and document relationships between different people in the same image (e.g., family, friends, colleagues) along with confidence scores and textual evidence.
- **Natural Language Query**: Query the image memory using natural language to find specific photos, scenes, or people based on the stored analytical data.
- **Structured Database**: Uses Prisma to map relational data for Images, People, and intricate Relationships spanning multiple photos.

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Database**: PostgreSQL
- **ORM**: Prisma Client
- **AI Integration**: `@google/generative-ai` (Gemini VLM)
- **Language**: TypeScript

## Prerequisites

- Node.js (v20+ recommended)
- PostgreSQL database
- Google Gemini API Key

## Setup & Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file based on `.env.sample`. You will need:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/db_name?schema=public"
   PORT=3001
   GEMINI_API_KEY="your-google-gemini-api-key"
   ```

3. **Database Migration:**
   Run the Prisma migration to set up your PostgreSQL schemas:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

## Running the Application

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## API Endpoints

Once running, the API typically listens on `http://localhost:3001` (or your configured `PORT`).

### Images & Ingestion
- `POST /images/upload` - Upload an image (multipart/form-data) to be processed and ingested.
- `GET /images` - Retrieve the list of all ingested images, along with associated tags, people, and scene descriptions.
- STATIC FILES: Served locally at `/static` pointing to the `data/uploads` directory.

### People & Entities
- `GET /images/people/all` - List all unique individuals identified across the ingested images, including their canonical descriptors.
- `GET /images/relationships/all` - List all mapped out relationships between individuals.

### Querying
- `POST /backend/query` - Allows querying the extensive image memory using natural language prompts.

## License

This project is licensed under the MIT License.
