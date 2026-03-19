# Deployment Guide

Deploying the Neural Image Memory System requires setting up both the NestJS backend and the Next.js frontend, alongside securing API keys for Google Gemini.

## Prerequisites
- Node.js (v18 or higher recommended)
- Google Cloud account with Gemini API access enabled
- PM2 (optional, for persistent process management)

## 1. Environment Configurations

### Backend (`/backend/.env`)
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Storage
DATA_DIR=./data
UPLOADS_DIR=./uploads

# AI Models
GEMINI_API_KEY=your_gemini_key_here
```

### Frontend (`/frontend/.env.local`)
```env
# API Binding
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Client Configuration
NEXT_PUBLIC_THEME_DEFAULT=dark
```

## 2. Deploying the Backend (NestJS)

1. Navigate to the `/backend` directory.
2. Install dependencies: `npm ci`
3. Build the application: `npm run build`
4. Start the server using PM2 for resilience:
   ```bash
   pm2 start dist/main.js --name "nims-backend"
   ```

## 3. Deploying the Frontend (Next.js)

1. Navigate to the `/frontend` directory.
2. Install dependencies: `npm ci`
3. Build the Next.js optimized production bundle: `npm run build`
4. Start the frontend server:
   ```bash
   pm2 start npm --name "nims-frontend" -- start
   ```

## 4. Volume Persistence
Ensure that the path defined in `DATA_DIR` and `UPLOADS_DIR` on the backend are mapped to stable, persistent storage. The `image-memory.json` vault and the `crops/` directory must not be wiped during container restarts if using Docker.

---

*Documentation Date: 2026-03-19*
