# AI Features System Design

This document outlines the system design for four new AI modules to be integrated into the TaskMatrix application.

## 1. Feature: AI-Driven Sprint Planning & Generation

### Purpose
To automatically analyze project backlog tasks, team velocity, and story points, and recommend optimal Sprint groupings.

### User Flow
1. User navigates to the Project Board or a new "Sprint Planning" tab.
2. User clicks "Generate Sprint".
3. A loading indicator appears while the AI analyzes the backlog.
4. User is presented with a proposed Sprint containing a list of tasks, estimated total points, and suggested dates.
5. User can accept, modify, or reject the proposed Sprint.

### Backend Flow
1. Receive request with `projectId` and `teamId`.
2. Fetch unassigned/backlog tasks for the project.
3. Fetch team members and their current workload.
4. Construct a prompt for Gemini containing the backlog tasks and team data.
5. Parse the AI response and return the suggested Sprint plan to the frontend.

### Frontend Flow
1. Create a new `SprintPlanning` UI component or modal.
2. Add an RTK Query endpoint `useGenerateSprintMutation` in `api.ts`.
3. Handle loading states and display the result in a temporary draft view.
4. On user approval, fire mutations to update the status/tags of the selected tasks to reflect the active Sprint.

### Database Impact
- **New Model**: Introduce a `Sprint` model (id, name, startDate, endDate, projectId, status).
- **Update Task Model**: Add `sprintId` as an optional foreign key to `Task`.

### AI Flow
- **Model**: `gemini-2.5-flash`
- **Input**: JSON list of backlog tasks (id, title, priority, points) and team capacity.
- **Output Schema**: JSON array of selected task IDs, suggested sprint name, and total points.

### API Flow
- `POST /ai/sprint-plan`: Triggers the AI generation.
- Request: `{ projectId: number, sprintDurationDays: number }`
- Response: `{ suggestedName: string, selectedTaskIds: number[], expectedPoints: number }`

### Security
- Ensure the user requesting the Sprint has `ADMIN` or Project Owner permissions via existing `authMiddleware`.
- Validate that the AI only recommends tasks belonging to the specified `projectId`.

### Performance
- AI generation may take several seconds; the backend should implement an in-memory lock (similar to `activeRequests` in `aiController.ts`) to prevent concurrent requests for the same project.

