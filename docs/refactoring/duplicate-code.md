# Duplicate Code Report

This report identifies duplicated logic, redundant API queries, and repeated patterns across the TaskMatrix codebase.

## Overview
Duplication in this repository primarily occurs in the backend data access layer (Prisma queries) and some frontend API definitions, rather than in complex business logic or UI rendering.

### Areas of Duplication

#### 1. Prisma Queries
Repeated simple queries, particularly `findUnique` and `findFirst` for authorization checks, appear across multiple controllers.
- **Example**: `prisma.userTeam.findFirst` is repeated in `teamController.ts` to check if a user is a team administrator.
- *Recommendation*: Extract these repeated checks into shared service functions (e.g., `teamService.checkIsAdmin(userId, teamId)`).

#### 2. Project/Task Fetching
Repeated `findUnique` calls for checking the existence of a Project or Task before performing an update or delete.
- *Recommendation*: Express middleware can be created (e.g., `verifyProjectExists`, `verifyTaskExists`) to handle existence and ownership checks before passing control to the main controller logic.

#### 3. API Endpoints (RTK Query)
The frontend API slice (`state/api.ts`) defines multiple similar queries that could potentially share builder logic.
#### 4. Inline Utility Functions
Some utility functions were previously duplicated across multiple pages:
- `getRoleStyle` and `rolePalette` (in `teams/[id]` and `users`)
- `getStatusBadgeClass` and `getPriorityBadgeClass` (in `home` and `tasks`)
- **Status**: **Resolved**. These functions have been centralized into `client/src/lib/utils.ts` and successfully deduplicated.

*Please refer to `duplicate-prisma-queries.md` and `duplicate-validation.md` for specific file and line occurrences of backend duplication.*
