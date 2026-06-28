# Health Score Feature Architecture

## Overview
The AI Project Health Score feature evaluates the overall health of a project (0-100) by analyzing task completion rates, upcoming deadlines, team workload, and recent activity logs. The AI component provides actionable insights and risk mitigation strategies based on this score.

## Folder Structure
```
server/src/
├── controllers/
│   └── healthController.ts       # Handles HTTP requests for project health
├── services/
│   ├── healthService.ts          # Core logic for aggregating metrics
│   └── aiHealthService.ts        # Communicates with Gemini API for insights
├── repository/
│   └── projectMetricsRepo.ts     # Data access layer for raw DB queries
```
client/src/
├── app/projects/[id]/health/     # Next.js page for health dashboard
├── components/
│   ├── HealthScoreGauge.tsx      # Visual representation of 0-100 score
│   └── RiskFactorsList.tsx       # AI-generated risk list
```

## Architectural Components

### Controllers
The `healthController` sits at the entry point of the API request. It parses the `projectId`, validates the user's access via `authMiddleware`, and delegates business logic to the `healthService`.

### Services
- **`healthService`**: Orchestrates the data gathering. It calls the repository to get raw task/activity data, applies the deterministic scoring algorithm, and then passes the result to the AI service.
- **`aiHealthService`**: Dedicated to LLM integration. It formats the deterministic data into a prompt, handles rate limiting/deduplication, and parses the structured JSON response from Gemini.

### Repository
While Prisma acts as the primary ORM, a dedicated `projectMetricsRepo` abstracts complex aggregations (e.g., counting overdue tasks, calculating average time to completion) to keep the service layer clean.

### Frontend Components
- **`HealthScoreGauge`**: A Recharts or SVG-based radial gauge displaying the 0-100 score.
- **`RiskFactorsList`**: Renders the AI-identified risks using warning/alert UI components.

## Health Calculation Flow
1. **Request**: Client requests `GET /projects/:projectId/health`.
2. **Aggregation**: Backend repository aggregates total tasks, overdue tasks, completed points, and recent activity.
3. **Deterministic Scoring**: Service applies a mathematical formula (the Scoring Algorithm) to calculate a baseline score.
4. **AI Analysis**: The baseline score and raw metrics are sent to Gemini.
5. **Enrichment**: Gemini returns a qualitative analysis (risks, recommendations).
6. **Response**: The combined payload (score + AI insights) is returned to the client.
