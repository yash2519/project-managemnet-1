# Unused Components Report

This report identifies React components in the `client/src/components/` directory that are exported but not currently imported or used anywhere in the application.

## Findings

### 1. `ProjectCard`
- **Path**: `client/src/components/ProjectCard/index.tsx`
- **Status**: Completely unused.
- **Analysis**: The component exists to display project details in a card format (Start/End dates, descriptions), but the application currently renders project data directly in customized views (e.g., DataGrid in `app/projects/page.tsx`) rather than mapping over a grid of `ProjectCard`s.

### 2. `UserCard`
- **Path**: `client/src/components/UserCard/index.tsx`
- **Status**: Completely unused.
- **Analysis**: Designed to show user profiles in a card layout. Currently, the `app/users/page.tsx` renders a MUI DataGrid table instead of a card grid.

## Recommendations
- If a "Grid View" for Projects or Users is planned for future features, these components should be retained.
- If not, they should be deleted to remove dead code and reduce repository bloat.
