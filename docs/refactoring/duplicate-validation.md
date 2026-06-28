# Duplicate Validation Report

This report identifies repeated validation logic across the backend controllers that could be centralized.

## Findings

The Express backend currently handles input validation in a somewhat manual and scattered manner, leading to logic duplication.

### 1. ID Parsing and Type Checking
Across almost every controller, ID parameters are extracted from the request and manually parsed, often wrapped in repeated `try/catch` blocks or explicit checks:
- `Number(projectId)`
- `Number(taskId)`
- `Number(id)`

**File Examples**:
- `projectController.ts`
- `taskController.ts`
- `teamController.ts`

**Status**: **Resolved**.
- Created a centralized Express middleware `validateIdParam(paramName)` that runs before route controllers.
- Applied the middleware to all relevant routes in `projectRoutes.ts`, `taskRoutes.ts`, and `teamRoutes.ts`.
- The middleware automatically parses the specified parameter and immediately rejects invalid (non-integer) IDs with a `400 Bad Request`, removing the need for manual validation and database error handling in the controllers.

### 2. Ownership and Permission Validation
Many endpoints need to verify if a user has the right to modify a resource.
- **Example**: In `teamController.ts`, removing a team member requires verifying:
  1. The team exists.
  2. The requester is an ADMIN of the team.
  3. The target user is actually a member of the team.

This exact validation sequence is repeated in `updateTeam`, `addTeamMember`, and `removeTeamMember`.

**Status**: **Resolved**.
- In `teamController.ts`, the repeated admin check was extracted into a `requireTeamAdmin` helper function.
- In `projectController.ts`, the repeated owner check was extracted into a `requireProjectOwnerOrAdmin` helper function.
These helpers successfully reduce code size and ensure authorization consistency without changing endpoint behavior.
