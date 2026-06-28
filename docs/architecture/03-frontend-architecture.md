# 03 — Frontend Architecture

## Framework & Routing

- **Next.js 14 App Router**: The application uses the Next.js `app/` directory for routing.
- **Client Components**: Because of the heavy interactivity and state management (Redux), most of the application pages are marked with `"use client"`.
- **Layouts**: The root layout wraps the application in a `DashboardWrapper` which includes the `Sidebar`, `Navbar`, and manages the overall layout structure.

## State Management

The application uses **Redux Toolkit (RTK)** and **RTK Query** for state management.

### Global UI State (`src/state/index.ts`)
A simple slice manages UI preferences:
- `isSidebarCollapsed`: Controls the visibility of the sidebar.
- `isDarkMode`: Toggles dark mode themes.
- `isCompactMode`: Toggles a denser layout.

These preferences are persisted across reloads using `redux-persist`.

### Server State (RTK Query) (`src/state/api.ts`)
Almost all data fetching is handled by RTK Query.
- The `api.ts` file defines a central API slice with a base query pointing to the backend.
- **Authentication Header**: The `prepareHeaders` function automatically attaches the AWS Cognito access token (retrieved via `fetchAuthSession()`) to every request.
- **Cache Tags**: The API uses tags like `"Projects"`, `"Tasks"`, `"Users"`, `"Teams"`, `"Activities"`, and `"FileUploads"` for automatic cache invalidation and UI updates after mutations.

## Authentication Context

Authentication is provided by **AWS Amplify's UI components** (`@aws-amplify/ui-react`).
- `AuthProvider.tsx` wraps the application content.
- It intercepts unauthenticated users and shows the Cognito login/signup forms.
- Once authenticated, it renders the child components (the dashboard).

## Styling

- **Tailwind CSS**: The primary styling engine. The configuration (`tailwind.config.ts`) includes custom colors (`dark-bg`, `blue-primary`, etc.) to support both light and dark modes.
- **CSS Variables & Overrides**: `globals.css` contains custom overrides for the Gantt chart library (`gantt-task-react`), standardizing its look and feel for dark/light mode and improving hover interactions.
- **Compact Mode**: CSS classes in `globals.css` reduce padding and margins globally when `html.compact` is active.

## UI Components Library

- **Material UI (MUI)**: Primarily used for the `DataGrid` component (e.g., in the Projects and Users list views). `src/lib/utils.ts` contains custom wrapper styles to make MUI DataGrid blend seamlessly with the Tailwind design and dark mode.
- **Lucide React**: Used extensively for iconography throughout the dashboard.
- **React Flow (`@xyflow/react`)**: Used for rendering the interactive Dependency Graph. Directed Acyclic Graph (DAG) auto-layout is handled via `dagre`.

## File Uploads

File uploads are handled by a custom hook `useS3Upload` (`src/hooks/useS3Upload.ts`).
- It implements a 3-step presigned URL flow:
  1. Requests a presigned PUT URL from the backend API.
  2. Uploads the file directly from the browser to AWS S3 using the presigned URL.
  3. Confirms the upload with the backend, which saves the file metadata to the database.
- The hook manages uploading state, progress percentage, and error handling.
