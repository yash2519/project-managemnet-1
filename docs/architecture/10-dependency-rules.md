# 10 — Dependency Rules

To maintain separation of concerns and prevent architectural decay, follow these dependency rules:

## General Rules

1. **No Circular Dependencies**: Ensure that importing a file does not eventually import itself.
2. **Client/Server Separation**: The `client` and `server` directories are completely separate projects. They must not import files from each other. They only communicate over the network via the REST API.

## Frontend (`client`) Dependencies

1. **Component Hierarchy**: 
   - Feature pages (`app/projects/page.tsx`) can import reusable components (`components/TaskCard`).
   - Reusable components (`components/`) should **not** import specific page implementations.
2. **State Access**:
   - Components can import hooks from `src/state/api.ts` and `src/state/index.ts`.
   - RTK Query slice (`api.ts`) must not import UI components.
3. **Utility Functions**:
   - `src/lib/` should contain pure functions. It must not depend on React components or Redux state.

## Backend (`server`) Dependencies

1. **Route Layer**:
   - Route files (`*Routes.ts`) should only import Controllers and Middlewares. They should not contain business logic or database queries.
2. **Controller Layer**:
   - Controllers (`*Controller.ts`) should import the Prisma client (for database access) and Services (for external integrations).
   - Controllers should not import other Controllers.
3. **Service Layer**:
   - Services (`*Service.ts`) contain specific external integration logic (e.g., AWS S3).
   - Services should be as pure and decoupled as possible. They should not depend on Express `Request` or `Response` objects.
4. **Middleware Layer**:
   - Middlewares (`auth.ts`) can import the Prisma client (to verify user existence) but should not depend on specific Controllers.

## Third-Party Libraries

- **Frontend**: Restrict direct UI manipulation libraries. Prefer React-based libraries (e.g., `react-dnd` over raw HTML5 drag/drop APIs).
- **Backend**: Restrict global state. Use injected dependencies or singletons (like the Prisma client instance) rather than relying on global mutable variables.
