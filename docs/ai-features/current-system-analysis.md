# Current System Analysis

This document provides an overview of the existing architecture, data models, APIs, and potential extension points to support the implementation of new AI modules.

## 1. Existing Architecture & Components

The system is a modern web application consisting of a frontend and a backend service.
- **Frontend**: Next.js (React) utilizing Tailwind CSS, Redux Toolkit, RTK Query, and Recharts for data visualization.
- **Backend**: Node.js/Express.js providing a RESTful API.
- **Database Layer**: PostgreSQL managed by Prisma ORM.

### Reusable Services
- **S3 Service** (`s3Service.ts`): Handles file uploads and storage, useful for AI processing of documents.
- **AI Service** (Google GenAI): Already integrated via `@google/genai` in `aiController.ts`.

### Dashboard & Analytics
- **Dashboard**: The `HomePage` acts as the primary dashboard displaying KPIs, Task Distribution (Bar Chart), Task Status (Pie Chart), and Recent Activity.
- **Analytics**: Analytics are currently integrated into the Dashboard using Recharts to visualize task data, priorities, and workloads. No dedicated separate Analytics page exists, but the structure supports extending dashboard widgets.

## 2. Current Data Models

### Project Model
- **Table**: `Project`
- **Fields**: `id`, `name`, `description`, `startDate`, `endDate`, `teamId`, `ownerId`.
- **Relationships**: Owns `tasks`, associates with `projectTeams`, creates `activities`, owned by a `User`, and optionally tied to a `Team`.

### Task Model
- **Table**: `Task`
- **Fields**: `id`, `title`, `description`, `status`, `priority`, `tags`, `startDate`, `dueDate`, `points`.
- **Relationships**: Linked to `Project`, `authorUserId` (Creator), `assignedUserId` (Assignee), `attachments`, `comments`, and `activities`.

### Activity Log
- **Table**: `Activity`
- **Fields**: `id`, `userId`, `projectId`, `taskId`, `action` (e.g., CREATED, UPDATED), `entity`, `details`, `createdAt`.
- **Purpose**: Auditing and recent activity widgets. Could serve as context for AI analytics.

### Team Members
- **Tables**: `Team`, `UserTeam`, `User`
- **Details**: Users have roles (`ADMIN`, `MANAGER`, `MEMBER`). A `User` can belong to a team directly (`teamId`) or via the `UserTeam` joining table. `ProjectTeam` links a `Project` to a `Team`.

### Sprint Implementation
- **Status**: Currently, there is **no formal Sprint model** implemented in the database schema.
- Tasks are managed via start/due dates, priority, and tags rather than dedicated Sprint entities.

## 3. Existing APIs

The backend provides several reusable REST APIs under `src/controllers`:

- **Project APIs** (`projectController.ts`): Fetching, creating, updating projects.
- **Task APIs** (`taskController.ts`): Managing tasks and status updates.
- **User APIs** (`userController.ts`): Fetching authenticated users and team data.
- **Team APIs** (`teamController.ts`): Managing teams and roles.
- **Activity APIs** (`activityController.ts`): Retrieving activity logs for the dashboard.
- **Search APIs** (`searchController.ts`): Global search capabilities.
- **Upload APIs** (`uploadController.ts`): File upload management.
- **AI APIs** (`aiController.ts`): Contains `generateTaskBreakdown` to break down a project task and intelligently assign subtasks based on user workload.

## 4. Possible Extension Points for AI Features

1. **Sprint Planning & Generation**: Since Sprints do not exist, a new `Sprint` model could be introduced. AI can be extended to automatically bundle backlog tasks into a suggested Sprint based on story points and team velocity.
2. **AI Task Analytics**: The current dashboard fetches `activities` and `tasks`. New AI APIs can analyze these metrics to predict project delays or suggest resource re-allocations in a new "AI Analytics" dashboard widget.
3. **Enhanced AI Controller**: The existing `aiController.ts` handles task breakdown but can be extended with new endpoints (e.g., `generateSprintPlan`, `predictRisks`, `summarizeProjectStatus`).
4. **Activity Pattern Recognition**: The existing `Activity` table data can be fed into GenAI to summarize daily standups or weekly progress reports.
