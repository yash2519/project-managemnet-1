# 15 — Change Log

All notable changes to this project architecture and documentation will be documented in this file.

## [1.0.0] - 2026-06-28

### Added
- Comprehensive architecture documentation suite.
- `01-project-overview.md` outlining the tech stack and high-level data flow.
- `02-folder-structure.md` detailing the monorepo organization.
- `03-frontend-architecture.md` explaining Next.js, Redux, and Tailwind integration.
- `04-backend-architecture.md` describing the Express setup, controllers, and AI integration.
- `05-database-architecture.md` outlining the Prisma schema and PostgreSQL models.
- `06-api-architecture.md` detailing RTK Query usage and REST patterns (including S3 presigned URLs).
- `07-component-architecture.md` explaining reusable UI elements and layouts.
- `08-coding-guidelines.md` establishing rules for TypeScript, React, and backend development.
- `09-naming-conventions.md` defining standard naming patterns for files, functions, and models.
- `10-dependency-rules.md` establishing boundaries between client, server, and internal layers.
- `11-security-guidelines.md` detailing Cognito auth, RBAC, and secure file uploads.
- `12-testing-guidelines.md` outlining the strategy for future unit and E2E testing.
- `13-deployment-notes.md` providing guidance for EC2, RDS, and frontend hosting.
- `14-antigravity-context.md` providing explicit instructions for AI agents working in the repo.
- `index.md` linking all architectural documents.

## [1.1.0] - 2026-06-28

### Refactored (Dead Code)
- Removed unused `ProjectCard` and `UserCard` component directories and all associated files.

### Refactored (Unused Imports)
- Removed unused imports across all `client/src` pages and `server/src` controllers.
- TypeScript and lint verified clean after cleanup.

### Refactored (Duplicate Utilities)
- Merged `getRoleStyle`, `rolePalette`, `getStatusBadgeClass`, and `getPriorityBadgeClass` into `client/src/lib/utils.ts`.
- Removed inline duplicates from `teams/[id]/page.tsx`, `users/page.tsx`, `home/page.tsx`, `tasks/page.tsx`.

### Refactored (Duplicate Validation)
- Extracted `requireTeamAdmin` helper in `server/src/controllers/teamController.ts` — replaces 3 repeated `prisma.userTeam.findFirst` admin checks.
- Extracted `requireProjectOwnerOrAdmin` helper in `server/src/controllers/projectController.ts` — replaces 2 repeated owner/admin permission checks.

### Refactored (Naming Conventions)
- Renamed `client/src/app/priority/reusablePriorityPage` → `ReusablePriorityPage` to follow PascalCase standard for component directories.
- Updated all 5 consumer import paths (`backlog`, `high`, `low`, `medium`, `urgent`).
- Renamed `initialStateTypes` interface → `InitialStateTypes` in `client/src/state/index.ts` to comply with PascalCase for interfaces.
- All frontend and backend builds verified clean after changes.

### Refactored (Folder Reorganization)
- Moved `client/src/components/EmptyState.tsx` → `EmptyState/index.tsx` (barrel-file pattern, zero import changes needed).
- Moved `client/src/components/AuthProvider.tsx` → `AuthProvider/index.tsx` (barrel-file pattern, zero import changes needed).
- Moved `client/src/app/projects/ProjectHeader.tsx` → `ProjectHeader/index.tsx`; updated one internal relative import (`./ModalNewProject` → `../ModalNewProject`).
- All 20 frontend routes and server TypeScript verified clean after reorganization.

### Refactored (RTK Query Deduplication)
- Created `providesList` helper function in `client/src/state/api.ts` to deduplicate cache tag mapping logic.
- Extracted `TEAM_MUTATION_TAGS` and `TASK_MUTATION_TAGS` constants in `client/src/state/api.ts` to reduce boilerplate in `invalidatesTags`.
- Verified Typescript and production builds. Cache behavior is strictly preserved.

### Refactored (Prisma Cascades)
- Replaced manual transaction-based database cleanups with native Prisma `onDelete: Cascade` and `onDelete: SetNull` rules.
- Reduced `deleteProject` in `projectController.ts` by 45 lines, eliminating redundant nested `$transaction` logic.
- Retained `Restrict` policies for core user-generated content (like `Project.owner` and `Task.author`) to prevent accidental data loss.

### Refactored (Frontend Component Splitting)
- Split monolithic `users/page.tsx` (~42KB) and `teams/page.tsx` (~37KB) into focused components and hooks.
- Extracted generic table overlays into `client/src/components/data-table/` (`ManageColumnsPanel.tsx`, `ColumnMenu.tsx`, `FilterInput.tsx`, `types.ts`).
- Extracted page-specific empty states and cell presentation widgets into `app/users/_components/` and `app/teams/_components/`.
- Moved extensive state management (sorting, filtering, persistence) into custom `useUserTableState` and `useTeamTableState` hooks.

### Refactored (Hook Extraction)
- Extracted heavy data processing logic from `app/home/page.tsx` into `useDashboardMetrics.ts`.
- Extracted drag-and-drop boilerplate (`useDrag`, `useDrop`) from `app/projects/BoardView/index.tsx` into `useBoardDragAndDrop.ts`.
- Extracted the massive form state and AI breakdown logic from `ModalNewTask/index.tsx` into `useNewTaskForm.ts`, vastly simplifying the UI component.

### Security (JWT Signature Verification)
- Replaced `jwt.decode()` (no signature verification) with `CognitoJwtVerifier` from the `aws-jwt-verify` library.
- JWT signature now cryptographically verified against the Cognito JWKS public key (RS256).
- Issuer, Client ID, token use (`access`), and expiry are all validated on every request.
- JWKS are automatically cached after first fetch — no performance overhead on subsequent requests.
- Added `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` environment variables to `server/.env`.
- All existing RBAC, auto-onboarding, and `req.user` behavior fully preserved.
- Eliminated the Critical priority security vulnerability flagged in the refactoring roadmap and final audit.

### Removed (Dead Code Cleanup)
- Deleted `client/src/components/AuthProvider/index.tsx` — confirmed dead code with zero imports and zero runtime references across the entire codebase.
- The file implemented a custom localStorage-based auth context that was superseded by the active Amplify-based `app/authProvider.tsx`. It had never been integrated into the app.
- `axios` (imported only by the dead file and absent from `package.json`) was also removed as a stale import.

### Added (Tooling)
- Added ESLint to the `server/` workspace using the modern flat configuration (`eslint.config.js`).
- Configured `typescript-eslint` with type-aware linting (`recommendedTypeChecked`).
- Tailored rules to accommodate existing Express.js patterns (e.g., disabling `no-misused-promises` for async route handlers, downgrading `no-explicit-any`).
- Fixed minor unused variables and `prefer-const` violations in `taskController.ts` and `userController.ts` to achieve a 0-error baseline.
- Added `lint` and `lint:fix` scripts to `server/package.json`.
- Installed `madge` as a local dev dependency in both `client` and `server` for robust circular dependency detection.
- Added `npm run analyze:circular` scripts to both client and server workspaces.
- Added `development-workflow.md` to document usage of internal tooling.

