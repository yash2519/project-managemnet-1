# 07 — Component Architecture

## Next.js App Router Structure

The frontend leverages Next.js App Router, combining layout persistence with distinct feature pages.

- `app/layout.tsx`: The root HTML/Body wrapper. Sets global fonts.
- `app/dashboardWrapper.tsx`: The primary application shell. It wraps the app in Redux (`StoreProvider`) and Auth (`AuthProvider`) context providers, and renders the layout grid (Sidebar on the left, Navbar + Main Content on the right).
- `app/[feature]/page.tsx`: Route-specific pages.

## Reusable Components (`src/components/`)

The application extracts common UI patterns into reusable components:

- **Navigation**: `Sidebar`, `Navbar`, `Header`
- **Data Display**: `TaskCard`, `ProjectCard`, `UserCard`
- **Empty States**: `EmptyState` (used when lists are empty)
- **Modals**: 
  - Base `Modal` wrapper (handles overlays and positioning).
  - Specific implementations: `ModalNewTask`, `ModalEditTask`, `ModalAssignTask`, `ModalNewProject`, `TaskDetailsModal`.
- **Utilities**: `FileUploader` (integrates with the `useS3Upload` hook).

## View Components (e.g., in `src/app/projects/`)

Within feature directories, complex views are broken down into sub-components. For example, a project detail page (`app/projects/[id]`) may import:
- `BoardView`: Kanban-style drag-and-drop board using `react-dnd`.
- `ListView`: A vertical list of tasks.
- `TableView`: A data grid representation using MUI `DataGrid`.
- `TimelineView`: A Gantt chart using `gantt-task-react`.
- `AnalyticsView`: A dashboard shell hosting sub-features:
  - `HealthView`: Displays AI-generated project health score and insights.
  - `DependenciesDashboard`: Displays interactive graph (`@xyflow/react`) and prediction cards.
- `ProjectAIOverview`: A persistent, high-level AI widget placed directly below the `Project Metadata Panel`. It serves as the project's central AI summary area (currently summarizing Dependency Failure predictions), allowing future AI features to plug into the summary without restructuring the page.

## Client vs Server Components

- Because the dashboard requires heavy interactivity (drag and drop, modals, forms) and client-side state (Redux), almost all components in the `src/app/` directory begin with `"use client";`.
- Server-side rendering (SSR) is minimally utilized in this specific architecture, trading initial load SEO for rich client-side dashboard functionality.

## Component Communication

- **Global State**: Redux (`isSidebarCollapsed`, `isDarkMode`) is used for UI state that affects the entire application shell.
- **Server State**: Data is passed downwards from page components (which call RTK Query hooks) to presentational components (cards, views) via props.
- **Modals**: Modals are generally controlled by boolean state variables in the parent page component (e.g., `isModalNewProjectOpen`) and conditionally rendered.
