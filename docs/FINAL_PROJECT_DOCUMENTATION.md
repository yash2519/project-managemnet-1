# 01 — Project Overview

## Application Name

**TaskMatrix** — A full-stack Project Management Dashboard.

---

## Purpose

TaskMatrix is a comprehensive project management platform that enables teams to:

- Create and manage projects with start/end dates and ownership
- Organize tasks across multiple views (Board, List, Table, Timeline/Gantt)
- Assign tasks to team members with priority levels and story points
- Collaborate via comments and file attachments
- Track activity streams across projects and tasks
- Search across tasks, projects, and users
- Upload files (profile pictures, task attachments, project documents) to AWS S3
- Use AI (Google Gemini 2.5 Flash) to intelligently break down tasks into subtasks

---

## Architecture Style

**Monorepo** with two distinct workspaces:

| Workspace | Technology |
|-----------|-----------|
| `client/` | Next.js 14 (App Router), TypeScript, Redux Toolkit, RTK Query, TailwindCSS, MUI |
| `server/` | Node.js, Express 4, TypeScript, Prisma ORM, PostgreSQL |

Communication is via a **REST API**. Authentication is handled by **AWS Cognito** (frontend via Amplify, backend via JWT decode + Prisma lookup).

---

## Technology Stack Summary

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.5 (App Router) |
| Language | TypeScript 5 |
| Styling | TailwindCSS 3.4 + custom design tokens |
| UI Components | MUI v5 (DataGrid), Lucide-React icons |
| State Management | Redux Toolkit 2.2 + Redux Persist |
| API Layer | RTK Query (`@reduxjs/toolkit/query/react`) |
| Authentication | AWS Amplify v6 + AWS Cognito |
| Charts | Recharts 2 |
| Gantt Chart | `gantt-task-react` |
| Drag & Drop | `react-dnd` v16 |
| File Upload | Custom `useS3Upload` hook (presigned S3 URLs) |
| Font | Inter (Google Fonts) |

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express 4 |
| Language | TypeScript 5 |
| ORM | Prisma 5.22 |
| Database | PostgreSQL (AWS RDS) |
| Authentication | JWT decode + Prisma user lookup |
| File Storage | AWS S3 (`@aws-sdk/client-s3` + presigned URLs) |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
| Logging | Morgan |
| Security | Helmet |
| Process Manager | PM2 |

### Cloud Infrastructure
| Service | Purpose |
|---------|---------|
| AWS Cognito | User authentication (sign-up / sign-in / JWT tokens) |
| AWS S3 | File storage (profile pictures, task attachments, project documents) |
| AWS EC2 | Backend server hosting |
| AWS RDS | PostgreSQL database hosting |
| AWS Amplify | Frontend hosting (optional) |

---

## High-Level Data Flow

```
Browser (Next.js)
    |
    +-- AWS Cognito ------------ (Authenticator UI -> JWT Access Token)
    |
    +-- RTK Query (API calls) -- Bearer Token --> Express API (EC2 :8000)
    |                                                |
    |                                          Auth Middleware
    |                                          (JWT decode -> Prisma user lookup)
    |                                                |
    |                                         Controllers
    |                                                |
    |                                        Prisma ORM --> PostgreSQL (RDS)
    |                                                |
    |                                        S3 Service --> AWS S3 Bucket
    |                                                |
    |                                        Gemini AI --> Google AI API
    |
    +-- AWS S3 (direct PUT via presigned URL) -- File Upload
```

---

## Key Roles

| Role | Capabilities |
|------|-------------|
| `ADMIN` | Full access - sees all projects, tasks, users, activities |
| `MANAGER` | Defined in schema, not fully enforced at route level |
| `MEMBER` | Default role - sees own projects + assigned tasks only |

---

## Environment Variables (Summary)

### Server (`server/.env`)
| Variable | Purpose |
|----------|---------|
| `PORT` | Express server port (default 3000 / 8000 on EC2) |
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `AWS_REGION` | S3 region (default `us-east-1`) |
| `AWS_S3_BUCKET` | S3 bucket name (default `pm-s3-images`) |
| `AWS_S3_BASE_URL` | Public base URL for S3 assets |
| `AWS_ACCESS_KEY_ID` | (Optional) AWS credentials - falls back to EC2 instance role |
| `AWS_SECRET_ACCESS_KEY` | (Optional) AWS credentials |

