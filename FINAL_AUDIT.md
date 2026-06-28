# TaskMatrix — Final Project Audit

**Audited:** 2026-06-28
**Codebase:** 88 TypeScript/TSX files · 10,136 lines of code
**Scope:** `client/src/` (Next.js 14) and `server/src/` (Express + Prisma)

---

## 1. Build

| Target | Status | Notes |
|---|---|---|
| **Client** (`next build`) | ? PASS | 20 pages compiled, 0 errors |
| **Server** (`rimraf dist && tsc`) | ? PASS | Clean compile, no errors |

### Client Bundle Summary

| Route | First Load JS | Type |
|---|---|---|
| `/home` | 275 kB | Static |
| `/projects/[id]` | 353 kB | Dynamic |
| `/users` | 149 kB | Static |
| `/teams` | 149 kB | Static |
| `/priority/*` | 324 kB | Static |

---

## 2. TypeScript

| Target | Status | Errors |
|---|---|---|
| **Client** (`tsc --noEmit`) | ? PASS | 0 |
| **Server** (`tsc --noEmit`) | ? PASS | 0 |

### Weak Typing (Non-Breaking, Informational)

| File | Line | Issue |
|---|---|---|
| `server/src/middleware/auth.ts` | L30 | `jwt.decode(token) as any` — typed as `any` due to missing JWT signature verification. Tracked separately as a security improvement. |
| `server/src/middleware/entityExistence.ts` | L32, L55, L75 | `catch (error: any)` — standard TS catch pattern; acceptable. |
| `client/src/app/projects/BoardView/index.tsx` | Various | `monitor: any` inside `react-dnd` collectors — idiomatic usage, no alternative without patching the library types. |

---

## 3. Lint

| Target | Status | Warnings | Errors |
|---|---|---|---|
| **Client** (`next lint`) | ? PASS | 0 | 0 |
| **Server** | ?? SKIPPED | N/A | No ESLint config present |

The server has no ESLint configuration. ESLint v10+ requires `eslint.config.js`. Adding ESLint to the server is a low-priority improvement. TypeScript strict mode serves as the primary quality gate on the backend.

---

## 4. Broken Imports

**Client:** ? None found
**Server:** ? None found

All imports traced and verified against the file system:
- All `@/` aliases resolve correctly via `tsconfig.json` paths.
- All relative imports (`./`, `../`) resolve to existing modules.
- The `components/AuthProvider` component exists at its path but is never imported (see Unused Code section).

---

## 5. Unused Code

### Client

| Status | Item | Notes |
|---|---|---|
| ? Previously cleaned | `ProjectCard` component | Zero references across the entire codebase. |
| ? Previously cleaned | `UserCard` component | Zero references across the entire codebase. |
| ? Cleaned this session | Stale imports in `home/page.tsx` | After hook extraction, `Project` type, `isToday`, `isPast`, `isFuture`, `addDays`, `ClipboardList`, `Clock`, `AlertTriangle` were left as orphaned imports. Removed. |
| ?? Low Priority | `components/AuthProvider/index.tsx` | A second `AuthProvider` implementation that is **never imported** anywhere. `app/authProvider.tsx` is the active one. Safe to delete. |

### Server

| Status | Item | Notes |
|---|---|---|
| ? All used | All controllers | Every controller is imported in at least one route file. |
| ? All used | All middleware | `auth`, `validate`, `entityExistence` all referenced in routes. |
| ? All used | `s3Service` | Imported by `uploadController`. |

---

## 6. Duplicate Code

### Resolved During Refactoring

| Pattern | Resolution |
|---|---|
| `providesTags` boilerplate in `api.ts` | Replaced with `providesList` helper |
| `invalidatesTags` arrays in `api.ts` | Extracted into reusable constants |
| Entity existence checks in controllers | Extracted into `requireProjectExists`, `requireTaskExists`, `requireTeamExists` middleware |
| Table column/filter UI in Users/Teams pages | Extracted into shared `data-table/` components |
| Drag-and-drop boilerplate in BoardView | Extracted into `useBoardDragAndDrop` |
| Dashboard data transforms in `home/page.tsx` | Extracted into `useDashboardMetrics` |
| Form logic in `ModalNewTask` | Extracted into `useNewTaskForm` |

### Remaining (Intentionally Deferred)

| Location | Pattern | Notes |
|---|---|---|
| `server/src/controllers/*.ts` | try/catch per handler | Consistent pattern; future improvement: generic `asyncHandler` wrapper |

---

## 7. Circular Dependencies

`madge` (npx) failed due to a broken Vue peer dependency in the npx cache. Manual import graph analysis performed instead.

| Module Graph | Result |
|---|---|
| `client/src/state/api.ts` | Imports from `@/types` only — no cycle |
| `client/src/app/redux.tsx` | Imports from `@/state` and `@/state/api` — no cycle |
| `server/src/index.ts` ? routes ? controllers ? middleware | Strict unidirectional flow — no cycle |
| `server/src/middleware/entityExistence.ts` | Imports `@prisma/client` only — no cycle |
| All new hooks | Import from `@/state/api` and `@/components` only — no cycle |

No circular dependencies detected. To automate this check in CI, install `madge` as a local dev dependency (`npm install -D madge`) rather than using `npx` to avoid the broken peer dependency in the global npx cache.

---

## 8. Outstanding Items

| Priority | Item | Status |
|---|---|---|
| ?? Critical | JWT Signature Verification | NOT implemented. Auth middleware only decodes the JWT without verifying it against the Cognito JWKS. Deferred by explicit user decision to be handled as an independent security improvement. |
| ?? Low | Delete `components/AuthProvider/index.tsx` | Dead code — unused component. Zero-risk deletion. |
| ?? Low | Add ESLint to server | No config file present. Low effort to add. |
| ?? Tooling | Install `madge` locally | Use `npm install -D madge` instead of `npx` to avoid peer dep issue. |

---

## Summary

| Category | Result |
|---|---|
| Client Build | ? Pass |
| Server Build | ? Pass |
| Client TypeScript | ? 0 errors |
| Server TypeScript | ? 0 errors |
| Client Lint | ? 0 warnings, 0 errors |
| Server Lint | ?? No config (not blocking) |
| Broken Imports | ? None |
| Unused Code | ? Cleaned (1 low-priority item remains) |
| Duplicate Code | ? All major patterns resolved |
| Circular Dependencies | ? None detected |
