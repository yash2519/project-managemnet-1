# AI Dependency Failure Predictor — API Specification

## Endpoints

### 1. Analysis & Graph
- `GET /projects/:projectId/dependencies` — Predict failure risks with AI explanations
- `GET /projects/:projectId/dependencies/graph` — Retrieve the raw dependency graph
- `GET /projects/:projectId/dependencies/affected/:taskId` — Get all downstream tasks affected by a given task

### 2. Task Dependency Management (CRUD)
- `GET /projects/:projectId/dependencies/tasks/:taskId` — List all dependencies for a task
- `POST /projects/:projectId/dependencies/tasks/:taskId` — Add a new dependency
- `PATCH /projects/:projectId/dependencies/tasks/:taskId/:dependencyId` — Update a dependency
- `DELETE /projects/:projectId/dependencies/tasks/:taskId/:dependencyId` — Remove a dependency

---

## Authentication & Authorization

All requests require a valid AWS Cognito Bearer token in the `Authorization` header.

**Authorization Rules:**
The user must satisfy **at least one** of the following conditions:
1. User is the Project Owner
2. User has the `ADMIN` role
3. User is assigned to at least one task in the project

Failure to meet these conditions results in a `403 Forbidden` response.

---

## API Details

### `GET /projects/:projectId/dependencies` (Prediction Endpoint)

Executes the deterministic `FailurePredictionEngine` and requests an AI-generated explanation.

**Response (`200 OK`)**
```json
{
  "prediction": {
    "projectId": 4,
    "riskScore": 50,
    "riskLevel": "High",
    "affectedTasks": [10, 11, 15],
    "estimatedDelay": 3,
    "criticalTasks": [
      {
        "taskId": 10,
        "title": "Database Optimisation",
        "expectedDelayDays": 3,
        "isOnCriticalPath": true,
        "riskScore": 40,
        "riskLevel": "Critical",
        "reasons": ["Overdue by 3 day(s): -20 pts", "On critical path: -10 pts"]
      }
    ],
    "allAtRiskTasks": [...],
    "sprintImpacts": [
      {
        "sprintId": 2,
        "estimatedSprintDelayDays": 3,
        "likelyToMissDeadline": true
      }
    ],
    "reasoningData": {
      "baseScore": 100,
      "deductions": [{ "reason": "1 critical-path task(s) are overdue", "points": 30 }],
      "bonuses": [],
      "finalScore": 50,
      "riskLevel": "High"
    },
    "generatedAt": "2026-06-28T12:00:00Z"
  },
  "affectedTasks": [10, 11, 15],
  "aiExplanation": "The database optimization task is overdue and blocking critical downstream dependencies, placing Sprint 2 at high risk.",
  "recommendations": [
    "Reassign the optimization task to unblock the critical path."
  ]
}
```

---

### `GET /projects/:projectId/dependencies/graph`

Retrieves the raw Dependency Graph Engine output, ideal for D3.js or React Flow visualisations.

**Response (`200 OK`)**
```json
{
  "projectId": 4,
  "nodes": [
    {
      "taskId": 10,
      "metadata": {
        "title": "Database Optimisation",
        "status": "Work In Progress"
      },
      "incomingEdges": [],
      "outgoingEdges": [11, 15],
      "cachedAnalysis": {}
    }
  ]
}
```

---

### `GET /projects/:projectId/dependencies/affected/:taskId`

Performs a downstream BFS traversal to find all tasks recursively blocked or affected by `taskId`.

**Response (`200 OK`)**
```json
{
  "taskId": 10,
  "affectedTasks": [11, 15, 22]
}
```

---

### `POST /projects/:projectId/dependencies/tasks/:taskId`

Creates a new dependency. Validates against self-referencing duplicates and **circular dependencies (DAG violation)**.

**Request Body**
```json
{
  "successorId": 45,
  "type": "DEPENDS_ON",
  "note": "Waiting for API endpoint"
}
```

**Response (`201 Created`)**
Returns the created `TaskDependency` object. Returns `400 Bad Request` if a cycle is detected.

---

### `GET /projects/:projectId/dependencies/tasks/:taskId`

Returns all incoming and outgoing dependencies for a task, including a dynamically computed `status` (`READY`, `BLOCKED`, `SATISFIED`).

**Response (`200 OK`)**
```json
{
  "predecessors": [
    {
      "id": 1,
      "predecessorId": 10,
      "successorId": 45,
      "status": "BLOCKED",
      "predecessor": { ... }
    }
  ],
  "successors": []
}
```

---

### `PATCH /projects/:projectId/dependencies/tasks/:taskId/:dependencyId`

Updates an existing dependency (e.g., toggling `isActive` or updating notes).

**Request Body**
```json
{
  "note": "API endpoint is partially done, waiting on tests"
}
```

---

### `DELETE /projects/:projectId/dependencies/tasks/:taskId/:dependencyId`

Removes a dependency.

**Response (`204 No Content`)**

---

## Shared Error Handling

All endpoints follow a consistent error structure:

| Code | Reason | Example Response |
|---|---|---|
| `400` | Validation failure or cyclical dependency | `{ "message": "Cannot create dependency: this would introduce a circular dependency chain." }` |
| `401` | Missing or invalid token | `{ "message": "Unauthenticated" }` |
| `403` | User does not have access to project | `{ "message": "Forbidden: insufficient permissions" }` |
| `404` | Project or Task not found | `{ "message": "Project not found" }` |
| `500` | Internal server/database error | `{ "message": "Error retrieving affected tasks: <details>" }` |