### Client (`client/.env.local`)
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | AWS Cognito User Pool ID |
| `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID` | AWS Cognito App Client ID |
# 02 — Folder Structure

The repository is structured as a monorepo containing two main directories: `client` and `server`.

## Root Directory

```text
/
├── client/                 # Next.js frontend application
├── server/                 # Node.js + Express backend application
├── docs/                   # Documentation (including this architecture guide)
└── README.md               # Main project setup guide
```

## Client Directory Structure (`/client`)

The frontend follows the Next.js App Router conventions with a Redux Toolkit state management setup.

```text
client/
├── public/                 # Static assets (images, icons)
├── src/
│   ├── app/                # Next.js App Router root
│   │   ├── home/           # Route: Home dashboard
│   │   ├── projects/       # Route: Projects list and details
│   │   ├── tasks/          # Route: Tasks management
│   │   ├── teams/          # Route: Teams management
│   │   ├── users/          # Route: Users list
│   │   ├── timeline/       # Route: Gantt timeline view
│   │   ├── authProvider.tsx # AWS Cognito authentication wrapper
│   │   ├── dashboardWrapper.tsx # Layout wrapper with sidebar and navbar
│   │   ├── globals.css     # Global styles (Tailwind, custom Gantt chart CSS)
│   │   ├── layout.tsx      # Root layout
│   │   └── redux.tsx       # Redux store provider and persistence setup
│   ├── components/         # Reusable UI components
│   │   ├── Header/         # Page header component
│   │   ├── Modal*/         # Various modal components (Task, Project edit/create)
│   │   ├── Navbar/         # Top navigation bar
│   │   ├── Sidebar/        # Side navigation menu
│   │   └── ...             # Other shared components (TaskCard, ProjectCard, etc.)
│   ├── hooks/              # Custom React hooks
│   │   └── useS3Upload.ts  # Hook for managing AWS S3 file uploads
│   ├── lib/                # Utility functions
│   │   └── utils.ts        # DataGrid styles, date formatting
│   └── state/              # Redux Toolkit state management
│       ├── api.ts          # RTK Query API slice (endpoints for all backend resources)
│       └── index.ts        # Global slice (UI state: sidebar, dark mode)
├── tailwind.config.ts      # Tailwind CSS configuration
├── next.config.mjs         # Next.js configuration (configured remote patterns for images)
└── package.json            # Frontend dependencies
```

## Server Directory Structure (`/server`)

The backend follows a standard Express MVC-like pattern (Routes -> Controllers -> Services).

```text
server/
├── prisma/                 # Database schema and seed data
│   ├── migrations/         # Prisma migration history
│   ├── seedData/           # JSON files for initial database seeding
│   ├── schema.prisma       # Prisma schema definition
│   └── seed.ts             # Script to populate the database
├── src/
│   ├── controllers/        # Request handlers (business logic)
│   │   ├── activityController.ts
│   │   ├── aiController.ts # Google Gemini AI integration
│   │   ├── projectController.ts
│   │   ├── searchController.ts
│   │   ├── taskController.ts
│   │   ├── teamController.ts
│   │   ├── uploadController.ts
│   │   └── userController.ts
│   ├── middleware/         # Express middleware
│   │   └── auth.ts         # JWT decoding and user lookup (Cognito integration)
│   ├── routes/             # Express route definitions
│   │   └── *Routes.ts      # Route mappings for each resource
│   ├── services/           # Shared business logic and external service integrations
│   │   └── s3Service.ts    # AWS S3 presigned URL generation and file deletion
│   └── index.ts            # Express server entry point and configuration
├── .env.example            # Example environment variables
├── aws-ec2-instructions.md # Deployment instructions for AWS EC2
├── ecosystem.config.js     # PM2 configuration for production process management
└── package.json            # Backend dependencies
```
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

## Client vs Server Components

