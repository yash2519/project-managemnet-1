# 08 — Coding Guidelines

## TypeScript Usage

- Use **TypeScript** strictly for all new files (`.ts` or `.tsx`). Avoid using plain `.js` unless strictly necessary for configuration files (e.g., `ecosystem.config.js`).
- Define explicit interfaces or types for all data structures, especially API responses and Redux state.
- Avoid using `any`. If the type is truly unknown, prefer `unknown` or narrow the type with type guards.
- For RTK Query, interface definitions are centralized in `server/src/state/api.ts` (e.g., `export interface Task { ... }`). Keep these in sync with the Prisma schema.

## React & Next.js

- Use **Functional Components** with Hooks. Do not use Class Components.
- When creating interactive components in the Next.js `app/` directory, ensure the file starts with `"use client";`.
- Extract complex logic into custom hooks (e.g., `useS3Upload`).
- Avoid prop drilling deeper than 2-3 levels. If data needs to go deeper, consider using Redux (for UI state) or RTK Query hooks directly in the child component.

## Styling

- Use **Tailwind CSS** utility classes for styling.
- Avoid writing custom CSS in `globals.css` unless necessary for overriding third-party libraries (like the Gantt chart) or defining global CSS variables.
- Use the established Tailwind color palette (e.g., `text-blue-primary`, `bg-dark-secondary`) to ensure consistency across light and dark modes.
- Always include `dark:` variants for colors to maintain dark mode compatibility.

## Backend Express

- Use `async/await` for asynchronous operations.
- Always wrap controller logic in `try/catch` blocks and return appropriate HTTP status codes (400 for bad input, 401/403 for auth issues, 404 for not found, 500 for server errors).
- Do not put complex business logic directly in the route definitions. Keep routes clean (mapping path -> controller function).
- Ensure all routes that require authentication use the `authMiddleware`.

## Database (Prisma)

- Never query the database directly from the frontend.
- When deleting records with relations, ensure you handle cascading deletes properly (currently handled manually in transactions within the controllers).
- Keep the Prisma schema organized and properly document any complex relations.
