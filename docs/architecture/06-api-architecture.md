# 06 — API Architecture

## Overview

The application communicates via a **RESTful API** served by Express.js on the backend.
The frontend consumes these APIs exclusively through **Redux Toolkit Query (RTK Query)**.

## Frontend RTK Query Configuration

- Defined in `client/src/state/api.ts`.
- `fetchBaseQuery` is configured with `NEXT_PUBLIC_API_BASE_URL`.
- The `prepareHeaders` function automatically intercepts every outgoing request and injects the `Authorization: Bearer <token>` header by calling AWS Amplify's `fetchAuthSession()`.
- **Cache Tags**: The API uses strict tagging (`Projects`, `Tasks`, `Users`, `Teams`, `AuthUser`, `Activities`, `FileUploads`) to ensure that mutations automatically trigger refetches of related data.

## Backend Route Structure

Routes are mounted in `server/src/index.ts` under standard REST resource paths:

| Base Path | Router File | Purpose |
|-----------|-------------|---------|
| `/projects` | `projectRoutes.ts` | CRUD for projects |
| `/projects/:projectId/dependencies` | `dependencyRoutes.ts` | Graph analysis, failure prediction, dependency CRUD |
| `/tasks` | `taskRoutes.ts` | CRUD for tasks, status updates |
| `/search` | `searchRoutes.ts` | Global search endpoint (`GET /search?query=...`) |
| `/users` | `userRoutes.ts` | User retrieval, creation, profile updates |
| `/teams` | `teamRoutes.ts` | Team management, adding/removing members |
| `/activities`| `activityRoutes.ts`| Fetching the activity stream/audit log |
| `/uploads` | `uploadRoutes.ts` | Presigned URL generation and confirmation |
| `/ai` | `aiRoutes.ts` | Triggering Gemini task breakdowns |

## Common API Patterns

### Presigned URL Upload Flow (S3)

Uploading files bypassing the Node.js server to save bandwidth and memory:
1. **Client** calls `POST /uploads/presign` with the file metadata (name, type, size).
2. **Server** returns a temporary, secure S3 PUT URL and an `s3Key`.
3. **Client** executes a direct `PUT` request to the S3 URL with the file binary.
4. **Client** calls `POST /uploads/confirm` with the `s3Key` and `publicUrl`.
5. **Server** saves a `FileUpload` record in PostgreSQL.

### AI Task Breakdown Flow
1. **Client** calls `POST /ai/breakdown` with task details and context.
2. **Server** fetches the current team workload from the DB.
3. **Server** sends a prompt to Google Gemini.
4. **Server** parses the JSON response from Gemini, enforces limits, and returns the subtasks to the client.

## Security & Rate Limiting
- All routes (except `OPTIONS` preflight) require a valid JWT token via the `authMiddleware`.
- The AI endpoint implements a basic in-memory lock (`activeRequests` Set) keyed by `projectId_taskTitle` to prevent duplicate concurrent requests and avoid API rate limits.
