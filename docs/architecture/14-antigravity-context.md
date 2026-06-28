# 14 — Antigravity Context

This document provides specific context for AI agents working within the TaskMatrix codebase.

## Repository Overview

TaskMatrix is a monorepo containing a Next.js frontend (`client/`) and a Node.js/Express backend (`server/`). The stack utilizes TypeScript across both ends.

## Key Architectural Decisions to Respect

1. **State Management**: The frontend strictly uses Redux Toolkit for global UI state and RTK Query for data fetching. **Do not introduce SWR, React Query, or raw `fetch`/`axios` calls for API communication in components.** Follow the existing pattern in `client/src/state/api.ts`.
2. **Styling**: Tailwind CSS is the singular styling framework. **Do not write custom CSS or inline styles** unless absolutely necessary to override third-party components (like the Gantt chart in `globals.css`).
3. **Database Access**: The database is PostgreSQL accessed exclusively via Prisma. **Do not write raw SQL queries** unless performance dictates a specific edge case that Prisma cannot handle.
4. **File Uploads**: All file uploads must follow the presigned URL flow to AWS S3. **Do not implement endpoints that accept `multipart/form-data` file buffers directly on the Express server.** Use the provided `useS3Upload` hook.
5. **Authentication**: Handled by AWS Cognito. The backend trusts the JWT token decoded by the `authMiddleware`.
6. **Code Modification**: Before modifying existing Prisma schemas or complex components (like the DataGrid views or Gantt timeline), thoroughly review how data is currently fetched and transformed to avoid breaking existing UI dependencies.

## Standard Workflows for Agents

- **Adding a new feature (Frontend)**:
  1. Define the necessary interfaces in `client/src/state/api.ts`.
  2. Add endpoints to the RTK Query `api` slice.
  3. Create reusable components in `client/src/components/`.
  4. Create the specific route/page in `client/src/app/`.
- **Adding a new feature (Backend)**:
  1. Define changes in `server/prisma/schema.prisma` (if database changes are required).
  2. Create/update the controller logic in `server/src/controllers/`.
  3. Map the route in `server/src/routes/` and expose it in `server/src/index.ts`.
  4. Ensure the route uses `authMiddleware` if it requires an authenticated user.