- Because the dashboard requires heavy interactivity (drag and drop, modals, forms) and client-side state (Redux), almost all components in the `src/app/` directory begin with `"use client";`.
- Server-side rendering (SSR) is minimally utilized in this specific architecture, trading initial load SEO for rich client-side dashboard functionality.

## Component Communication

- **Global State**: Redux (`isSidebarCollapsed`, `isDarkMode`) is used for UI state that affects the entire application shell.
- **Server State**: Data is passed downwards from page components (which call RTK Query hooks) to presentational components (cards, views) via props.
- **Modals**: Modals are generally controlled by boolean state variables in the parent page component (e.g., `isModalNewProjectOpen`) and conditionally rendered.
# 06 — API Architecture

## Overview

The application communicates via a **RESTful API** served by Express.js on the backend.
The frontend consumes these APIs exclusively through **Redux Toolkit Query (RTK Query)**.

## Frontend RTK Query Configuration

- Defined in `client/src/state/api.ts`.
- `fetchBaseQuery` is configured with `NEXT_PUBLIC_API_BASE_URL`.
- The `prepareHeaders` function automatically intercepts every outgoing request and injects the `Authorization: Bearer <token>` header by calling AWS Amplify's `fetchAuthSession()`.
- **Cache Tags**: The API uses strict tagging (`Projects`, `Tasks`, `Users`, `Teams`, `AuthUser`, `Activities`, `FileUploads`) to ensure that mutations automatically trigger refetches of related data.

## Backend Route Structure

Routes are mounted in `server/src/index.ts` under standard REST resource paths:

| Base Path | Router File | Purpose |
|-----------|-------------|---------|
| `/projects` | `projectRoutes.ts` | CRUD for projects |
| `/tasks` | `taskRoutes.ts` | CRUD for tasks, status updates |
| `/search` | `searchRoutes.ts` | Global search endpoint (`GET /search?query=...`) |
| `/users` | `userRoutes.ts` | User retrieval, creation, profile updates |
| `/teams` | `teamRoutes.ts` | Team management, adding/removing members |
| `/activities`| `activityRoutes.ts`| Fetching the activity stream/audit log |
| `/uploads` | `uploadRoutes.ts` | Presigned URL generation and confirmation |
| `/ai` | `aiRoutes.ts` | Triggering Gemini task breakdowns |

## Common API Patterns

### Presigned URL Upload Flow (S3)

Uploading files bypassing the Node.js server to save bandwidth and memory:
1. **Client** calls `POST /uploads/presign` with the file metadata (name, type, size).
2. **Server** returns a temporary, secure S3 PUT URL and an `s3Key`.
3. **Client** executes a direct `PUT` request to the S3 URL with the file binary.
4. **Client** calls `POST /uploads/confirm` with the `s3Key` and `publicUrl`.
5. **Server** saves a `FileUpload` record in PostgreSQL.

### AI Task Breakdown Flow
1. **Client** calls `POST /ai/breakdown` with task details and context.
2. **Server** fetches the current team workload from the DB.
3. **Server** sends a prompt to Google Gemini.
4. **Server** parses the JSON response from Gemini, enforces limits, and returns the subtasks to the client.

## Security & Rate Limiting
- All routes (except `OPTIONS` preflight) require a valid JWT token via the `authMiddleware`.
- The AI endpoint implements a basic in-memory lock (`activeRequests` Set) keyed by `projectId_taskTitle` to prevent duplicate concurrent requests and avoid API rate limits.
# 05 — Database Architecture

The application uses **PostgreSQL** accessed via the **Prisma ORM**. The schema is defined in `server/prisma/schema.prisma`.

## Core Entities and Relationships

### 1. User
- Represents an authenticated user (linked to AWS Cognito via `cognitoId`).
- Belongs to teams via the `UserTeam` join table (`teams` relation).
- Can own projects (`ownedProjects`).
- Can author or be assigned to tasks.
- Tracks `roleName` (custom job title) and a system `Role` enum (ADMIN, MANAGER, MEMBER).

