# Health Score API Documentation

## Get Project Health

Calculates and returns the overall health score and AI insights for a specific project.

### Endpoint
`GET /api/projects/:projectId/health`

### Authentication
Requires valid Cognito JWT `Authorization: Bearer <token>`.
User must be an ADMIN or assigned to the project.

### Request Parameters
- `projectId` (URL Param): ID of the project.

### Response Payload (200 OK)
```json
{
  "projectId": 123,
  "calculatedScore": 78,
  "status": "At Risk",
  "metrics": {
    "totalTasks": 45,
    "overdueTasks": 3,
    "completedPoints": 120,
    "totalPoints": 200,
    "daysSinceLastActivity": 2
  },
  "aiInsights": {
    "summary": "The project is slightly behind schedule due to frontend bottlenecks.",
    "topRisks": [
      "3 tasks are overdue in the UI pipeline.",
      "User 'johndoe' is overloaded with 60% of the remaining story points."
    ],
    "recommendations": [
      "Reassign 'Dashboard UI' task to another frontend developer.",
      "Extend the sprint deadline by 2 days."
    ]
  },
  "generatedAt": "2026-06-28T12:00:00Z"
}
```

### Error Responses
- **401 Unauthorized**: Missing or invalid token.
- **403 Forbidden**: User does not have access to this project.
- **404 Not Found**: Project does not exist.
- **429 Too Many Requests**: An AI health calculation is already in progress for this project.
