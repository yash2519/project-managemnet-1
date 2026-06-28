# 04 — Backend Architecture

## Framework & Server Setup

- **Express.js**: The backend is a traditional REST API built with Node.js and Express.
- **Entry Point**: `src/index.ts` configures middleware (Helmet for security, Morgan for logging, CORS, body parsers) and mounts all route handlers.
- **Middleware Integration**: The global `authMiddleware` is applied early in the request lifecycle, ensuring all subsequent routes are protected.

## Authentication Middleware

Located in `src/middleware/auth.ts`.
- **JWT Decoding**: It intercepts requests, extracts the Bearer token, and decodes the JWT (Note: currently it trusts the decoded token; in a strict production environment, this should verify the signature against Cognito JWKS).
- **Auto-Onboarding**: If a user logs in via Cognito but doesn't exist in the Prisma database (matched via `cognitoId`), the middleware automatically creates a `User` record for them in the database.
- **Request Augmentation**: It attaches the `userId`, `role`, and `teamIds` to the Express `req` object for downstream controllers to use.

## Routing & Controllers

The application is divided into logical feature domains:
- **Projects**: Creation, updating, deletion, and retrieval.
- **Tasks**: Management, status updates, fetching by user/project.
- **Teams**: Team creation, member management.
- **Users**: User profiles, updating roles.
- **Activities**: Fetching audit logs/activity streams.
- **Search**: Global search across tasks, projects, and users.
- **Uploads**: Presigned URL generation and upload confirmation.
- **AI**: Gemini integration for task breakdown.

Each route file (e.g., `projectRoutes.ts`) maps HTTP verbs to functions in the corresponding controller (e.g., `projectController.ts`).

## Services

External integrations and complex business logic are extracted into services.
- **`s3Service.ts`**: Handles interaction with AWS S3 using the `@aws-sdk/client-s3` v3 library. It generates unique S3 keys, requests presigned PUT URLs, and can delete objects.

## AI Integration

Located in `aiController.ts`.
- Integrates with the **Google Gemini API** (`@google/genai`).
- Prompts the AI to break down a larger task into smaller subtasks (estimating points, assigning to users based on workload and roles, setting priorities).
- Uses a basic in-memory lock (`Set<string>`) to prevent duplicate concurrent generation requests for the same task.
- Enforces a JSON schema response from the AI.

## Error Handling

Controllers generally wrap their logic in `try/catch` blocks and return 500 status codes with error messages. Some specific errors (like Prisma unique constraint violations `P2002` in uploads) are caught and mapped to 409 Conflict.