### 2. Team
- Represents a group of users.
- Connects to `User` via the `UserTeam` join table.
- Connects to `Project` via the `ProjectTeam` join table (a project can be shared with multiple teams).

### 3. Project
- The high-level container for work.
- Has an `ownerId` (User).
- Contains multiple `Task` records.
- Logs actions to the `Activity` table.

### 4. Task
- Represents a unit of work within a Project.
- Has status, priority, dates, points, tags.
- Has an `authorUserId` and an `assignedUserId`.
- Can have `Comment`s and `Attachment`s.
- Logs actions to the `Activity` table.

### 5. FileUpload
- Centralized tracking for files stored in S3.
- Tracks `s3Key`, `publicUrl`, `mimeType`, and `uploadType` (enum: PROFILE_PICTURE, TASK_ATTACHMENT, PROJECT_DOCUMENT, GENERAL).
- Links back to the uploading User.

### 6. Activity
- An audit log or activity stream.
- Records actions (e.g., "CREATED", "UPDATED") on entities ("Project", "Task").
- Links optionally to `User`, `Project`, and `Task` for filtering.

## Enums

- **Role**: `ADMIN`, `MANAGER`, `MEMBER`
- **UploadType**: `PROFILE_PICTURE`, `TASK_ATTACHMENT`, `PROJECT_DOCUMENT`, `GENERAL`

## Cascade Behaviors

The Prisma schema natively leverages database-level constraints for referential integrity:
- **Cascade Deletions**: Deleting a `Project` natively cascades to its `Task`s, `Activity` logs, and `ProjectTeam` relationships. Deleting a `Task` cascades to its `Comment`s, `Attachment`s, and `TaskAssignment`s. Deleting a `Team` or `User` cascades their membership in join tables (`UserTeam`, `ProjectTeam`, `TaskAssignment`).
- **Restricted Deletions**: By default, critical user-generated relations (e.g., `ownerId` on `Project`, `authorUserId` on `Task`) restrict `User` deletion. User deletion requires manual ownership transfer in business logic.
- **Nullified Deletions**: Deleting a `Team` removes it from associated projects by setting `teamId` to `null`. Deleting an assigned `User` sets `assignedUserId` on the task to `null`.

## Seeding

A seed script (`server/prisma/seed.ts`) reads JSON files from the `seedData/` directory and populates the database with initial teams, users, projects, and tasks for development and testing.
# 08 — Coding Guidelines

## TypeScript Usage

- Use **TypeScript** strictly for all new files (`.ts` or `.tsx`). Avoid using plain `.js` unless strictly necessary for configuration files (e.g., `ecosystem.config.js`).
- Define explicit interfaces or types for all data structures, especially API responses and Redux state.
- Avoid using `any`. If the type is truly unknown, prefer `unknown` or narrow the type with type guards.
- For RTK Query, interface definitions are centralized in `server/src/state/api.ts` (e.g., `export interface Task { ... }`). Keep these in sync with the Prisma schema.

## React & Next.js

- Use **Functional Components** with Hooks. Do not use Class Components.
- When creating interactive components in the Next.js `app/` directory, ensure the file starts with `"use client";`.
- Extract complex logic into custom hooks (e.g., `useS3Upload`).
- Avoid prop drilling deeper than 2-3 levels. If data needs to go deeper, consider using Redux (for UI state) or RTK Query hooks directly in the child component.

## Styling

- Use **Tailwind CSS** utility classes for styling.
- Avoid writing custom CSS in `globals.css` unless necessary for overriding third-party libraries (like the Gantt chart) or defining global CSS variables.
- Use the established Tailwind color palette (e.g., `text-blue-primary`, `bg-dark-secondary`) to ensure consistency across light and dark modes.
- Always include `dark:` variants for colors to maintain dark mode compatibility.

## Backend Express

- Use `async/await` for asynchronous operations.
- Always wrap controller logic in `try/catch` blocks and return appropriate HTTP status codes (400 for bad input, 401/403 for auth issues, 404 for not found, 500 for server errors).
- Do not put complex business logic directly in the route definitions. Keep routes clean (mapping path -> controller function).
- Ensure all routes that require authentication use the `authMiddleware`.

