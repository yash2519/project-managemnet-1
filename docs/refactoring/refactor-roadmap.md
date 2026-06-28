# Refactoring Roadmap

This document synthesizes findings from the architecture and refactoring reports, prioritizing technical debt into an actionable roadmap.

---

## Critical Priority

### 1. Implement Strict JWT Signature Verification
- **Source Report**: `11-security-guidelines.md`
- **Issue**: The current `authMiddleware` on the backend only decodes the AWS Cognito JWT but does not verify its cryptographic signature against the Cognito JSON Web Key Set (JWKS).
- **Difficulty**: Low (Libraries like `aws-jwt-verify` make this trivial).
- **Risk**: High (If implemented incorrectly, all authenticated requests will fail).
- **Expected Impact**: Crucial security fix preventing token spoofing and unauthorized API access.

---

## High Priority

### 2. Centralize Backend Request Validation & ID Parsing
- **Source Report**: `duplicate-validation.md`
- **Issue**: Repeated manual parsing of `req.params.id` (e.g., `Number(id)`) and duplicated `try/catch` wrapping across all controllers.
- **Difficulty**: Low to Medium.
- **Risk**: Medium (Changes touch almost every backend route).
- **Expected Impact**: Cleaner controller functions and standardized 400 Bad Request responses for invalid inputs.

### 3. Abstract Authorization and Entity Existence Checks
- **Source Report**: `duplicate-prisma-queries.md`, `duplicate-validation.md`
- **Issue**: Repeated Prisma queries like `findFirst` to check if a user is an admin of a team, or `findUnique` to check if a project exists before mutating it.
- **Difficulty**: Medium (Requires creating custom Express middlewares, e.g., `requireTeamAdmin`).
- **Risk**: Medium (Could break endpoints if permission logic is flawed).
- **Expected Impact**: Massive reduction in backend boilerplate, drastically lower risk of authorization bypass bugs, and adherence to DRY principles.

---

## Medium Priority

### 4. Component Splitting for Large Frontend Pages
- **Source Report**: `large-files.md`
- **Issue**: Several Next.js route components are significantly oversized, notably `home/page.tsx` (~53 KB) and `users/page.tsx` (~42 KB).
- **Difficulty**: Medium (Requires carefully extracting UI and moving local state/props to new sub-components).
- **Risk**: Low (Purely structural frontend changes).
- **Expected Impact**: Dramatically improved readability and maintainability. Potential rendering performance improvements by isolating state changes to smaller child components.

### 5. RTK Query Deduplication & Optimization
- **Source Report**: `duplicate-api-calls.md`
- **Issue**: Overlapping endpoint functionality (e.g., `getTasks` vs `getTasksByUser`) and heavy boilerplate in `invalidatesTags` / `providesTags` arrays in `client/src/state/api.ts`.
- **Difficulty**: Low.
- **Risk**: Low to Medium (Cache invalidation behavior must be tested to ensure UI still updates automatically).
- **Expected Impact**: A smaller, more maintainable central API slice.

### 6. Enforce Strict Linting for Unused Code
- **Source Report**: `unused-imports.md`
- **Issue**: The Next.js ESLint configuration does not strictly fail on or auto-fix unused imports and variables.
- **Difficulty**: Low.
- **Risk**: Low.
- **Expected Impact**: Automated prevention of future code bloat and cleaner PR diffs.

---

## Low Priority

### 7. Clean Up Dead Code (Unused Components)
- **Source Report**: `unused-components.md`, `dead-code.md`
- **Issue**: The `ProjectCard` and `UserCard` components in `client/src/components/` are fully exported but never rendered.
- **Difficulty**: Very Low (Simply delete the files).
- **Risk**: None.
- **Expected Impact**: Minor repository cleanup.

### 8. Controller Splitting
- **Source Report**: `large-files.md`
- **Issue**: `teamController.ts` handles standard CRUD as well as complex team member management, making it slightly bloated.
- **Difficulty**: Low.
- **Risk**: Low.
- **Expected Impact**: Marginally better separation of concerns on the backend.
