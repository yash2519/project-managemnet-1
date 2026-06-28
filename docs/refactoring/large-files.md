# Large Files Report

This report highlights files that exceed standard size thresholds and may benefit from refactoring into smaller, more focused modules.

## Frontend (`client/src/`)

| File Path | Size | Notes |
|-----------|------|-------|
| `app/home/page.tsx` | ~53 KB | Extremely large for a single page component. Likely contains multiple inline sub-components (like tables or charts) that should be extracted into the `components/` directory. |
| `app/users/page.tsx` | ~42 KB | Contains a significant amount of inline DataGrid configuration and logic. Columns definition could be extracted. |
| `app/teams/page.tsx` | ~37 KB | Contains a large amount of inline UI and logic for the Teams data grid and potentially modal inline definitions. |
| `app/projects/BoardView/index.tsx` | ~17 KB | Complex drag-and-drop logic. Standard for `react-dnd` implementations, but could be refactored into custom hooks for clarity. |
| `state/api.ts` | ~11 KB | Contains all API endpoints. As the app grows, consider using `api.injectEndpoints` to split this file by domain (e.g., `taskApi.ts`, `projectApi.ts`). |
| `components/ModalNewTask/index.tsx`| ~13 KB | Large form component. Form handling logic could be separated from the UI definition. |

## Backend (`server/src/`)

| File Path | Size | Notes |
|-----------|------|-------|
| `controllers/teamController.ts` | ~12 KB | Handles team CRUD and complex member management. Consider extracting member management into a separate service or controller. |
| `controllers/projectController.ts` | ~7 KB | Within acceptable limits, but handles manual cascade deletions that inflate the file size. |

## Recommendations
- **Component Splitting**: Break down `home/page.tsx` and `users/page.tsx` into smaller presentational components.
- **Hook Extraction**: Move complex state logic (like filtering and sorting configurations for the DataGrid) out of the UI components and into custom hooks.
