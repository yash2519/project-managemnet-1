# Duplicate API Calls Report

This report identifies potential redundancies in how the frontend interfaces with the backend REST API via Redux Toolkit Query (RTK Query).

## Findings

The primary API slice (`client/src/state/api.ts`) contains definitions for all endpoints. While there are no strict duplicate calls to the exact same URL pattern, there are redundancies in how some queries are parameterized or structured.

### 1. Task Fetching Variations
There are two highly similar queries for fetching tasks that could potentially be unified on the backend:
- `getTasks` (`query: ({ projectId, userId }) => ...`)
- `getTasksByUser` (`query: (userId) => 'tasks/user/${userId}'`)

**Analysis**: `getTasks` already accepts an optional `userId` filter (which filters by assignee). `getTasksByUser` acts similarly but hits a different route. 
- *Recommendation*: If the backend route `/tasks` can simply take `?userId=<id>` without requiring a `projectId`, `getTasksByUser` could be removed, reducing code duplication.

### 2. Team Member Management
- `updateTeamMemberRole`
- `removeTeamMember`
- `addTeamMember`

**Analysis**: These endpoints all target similar REST structures (e.g., passing `teamId` and `userId`). They are technically distinct actions (PATCH, DELETE, POST), so the RTK Query definitions are necessary. However, the cache invalidation tags (`invalidatesTags: ["Teams"]`) are duplicated across all of them.

### 3. Builder Query Repetition
The `api.ts` file repeats the exact same structure for `providesTags` and `invalidatesTags` in almost all mutations:
```typescript
invalidatesTags: (result, error, arg) => [{ type: "Tasks", id: arg.id }]
```
- *Recommendation*: RTK Query allows for utility functions to generate tag lists. Creating a helper function `providesList(type)` could significantly reduce boilerplate in this file.
