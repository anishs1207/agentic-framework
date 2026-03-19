# Authentication & Security

NIMS is designed as a personal, single-tenant, offline-first digital brain. However, as it moves toward multi-tenant or cloud deployment, a robust authentication model is required.

## 1. Single-User Mode (Current)
Currently, NIMS is designed to run locally. If exposed, it defaults to a simple API Key Middleware on the backend.
- The `Authorization` header is checked on every `/api` request.
- If it does not match exactly what is defined in the `.env` `MASTER_API_KEY`, the NestJS HTTP Exception filter throws a `401 Unauthorized` response.

## 2. JWT Strategy (Future Cloud Mode)
In a hosted environment, NIMS will enforce standard JSON Web Token (JWT) authentication using NestJS Guards and Passport.
- Users authenticate via `/api/auth/login`.
- The system signs a token containing the `userId`.
- Every image uploaded is associated with that `userId`, ensuring strong isolation of the data layer.

## 3. Data Privacy and Safe Caching
NIMS handles extraordinarily sensitive personal data (visual memories). 
- **Encryption:** The `image-memory.json` file on disk should reside on an at-rest encrypted volume if deployed to the cloud.
- **Frontend Masking:** In Next.js, highly sensitive images (e.g., those marked with a privacy tag by the VLM) bypass standard edge caching mechanisms and have a strict `Cache-Control: no-store` header applied.

---

*Documentation Date: 2026-03-19*