## Database (Prisma)

- Never query the database directly from the frontend.
- When deleting records with relations, ensure you handle cascading deletes properly (currently handled manually in transactions within the controllers).
- Keep the Prisma schema organized and properly document any complex relations.
# 09 — Naming Conventions

Consistency in naming helps maintain a readable and predictable codebase.

## Files and Directories

### Frontend
- **React Components**: Use PascalCase for filenames and directory names (e.g., `TaskCard.tsx`, `Sidebar/index.tsx`).
- **Next.js Routes**: Use lowercase, kebab-case for route directories (e.g., `app/projects/`, `app/timeline/`). Dynamic routes use brackets (e.g., `[id]`).
- **Hooks**: Use camelCase starting with `use` (e.g., `useS3Upload.ts`).
- **Utilities/Lib**: Use camelCase (e.g., `utils.ts`, `api.ts`).

### Backend
- **Controllers**: Use camelCase ending in `Controller` (e.g., `taskController.ts`).
- **Routes**: Use camelCase ending in `Routes` (e.g., `taskRoutes.ts`).
- **Services**: Use camelCase ending in `Service` (e.g., `s3Service.ts`).

## Code Elements

### TypeScript / JavaScript
- **Variables & Functions**: Use camelCase (e.g., `fetchTasks`, `isSidebarCollapsed`).
- **Interfaces & Types**: Use PascalCase (e.g., `Project`, `TaskAssignment`). Do not prefix with `I` (e.g., use `User`, not `IUser`).
- **Enums**: Use PascalCase for the enum name, and UPPER_SNAKE_CASE for the values (e.g., `UploadType.PROFILE_PICTURE`).
- **Constants**: Use UPPER_SNAKE_CASE for global constants (e.g., `MAX_FILE_SIZE_BYTES`, `DEFAULT_ALLOWED_MIME_TYPES`).
- **Components**: Use PascalCase for React component function names (e.g., `const TaskCard = () => { ... }`).

### Database (Prisma)
- **Models**: Use PascalCase (e.g., `model User`, `model ProjectTeam`).
- **Fields**: Use camelCase (e.g., `userId`, `teamName`, `createdAt`).
- **Foreign Keys**: Typically use the related model name followed by `Id` (e.g., `projectId`, `authorUserId`).

### API Endpoints
- Use lowercase, plural nouns for resource paths (e.g., `/projects`, `/tasks`).
- Use kebab-case for multi-word path segments (e.g., `/me/profile-picture`).
- HTTP verbs should map to actions: `GET` (read), `POST` (create), `PATCH` (update partial), `DELETE` (remove).
# Development Workflow

This document outlines the standard tooling and commands developers should use during their day-to-day workflow in the TaskMatrix project.

## Code Quality & Architecture Checking

In addition to standard building and testing, we use several tools to guarantee architectural integrity.

### Circular Dependency Analysis (`madge`)

Circular dependencies can cause extremely difficult-to-debug runtime errors (e.g., variables being `undefined` when a module is loaded before its dependency).