### Caching
- The AI response is not cached via RTK Query (it's a mutation).
- Once the Sprint is accepted, invalidate `"Tasks"` and `"Projects"` cache tags to refresh the board.

### Future Scalability
- Can be expanded to factor in historical team velocity (average points completed per sprint) to make capacity planning more accurate.

---

## 2. Feature: AI Task Analytics & Risk Prediction

### Purpose
To analyze active tasks and activity logs to identify potential blockers, scope creep, or overdue tasks, presenting them in a new dashboard widget.

### User Flow
1. User logs into the Dashboard.
2. A new "Project Health Insights" widget automatically loads.
3. The widget displays AI-generated risk warnings (e.g., "Task X is likely to be delayed due to Y").

### Backend Flow
1. Receive request for project health.
2. Fetch the project's active tasks, overdue tasks, and recent activity logs.
3. Send this context to Gemini to analyze for patterns of delay or bottleneck.
4. Return a list of identified risks and recommended actions.

### Frontend Flow
1. Create a `ProjectHealthWidget` component for the Dashboard.
2. Use an RTK Query hook `useGetProjectRisksQuery`.
3. Render the insights using warning alerts (UI components).

### Database Impact
- No structural DB changes required. The feature relies purely on existing `Task` and `Activity` tables.

### AI Flow
- **Model**: `gemini-2.5-flash`
- **Input**: Task list with deadlines, status, and recent activity events.
- **Output Schema**: JSON array of objects: `{ taskId, riskLevel, reason, suggestedAction }`.

### API Flow
- `GET /ai/project-risks?projectId={id}`
- Response: JSON array of risk insights.

### Security
- Restrict endpoint access to users assigned to the project or team admins using `requireProjectExists` middleware.

### Performance
- Since this loads on the Dashboard, it should be fetched asynchronously without blocking the main KPI cards.
- Could be computationally expensive on the AI side if there are too many activities. Input must be truncated to the most recent/relevant data.

### Caching
- Backend can cache the AI response in memory (or Redis, if available) for a short duration (e.g., 1 hour) to save API costs, as risk profiles do not change every second.
- Frontend RTK Query can cache the response with a `"Risks"` tag.

### Future Scalability
- Transition from on-the-fly AI generation to a background cron job that analyzes projects nightly and saves insights to a new `ProjectInsight` DB table.

---

## 3. Feature: Enhanced AI Task Breakdown

### Purpose
To upgrade the existing AI Task Breakdown feature by incorporating file attachments (e.g., PRD documents) into the AI context for more accurate subtask generation.

### User Flow
1. User creates a task and uploads a requirements document (PDF/TXT) via the existing S3 uploader.
2. User clicks "AI Breakdown from Document".
3. The AI reads the document and generates subtasks.

### Backend Flow
1. Receive the breakdown request containing an S3 `fileUrl` or `fileKey`.
2. Fetch the file content from S3.
3. Pass the file text + team workload to Gemini.
4. Return the structured subtasks.

### Frontend Flow
1. Update `ModalNewTask` or `TaskDetailsModal` to allow triggering AI breakdown *after* a file is uploaded.
2. Pass the `attachmentId` or S3 key to the backend in the API call.

### Database Impact
- No structural changes. Utilizes existing `Attachment` and `FileUpload` tables.

### AI Flow
- **Model**: `gemini-2.5-flash`
- **Input**: The parsed text of the document, task title, and team capacity.
- **Output Schema**: Same as the existing feature (JSON array of subtasks).

### API Flow
- `POST /ai/breakdown-enhanced`
- Request: `{ title, description, projectId, attachmentId }`
- Response: JSON array of subtasks.

### Security
- Ensure the user has permission to read the specified attachment.
- S3 files must be fetched securely by the backend before sending to Gemini.

### Performance
- Parsing PDFs or large text files on the Express server can consume memory. Use streams where possible.
- AI request payload size increases, which may increase latency.

### Caching
- No caching for the mutation, but `activeRequests` lock must be maintained.

### Future Scalability
- Support for images or diagrams (using Gemini's multimodal capabilities) to generate tasks from UI mockups.

---

## 4. Feature: Activity Pattern Recognition & Standup Generation

### Purpose
To automatically generate daily standup summaries or weekly progress reports based on user activity logs.

### User Flow
1. User visits the Team page.
2. User clicks "Generate Weekly Report".
3. AI generates a summary of what the team accomplished, what is in progress, and who did what.
4. User can copy the report to share in Slack/Email.

### Backend Flow
1. Receive request with `teamId` and a timeframe (e.g., last 7 days).
2. Fetch all `Activity` records for the team's users within the timeframe.
3. Pass the activities to Gemini to summarize.
4. Return a markdown-formatted report.

### Frontend Flow
1. Create a `ReportGenerator` component on the Team detail page.
2. Use an RTK Query endpoint `useGenerateReportMutation`.
3. Render the output using a Markdown viewer component.

### Database Impact
- No DB structural changes needed. Relies on the existing `Activity` log.

### AI Flow
- **Model**: `gemini-2.5-flash`
- **Input**: JSON list of `Activity` records (action, entity, details, user, timestamp).
- **Output Schema**: Unstructured Markdown text containing headers, bullet points, and summaries.

### API Flow
- `GET /ai/team-report?teamId={id}&days={number}`
- Response: `{ reportMarkdown: string }`

### Security
- Only Team ADMIN or MANAGER should be able to generate team-wide reports.
- Enforced via backend `authMiddleware` and team membership checks.

### Performance
- Database query for 7 days of activities could be large. Pagination or limit might be needed before sending to AI.
- Gemini context window (up to 1M tokens for Flash) can handle large activity logs, but latency will scale with log size.

### Caching
- Frontend can cache the report temporarily, but usually, this is an on-demand generation.

### Future Scalability
- Implement an automated email service (e.g., AWS SES) to email these reports to the Team Lead every Friday at 5 PM.

---

## Reusable Components Identified

1. **AI Deduplication Lock**: The `activeRequests` Set logic in `aiController.ts` should be extracted into a reusable utility (e.g., `src/utils/aiLock.ts`) to be used across all four new AI features.
2. **Team Workload Aggregator**: The logic to calculate active points per user (`prisma.task.aggregate`) is needed for Features 1 and 3. This should be extracted into a shared service function (e.g., `teamService.getMemberWorkloads()`).
3. **Gemini Client Instance**: The `const ai = new GoogleGenAI(...)` initialization can be moved to a shared `aiService.ts` to avoid re-initializing in multiple controllers.
4. **Markdown Renderer (Frontend)**: A `MarkdownViewer` component will be needed to render the AI Standup report (Feature 4), which can also be reused if task descriptions eventually support markdown.
5. **Loading States (Frontend)**: An `AILoadingOverlay` component to provide consistent feedback across Sprint Generation, Risk Analysis, and Report Generation.
