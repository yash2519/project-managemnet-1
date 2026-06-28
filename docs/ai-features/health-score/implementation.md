# Health Score Implementation Guide

## Phase 1 Objective
Implement the deterministic scoring engine and the foundational service layer for AI integration without altering existing DB schemas.

## Scoring Algorithm

The Health Score is a value from 0 to 100, calculated deterministically before AI enrichment.

### Baseline Formula
1. **Start at 100 points.**
2. **Overdue Penalty**: -5 points for every overdue task (max -30).
3. **Blocked Penalty**: -10 points for every blocked task (max -40).
4. **Missed Deadlines**: If missed deadlines > 5, apply -10 points.
5. **Workload Imbalance**: If total team workload > 100 points, apply -5 points.
(Other metrics like Completed Tasks and High Priority Tasks are fetched but currently do not incur penalties; they can be used by the AI.)

### Health Categories
- **85 - 100**: Low Risk (Healthy)
- **70 - 84**: Medium Risk (At Risk)
- **< 70**: High Risk (Critical)

## Implementation Steps

1. **Repository Layer** (Completed): Created `projectMetricsRepo.ts` which uses Prisma to fetch Completed Tasks, Overdue Tasks, Blocked Tasks, High Priority Tasks, Missed Deadlines, and Team Workload.
2. **Service Layer** (Completed): Implemented the deterministic scoring algorithm in `healthService.ts` that calculates `score`, assigns a `risk` category, and compiles a list of `reasons` for deductions.
3. **AI Service Integration** (Completed): Created `aiHealthService.ts` which uses `@google/genai` to generate a natural language explanation of the project health based on the calculated score, risk, and raw metrics.
4. **Controller Registration** (Completed): Bound the service to `healthController.ts` and registered it in `routes/healthRoutes.ts` mounted under `/projects/:projectId/health`.
5. **Frontend Integration** (Completed): Introduced RTK Query endpoint `useGetProjectHealthQuery` in `api.ts`, and built the `HealthView` dashboard component in `client/src/app/projects/HealthView/index.tsx`. The component successfully incorporates loading, error, and empty states while displaying the score, risk badge, and AI insights. The view is dynamically accessible via a new "Health" tab in the Project Dashboard.
