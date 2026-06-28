# Database Design for AI Features

This document outlines the database schema updates required to support the new AI modules, specifically focusing on the Sprint Planning feature and preparing for future scalability of the AI Task Analytics. 

*Note: No modifications to the actual Prisma schema files have been made.*

## 1. New Tables

### `Sprint`
Used to group tasks into time-boxed iterations, generated via the AI Sprint Planning feature.

| Column Name | Type | Constraints | Description |
|---|---|---|---|
| `id` | Int | Primary Key, Auto-increment | Unique identifier for the Sprint. |
| `name` | String | Not Null | Suggested by AI (e.g., "Sprint 1: Core API"). |
| `startDate` | DateTime | Not Null | The start date of the sprint. |
| `endDate` | DateTime | Not Null | The end date of the sprint. |
| `status` | String | Default: "Planned" | Status of the sprint (Planned, Active, Completed). |
| `projectId` | Int | Not Null, Foreign Key | Links the sprint to a specific project. |
| `createdAt` | DateTime | Default: `now()` | Timestamp of creation. |
| `updatedAt` | DateTime | Updated automatically | Timestamp of last update. |

### `ProjectInsight` (Future Extensibility)
Proposed for caching nightly AI risk analyses and standup reports to save API costs and improve dashboard performance.

| Column Name | Type | Constraints | Description |
|---|---|---|---|
| `id` | Int | Primary Key, Auto-increment | Unique identifier. |
| `projectId` | Int | Not Null, Foreign Key | The project this insight belongs to. |
| `riskLevel` | String | Not Null | "High", "Medium", "Low". |
| `summary` | String | Not Null | The Markdown summary of the analysis. |
| `generatedAt` | DateTime | Default: `now()` | When the AI generated this insight. |

## 2. New Columns on Existing Tables

### `Task` Table
To link tasks to the newly created AI-generated sprints.

| Column Name | Type | Constraints | Description |
|---|---|---|---|
| `sprintId` | Int | Nullable, Foreign Key | Associates a task with a specific Sprint. |

## 3. Relations

1. **Project (1) to Sprint (Many)**: 
   - A `Project` can have multiple `Sprint` records.
   - Deleting a `Project` should **Cascade** delete all associated `Sprint` records.
2. **Sprint (1) to Task (Many)**: 
   - A `Sprint` contains multiple `Task` records.
   - The relation on `Task` is optional (`sprintId` can be null for backlog tasks).
   - Deleting a `Sprint` should **Set Null** on the associated tasks' `sprintId` to return them to the backlog, rather than deleting the tasks themselves.
3. **Project (1) to ProjectInsight (Many)**:
   - A `Project` can have multiple historical AI insights.
   - Deleting a `Project` should **Cascade** delete all associated insights.

## 4. Indexes

To optimize database query performance, especially when checking project health or loading sprints:

1. **`Sprint` Table**:
   - `@@index([projectId])`: Fast retrieval of all sprints for a specific project.
   - `@@index([status])`: Filtering active vs. completed sprints.
2. **`Task` Table**:
   - `@@index([sprintId])`: Quickly load all tasks assigned to a specific sprint.
3. **`ProjectInsight` Table**:
   - `@@index([projectId, generatedAt(desc)])`: Optimizes the fetching of the most recent insights for the dashboard.

## 5. Migration Strategy

1. **Schema Update**: Add the new models and relations to `schema.prisma`.
2. **Migration Generation**: Run `npx prisma migrate dev --name add_sprint_and_insights` to create the SQL migration file.
3. **Seed Data (Optional)**: Update the `seed.ts` script to generate a few mock `Sprint` records for existing seeded projects so UI developers can test the new views.
4. **Deployment**: Run `npx prisma migrate deploy` in the CI/CD pipeline against the production AWS RDS PostgreSQL database.

## 6. Backward Compatibility

- **Task Backlog**: Because `sprintId` on the `Task` model is nullable (`Int?`), all existing tasks in the database will remain valid. They will act as "backlog" tasks without a sprint.
- **API Responses**: Existing `GET /tasks` queries will simply return `sprintId: null` for old tasks, meaning no frontend breakage.
- **Frontend Fallbacks**: The frontend must safely handle tasks that lack a `sprintId` by categorizing them into a "Backlog" column or list.

## 7. Future Extensibility

- **Sprint Metrics**: The `Sprint` table can be expanded later to include `completedPoints` and `plannedPoints` columns to generate automated burndown charts.
- **Insight Feedback**: The `ProjectInsight` table can receive an `isHelpful` (Boolean) column so users can rate AI predictions, allowing for fine-tuning or prompt adjustments based on user feedback.
