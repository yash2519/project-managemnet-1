# Health Score Testing Strategy

## Overview
Testing the AI Health Score requires isolating the deterministic algorithm from the non-deterministic LLM output.

## 1. Unit Testing

### Scoring Algorithm
- **Target**: `healthService.ts`
- **Tests**:
  - Should return `100` score and `Low` risk for a perfect project (0 overdue, 0 blocked, 0 missed deadlines, low workload).
  - Should deduct 5 points per overdue task (e.g., 3 overdue = -15) up to a maximum of 30 points.
  - Should deduct 10 points per blocked task up to a maximum of 40 points.
  - Should deduct 10 points if missed deadlines exceed 5.
  - Should deduct 5 points if team workload (active points) > 100.
  - Should return correct risk categories: `<70` (High), `<85` (Medium), `>=85` (Low).
  - Should return appropriate `reasons` explaining each point deduction.

### Repository Layer
- **Target**: `projectMetricsRepo.ts`
- **Tests**: Mock Prisma client and verify that the aggregation queries (e.g., `groupBy` assignedUserId) map correctly to the internal metrics interfaces.

## 2. Integration Testing

### Controller & Middleware
- **Target**: `GET /api/projects/:projectId/health`
- **Tests**:
  - Authenticated user without project access receives `403 Forbidden`.
  - Valid request returns `200 OK` with the correct JSON schema.

## 3. AI Mocking Strategy

To prevent testing suites from hitting the real Gemini API (saving costs and ensuring fast, deterministic CI pipelines):
- Use `jest.mock('@google/genai')`.
- Create a mock implementation of `ai.models.generateContent` that always returns a static JSON string matching the required schema.
- Assert that `aiHealthService.ts` correctly parses the mock string and merges it with the calculated baseline score.
