# RTK Query Layer Review

This document outlines an architectural review of the `client/src/state/api.ts` RTK Query slice, identifying areas for deduplication, cleanup, and improved maintainability without altering existing business or authorization rules.

## 1. Oversized Endpoint Definitions
- **Endpoint**: `getAuthUser`
- **Issue**: The `queryFn` contains over 30 lines of complex async logic mixing standard API `baseQuery` calls with AWS Amplify SDK calls (`fetchUserAttributes`, `getCurrentUser`) and data merging.
- **Recommendation**: Extract this `queryFn` body into a standalone helper function (e.g., `fetchAndMergeAuthUser`) either at the bottom of the file or in a separate auth utility file.
- **Why it is beneficial**: Greatly reduces visual noise in the primary `api.ts` slice, making the endpoint definitions much easier to scan. It also makes the AWS Amplify fetching logic independently testable and maintainable.
- **Risk level**: Low.
- **Expected impact**: High readability improvement for the central state hub.
- **Estimated implementation effort**: ~15 minutes.

## 2. Duplicate Request Logic (Manual URL Parameter Serialization)
- **Endpoints**: `getTasks`, `getFileUploads`, `search`
- **Issue**: These queries manually construct query strings. For example:
  ``query: ({ projectId, userId }) => `tasks?projectId=${projectId}${userId ? `&userId=${userId}` : ""}` ``
- **Recommendation**: Refactor these endpoints to return an object utilizing the `params` property, allowing RTK Query's `fetchBaseQuery` to automatically handle serialization and encoding.
  ```typescript
  query: (params) => ({
    url: 'tasks',
    params // RTK Query automatically serializes { projectId, userId } to ?projectId=X&userId=Y
  })
  ```
- **Why it is beneficial**: Prevents manual string interpolation errors, handles URL encoding natively (obsoleting the manual `encodeURIComponent` in `search`), and provides a much cleaner, declarative syntax.
- **Risk level**: Low.
- **Expected impact**: Cleaner request configurations and guaranteed safe URL encoding for complex parameter values.
- **Estimated implementation effort**: ~15 minutes.

## 3. Repeated Cache Invalidation Patterns
- **Endpoints**: `updateUser`, `updateProfilePicture`
- **Issue**: Both endpoints manually define their invalidations: `["Users", "AuthUser"]` and `["AuthUser", "Users"]`.
- **Recommendation**: Extract to a shared constant `USER_MUTATION_TAGS = ["Users", "AuthUser"] as const;` similar to `TEAM_MUTATION_TAGS` and `TASK_MUTATION_TAGS`.
- **Why it is beneficial**: Ensures that any future user-related mutations invalidate the exact same core tags without the risk of typos or order mismatches, keeping cache behavior strictly consistent.
- **Risk level**: Very Low.
- **Expected impact**: Consistency and reduction of magic string arrays.
- **Estimated implementation effort**: < 5 minutes.

## 4. Item-Level Cache Tag Boilerplate
- **Endpoints**: `getProjectById`, `getTeamById`
- **Issue**: While lists are now handled by `providesList`, single-item queries still manually define tag arrays: `(result, error, id) => [{ type: "Projects", id }]`.
- **Recommendation**: Create a `providesItem` helper function to complement the existing `providesList`.
  ```typescript
  function providesItem<T extends string>(tagType: T, id: string | number) {
    return [{ type: tagType, id } as const];
  }
  ```
- **Why it is beneficial**: Creates a uniform, descriptive interface for tag provision across the entire API slice. It allows developers to instantly understand the tag behavior without parsing array literals visually.
- **Risk level**: Very Low.
- **Expected impact**: Minor readability improvement.
- **Estimated implementation effort**: < 10 minutes.

## 5. Structurally Redundant (Do Not Merge)
- **Endpoints**: `getTasks` vs `getTasksByUser`
- **Analysis**: Both fetch a list of tasks and use `providesList(result, "Tasks")`. Structurally, `getTasksByUser` could theoretically be served by modifying `getTasks` to accept no `projectId`.
- **Recommendation**: **DO NOT MERGE**. As dictated by business and authorization rules, `getTasks` enforces project-level team membership checks on the backend, while `getUserTasks` enforces strict user-identity checks (you can only fetch your own tasks globally). Merging these on the frontend would eventually force the backend to mix these distinct authorization models into a single, complex controller function. They should safely remain separate.
