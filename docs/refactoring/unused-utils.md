# Unused Utils Report

This report identifies utility functions in the `client/src/lib/` directory that are defined but not utilized.

## Findings
- **Utility File**: `client/src/lib/utils.ts`
- **Total Exported Utils**: 3
  - `dataGridClassNames`
  - `dataGridSxStyles`
  - `formatDate`
- **Unused Utils**: 0

## Analysis
All exported utility constants and functions in `utils.ts` are heavily utilized across the frontend application:
- **`formatDate`**: Used in `TaskDetailsModal`, `TaskCard`, `ProjectCard`, `timeline/page.tsx`, `tasks/page.tsx`, `projects/page.tsx`, and more.
- **`dataGridClassNames` & `dataGridSxStyles`**: Used consistently across all files implementing the MUI DataGrid (e.g., `TableView`, `users/page.tsx`, `tasks/page.tsx`) to ensure a unified aesthetic across light and dark modes.

No dead code exists in the utils directory.