We use [Madge](https://github.com/pahen/madge) to statically analyze imports and detect circular loops.

**How to run:**

To verify your changes have not introduced a circular dependency, run the following command from the root of the workspace you are modifying:

```bash
# In the client workspace
cd client
npm run analyze:circular

# In the server workspace
cd server
npm run analyze:circular
```

**When to run:**
- Before opening a PR.
- If you encounter strange `undefined` exports during development.
- After significant refactoring or extracting code into shared utilities.

### Linting (ESLint)

ESLint is configured to catch programmatic errors without being overly opinionated about formatting.

```bash
# In the server workspace
cd server
npm run lint

# Auto-fix fixable issues
npm run lint:fix
```

# 03 — Complete Feature List

**Core Features:**
- Project creation, updating, and deletion
- Task management (Board, List, Table, Timeline views)
- Task assignment and prioritization
- Global Search across all entities
- User Teams and Role-based Access Control
- Activity Feed and Audit Logging
- AWS S3 Integration for direct file uploads (Profile pics, Task attachments)
- Dashboard KPIs and Chart visualizations

**AI Features:**
- **AI Task Breakdown**: Intelligent subtask generation based on team workload
- **AI Dependency Prediction**: Predicts missing dependencies between tasks
- **AI Project Health**: Holistic health score evaluating progress, blockers, and overdue tasks
- **AI Standup Generation**: Automated daily standup synthesis and historical analysis


# 04 — AI Features

### Currently Implemented
1. **AI Task Breakdown**: Invokes Google Gemini to decompose a complex task into manageable subtasks assigned appropriately based on team workloads.
2. **AI Dependency Prediction**: Scans all tasks in a project and identifies potential logical dependencies (e.g., Task B needs Task A) that users missed.
3. **AI Project Health**: Analyzes velocity, overdue tasks, and workload distribution to calculate a dynamic project health score and summary.
4. **AI Standup**: Automatically generates daily standup reports per project by analyzing yesterday's closed tasks, today's open tasks, and any logged activity or blockers. Includes historical comparison and export capabilities.

### Future Scope
- AI-driven capacity planning and automatic resource reallocation.
- Real-time automated risk mitigation suggestions.
- Chat-based AI project assistant for ad-hoc querying.


# 10 — Complete Component Map

- **Layouts**: `DashboardWrapper`, `Sidebar`, `Navbar`
- **Views**: `BoardView`, `ListView`, `TableView`, `TimelineView` (Gantt)
- **Cards**: `TaskCard`, `ProjectCard`, `UserCard`
- **Modals**: `ModalNewTask`, `ModalEditTask`, `ModalAssignTask`, `ModalNewProject`, `TaskDetailsModal`
- **Utilities**: `FileUploader`, `EmptyState`


# 11 — API Map

**Projects**
- `GET /projects`: Get projects
- `POST /projects`: Create project
- `GET /projects/:projectId`: Get project details
- `PATCH /projects/:projectId`: Update project
- `DELETE /projects/:projectId`: Delete project

**Tasks**
- `GET /tasks?projectId=`: Get tasks
- `POST /tasks`: Create task
- `PATCH /tasks/:taskId`: Update task
- `PATCH /tasks/:taskId/status`: Update status

**AI & Analytics (New)**
- `POST /ai/breakdown`: AI Task Breakdown
- `GET /projects/:projectId/health`: AI Project Health
- `GET /projects/:projectId/dependencies`: Predict Dependencies
- `GET /projects/:projectId/activity-timeline`: Project Activity Timeline
- `GET /projects/:projectId/daily-timeline`: Project Daily Timeline
- `GET /projects/:projectId/standup-analysis`: AI Standup Analysis
- `GET /projects/:projectId/team-workload`: Team Workload Metrics
- `POST /projects/:projectId/standup`: Generate Standup
- `GET /projects/:projectId/standup/today`: Get Today's Standup

**Other**
- `GET /search`: Global search
- `GET /users`: Get users
- `GET /teams`: Get teams
- `POST /uploads/presign`: S3 Upload presign


# 12 — Database Schema Summary

- **User**: `userId`, `cognitoId`, `role`, `profilePictureUrl`
- **Team**: `id`, `teamName`
- **Project**: `id`, `name`, `description`, `startDate`, `endDate`, `ownerId`
- **Task**: `id`, `title`, `status`, `priority`, `points`, `projectId`, `authorUserId`, `assignedUserId`
- **Activity**: Audit trail table
- **FileUpload**: S3 File attachments references
- **Join Tables**: `UserTeam`, `ProjectTeam`


# 30 — Future Development

- Transition AI models from Google Gemini 2.5 Flash to specialized smaller on-prem LLMs for data privacy.
- Implement real-time WebSocket updates for collaborative board edits.
- Support multi-tenant isolated organizational workspaces.


# 13 — Deployment Notes

Deploying TaskMatrix involves setting up infrastructure on AWS for the backend, database, and frontend.

## 1. Database Setup (AWS RDS)

- Create a PostgreSQL database instance in AWS RDS.
- Ensure the database is accessible from your backend EC2 instance (configure security groups appropriately).
- Copy the connection string and update the `DATABASE_URL` in the backend's `.env` file.
- Run `npx prisma migrate deploy` followed by `npm run seed` to initialize the production database schema and initial data.

## 2. Backend Deployment (AWS EC2)

The backend is deployed to an AWS EC2 instance. Detailed instructions are available in `server/aws-ec2-instructions.md`.

**High-Level Steps:**
1. Provision an EC2 instance (Amazon Linux or Ubuntu).
2. Install Node.js (via NVM) and Git.
3. Clone the repository and install backend dependencies (`npm i`).
4. Set up the `.env` file with required production variables:
   - `PORT=80` (or setup a reverse proxy like Nginx mapping 80/443 to your Node port).
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - AWS specific variables (`AWS_REGION`, `AWS_S3_BUCKET`). *Note: It is recommended to use EC2 IAM instance roles rather than hardcoding AWS Access Keys.*
5. Build the TypeScript code (`npm run build`).
6. Use **PM2** to manage the Node process:
   - Configure using `ecosystem.config.js`.
   - Start the server: `pm2 start ecosystem.config.js`.
   - Configure PM2 to start on system boot.

## 3. Frontend Deployment (AWS Amplify or Vercel)

The Next.js frontend can be deployed easily using platforms optimized for Next.js.

**If using AWS Amplify:**
1. Connect your repository to AWS Amplify Hosting.
2. Configure build settings to point to the `client/` directory.
3. Add environment variables in the Amplify console:
   - `NEXT_PUBLIC_API_BASE_URL` (pointing to your EC2 instance's IP or domain).
   - `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
   - `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID`
4. Deploy the application.

## 4. Other AWS Services

- **AWS Cognito**: Set up a User Pool and App Client for authentication. Do not generate a client secret if used in a web application.
- **AWS S3**: Create a bucket for image/file uploads. Ensure CORS settings allow PUT requests from your frontend domain. Ensure the bucket is public-read or configure CloudFront for secure asset delivery.
# 14 — Antigravity Context

This document provides specific context for AI agents working within the TaskMatrix codebase.

## Repository Overview

TaskMatrix is a monorepo containing a Next.js frontend (`client/`) and a Node.js/Express backend (`server/`). The stack utilizes TypeScript across both ends.

## Key Architectural Decisions to Respect

1. **State Management**: The frontend strictly uses Redux Toolkit for global UI state and RTK Query for data fetching. **Do not introduce SWR, React Query, or raw `fetch`/`axios` calls for API communication in components.** Follow the existing pattern in `client/src/state/api.ts`.
2. **Styling**: Tailwind CSS is the singular styling framework. **Do not write custom CSS or inline styles** unless absolutely necessary to override third-party components (like the Gantt chart in `globals.css`).
3. **Database Access**: The database is PostgreSQL accessed exclusively via Prisma. **Do not write raw SQL queries** unless performance dictates a specific edge case that Prisma cannot handle.
4. **File Uploads**: All file uploads must follow the presigned URL flow to AWS S3. **Do not implement endpoints that accept `multipart/form-data` file buffers directly on the Express server.** Use the provided `useS3Upload` hook.
5. **Authentication**: Handled by AWS Cognito. The backend trusts the JWT token decoded by the `authMiddleware`.
6. **Code Modification**: Before modifying existing Prisma schemas or complex components (like the DataGrid views or Gantt timeline), thoroughly review how data is currently fetched and transformed to avoid breaking existing UI dependencies.

## Standard Workflows for Agents

- **Adding a new feature (Frontend)**:
  1. Define the necessary interfaces in `client/src/state/api.ts`.
  2. Add endpoints to the RTK Query `api` slice.
  3. Create reusable components in `client/src/components/`.
  4. Create the specific route/page in `client/src/app/`.
- **Adding a new feature (Backend)**:
  1. Define changes in `server/prisma/schema.prisma` (if database changes are required).
  2. Create/update the controller logic in `server/src/controllers/`.
  3. Map the route in `server/src/routes/` and expose it in `server/src/index.ts`.
  4. Ensure the route uses `authMiddleware` if it requires an authenticated user.
