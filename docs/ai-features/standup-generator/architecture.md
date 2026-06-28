# Smart Daily Standup Generator — Architecture

## 1. Feature Overview

The **Smart Daily Standup Generator** analyses a project's activity stream, task progress, team workload, and dependency graph to automatically produce a structured, natural-language daily standup report using Gemini AI.

It now includes a **Persistence Layer** that stores generated reports, allowing users to fetch historical standups, track trends over time, and export data. This persistence layer is also designed to serve as the context feed for the upcoming **Retrospective Generator**.

## 2. System Architecture

```
Client (Next.js)
│
│  RTK Query: useGetTodayStandupQuery(projectId)
│  RTK Query: useGetStandupHistoryQuery({ projectId, page, limit })
│  RTK Mutation: useGenerateStandupMutation(projectId)
│
└──► API Endpoints (/projects/:projectId/standup/*)
          │
          ├── Middleware: Auth & requireProjectExists
          │
          └── Controller: standupController.ts
                  │
                  ├── Cache check via standupCacheService.ts (bypassed if filters active)
                  │     ↳ Hits: Return persisted StandupReport
                  │     ↳ Misses/Stale: Proceed to Service
                  │
                  └── Service: aiStandupService.ts
                        │
                        ├── buildAnalysisContext() pre-fetches data using AnalysisFilters
                        │
                        ├── Deterministic Engines process context:
                        │   - ActivityCollectionEngine.processContext()
                        │   - TeamWorkloadEngine.processContext()
                        │
                        ├── Gemini 2.5 Flash API (Prompt generation)
                        │
                        └── Persist result to StandupReport (schema.prisma) ONLY if unfiltered
```

### Layer Responsibilities

| Layer | File | Responsibility |
|---|---|---|
| Route | `routes/standupRoutes.ts` | Wires validation, endpoints (`/today`, `/history`, `/regenerate`) |
| Controller | `controllers/standupController.ts` | Orchestrates fetching, regeneration, and extracting `filters` from request |
| Context Builder | `services/projectAnalysisContextBuilder.ts` | Fetches filtered base data and executes deterministic engines in parallel to build `ProjectAnalysisContext` |
| Cache/Persist | `services/standupCacheService.ts` | Checks DB for existing `StandupReport`. Caching is bypassed for filtered queries. |
| AI Service | `services/aiStandupService.ts` | Consumes `ProjectAnalysisContext` and calls Gemini |
| DB Model | `schema.prisma (StandupReport)` | Stores structured `summary`, raw narrative, AI recommendations, and full `analysisContext` |

## 3. Historical Analysis & Comparison

The architecture now supports historical tracking and day-over-day diffs via the `StandupComparisonEngine`.

```
GET /projects/:projectId/standup/compare?dateA=...&dateB=...
        │
        ├── Fetch full StandupReport A and B (including `analysisContext`)
        │
        └── StandupComparisonEngine.ts (Pure logic layer)
                ├── Text Diffing (computes word deltas & changed sections)
                ├── Workload Diffing (extracts metrics from historical analysisContexts)
                ├── Recommendation Diffing (computes added/dropped recommendations)
                └── Statistics (computes risk trend, health score changes)
```

The engine is deterministic, relying entirely on the stored `analysisContext` JSON blobs inside the `StandupReport` model. No historical database recalculations are needed.

## 4. Intelligent Caching

Instead of regenerating the standup on every load:
1. `GET /today` queries the database for an existing `StandupReport` for today's logical date.
2. If found, it checks the `Activity` table for new logs (`createdAt > report.generatedAt`).
3. If `< 2` new activities exist, the cached report is returned.
4. If `> 2` new activities exist, the cache is considered stale, and the report is regenerated in the background (or explicitly on-demand via `POST /regenerate`).

## 5. Retrospective Integration

The `StandupReport` model stores the exact data fed into the AI during generation under the `analysisContext` field (JSON). The upcoming **Sprint Retrospective Generator** will query historical `StandupReport` entries and feed their combined `analysisContext` directly into the retrospective prompt. This ensures 100% data consistency between daily summaries and sprint retrospectives without recalculating historical graph states.

