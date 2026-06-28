# Smart Daily Standup Generator — API Specification

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/projects/:projectId/standup/today` | Fetch today's cached standup, regenerating if cache is missing/stale |
| `GET` | `/projects/:projectId/standup/date/:date` | Fetch a specific historical standup by date |
| `GET` | `/projects/:projectId/standup/history` | Fetch paginated standup history |
| `GET` | `/projects/:projectId/standup/export` | Export history in JSON, CSV, or Markdown format |
| `GET` | `/projects/:projectId/standup/compare` | Compare two historical standups via StandupComparisonEngine |
| `POST` | `/projects/:projectId/standup` | Generate and persist a standup report |
| `POST` | `/projects/:projectId/standup/regenerate` | Force regeneration of a standup, bypassing cache |

---

## API Details

### `GET /projects/:projectId/standup/today`
Retrieves today's standup report. If the cache is valid (no significant new activity since generation), it returns the persisted report. Otherwise, it triggers the AI service.

### `GET /projects/:projectId/standup/history`
Returns paginated history of all generated standups for the project.

**Query Parameters**
- `page` (default: 1)
- `limit` (default: 10)
- `startDate` (optional ISO string)
- `endDate` (optional ISO string)
- `sprintId` (optional number, reserved for future use)
- `search` (optional string, reserved for future use)
- `author` (optional string, reserved for future use)

**Response**
```json
{
  "data": [
    {
      "id": 12,
      "date": "2026-06-28T00:00:00.000Z",
      "summary": { "yesterday": "...", "today": "...", "blockers": "...", "teamSummary": "..." },
      "generatedAt": "2026-06-28T09:00:00.000Z",
      "isRegenerated": false,
      "generationVersion": "1.0",
      "aiRecommendations": ["..."],
      "analysisContext": { "...": "..." },
      "author": { "username": "alice" }
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### `GET /projects/:projectId/standup/compare`
Compares two full StandupReport records and runs them through the `StandupComparisonEngine`.

**Query Parameters**
- `dateA` (required, format: YYYY-MM-DD)
- `dateB` (required, format: YYYY-MM-DD)

Returns a structured diff outlining narrative changes, workload metric deltas, AI recommendation additions/removals, and overall statistics.

### `GET /projects/:projectId/standup/export`
Exports historical standups.

**Query Parameters**
- `format`: `json` (default), `csv`, or `md`.
- `startDate`, `endDate`: date filters.

Returns the formatted file as an attachment (`Content-Type: text/csv` or `text/markdown`).

### `POST /projects/:projectId/standup`
Generates a standup report. 

**Body Parameters (JSON)**
- `date` (optional string): Target date for generation.
- `filters` (optional AnalysisFilters object): 
  - `userId` (number)
  - `teamId` (number)
  - `sprintId` (number, disabled)
  - `startDate` (string)
  - `endDate` (string)
  - `taskIds` (array of numbers)

If filters are provided, cache reading and saving are completely bypassed.

### `POST /projects/:projectId/standup/regenerate`
Forces a new AI generation for the target date. 

**Body Parameters (JSON)**
Accepts the same `date` and `filters` parameters as `/standup`.

If `filters` are missing, it overwrites the existing cached report and sets `isRegenerated = true`. If `filters` are present, it bypassed saving.

---

## Authentication & Authorization
All endpoints require a valid AWS Cognito Bearer token.
Authorization identical to `healthController.ts`: Project Owner OR Admin OR Assigned Task Member. Returns `403 Forbidden` if requirements are not met.
