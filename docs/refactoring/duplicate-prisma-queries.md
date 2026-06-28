# Duplicate Prisma Queries Report

This report identifies redundant or repeated Prisma ORM database queries across the backend controllers.

## Findings

### 1. Repeated Authorization Checks
The query to verify if a user is an admin of a specific team (`prisma.userTeam.findFirst`) is duplicated heavily.

- **File**: `teamController.ts`
  - Line 168: `const isAdmin = await prisma.userTeam.findFirst({ ... })`
  - Line 228: `const isAdmin = await prisma.userTeam.findFirst({ ... })`
  - Line 282: `const isAdmin = await prisma.userTeam.findFirst({ ... })`

**Refactoring Recommendation**: 
Extract this check into a reusable function:
```typescript
async function verifyTeamAdmin(userId: number, teamId: number) {
  const membership = await prisma.userTeam.findFirst({ where: { userId, teamId, role: "ADMIN" }});
  if (!membership) throw new Error("Unauthorized");
}
```

### 2. Entity Existence Checks
Controllers often query an entity just to ensure it exists before proceeding with an operation.

- **File**: `projectController.ts`
  - Line 44: `await prisma.project.findUnique({ where: { id: ... } })`
  - Line 127: `await prisma.project.findUnique({ where: { id: ... } })`
  - Line 163: `await prisma.project.findUnique({ where: { id: ... } })`

- **File**: `taskController.ts`
  - Line 102: `await prisma.task.findUnique({ where: { id: ... } })`
  - Line 149: `await prisma.task.findUnique({ where: { id: ... } })`

**Status**: **Resolved**.
- Created `entityExistence.ts` middleware containing `requireProjectExists`, `requireTaskExists`, and `requireTeamExists`.
- Injected these middlewares into the corresponding routes in `projectRoutes.ts`, `taskRoutes.ts`, and `teamRoutes.ts`.
- Refactored `projectController`, `taskController`, and `teamController` to remove redundant database queries, instead safely reading the pre-fetched typed entities directly from `res.locals`.
