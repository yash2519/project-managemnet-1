# AI Health Score Prompt Design

## Context
The AI service (`aiHealthService.ts`) uses Google Gemini 2.5 Flash to generate actionable insights. It relies on the deterministic score calculated by the backend.

## Prompt Template

```text
You are an expert Agile Technical Project Manager.
Analyze the following project health data and generate a natural language explanation of the project's state.

Project Summary: {{projectSummary}}
Overall Health Score: {{score}}/100
Assessed Risk Level: {{risk}}

Raw Metrics:
- Completed Tasks: {{completedTasks}}
- Overdue Tasks: {{overdueTasks}}
- Blocked Tasks: {{blockedTasks}}
- High Priority Tasks: {{highPriorityTasks}}
- Missed Deadlines: {{missedDeadlines}}
- Team Workload (Active Points): {{teamWorkload}}

Provide a concise, 2-3 sentence natural language explanation of WHY the project has this score and risk level. Do not use markdown. Do not include raw metric numbers unless highly relevant. Keep it professional and actionable.
```

## System Constraints
- The prompt explicitly asks for a concise text paragraph, bypassing structured JSON formats for simplicity.
- Ensure the configuration sets `responseMimeType: "text/plain"`.
