# Smart Daily Standup Generator — Implementation Guide

## Objective

Build the full end-to-end pipeline for the Smart Standup Generator without modifying any existing backend prediction logic. This feature integrates multiple deterministic engines (StandupAnalysis, TeamWorkload, DependencyGraph, ProjectHealth), feeds them into a Gemini AI prompt, and persists the generated response to a database layer.

---

## Architecture Flow

1. **Client** requests `GET /projects/:projectId/standup/today`
2. **Controller** (`standupController.ts`) intercepts and checks `standupCacheService.ts`.
3. **Cache Service** verifies if a report exists for today AND if no significant new activity (> 2 logs) has happened since its generation.
4. **AI Service** (`aiStandupService.ts`) runs if cache misses. It gathers deterministic context and queries Gemini.
5. **Persistence**: The resulting JSON and `analysisContext` is saved in the `StandupReport` Prisma model.
6. **Frontend**: `StandupView` component renders the structured JSON (Yesterday, Today, Blockers, TeamSummary, Recommendations) using existing Tailwind UI conventions.

---

## Folder Structure

```
server/prisma/
└── schema.prisma                   ← [MODIFIED] Added StandupReport model

server/src/
├── services/
│   ├── aiStandupService.ts         ← [NEW] Gemini 2.5 Flash integration & data orchestration
│   ├── standupCacheService.ts      ← [NEW] Intelligent cache invalidation logic
│   └── analysisContextBuilder.ts   ← [NEW] Shared context builder applying AnalysisFilters
├── controllers/
│   └── standupController.ts        ← [NEW] Endpoints for today, history, export, regenerate
├── routes/
│   └── standupRoutes.ts            ← [NEW] Route definitions mounted on projectRoutes
└── types/
    └── analysis.ts                 ← [NEW] AnalysisFilters and AnalysisContext types

client/src/
├── app/projects/AnalyticsView/
│   ├── index.tsx                   ← [MODIFIED] Enabled Standups sub-tab
│   └── StandupView/
│       ├── index.tsx               ← [NEW] Main standup UI component
│       └── StandupFilterBar.tsx    ← [NEW] Multi-filter UI component
├── state/
│   └── api.ts                      ← [MODIFIED] RTK Query endpoints for standups
└── types/
    └── index.ts                    ← [MODIFIED] AIStandupResponse DTO, AnalysisFilters
```

---

## UI Components (`StandupView`)

The `StandupView` adheres to the project's design system:
- **Loading State**: A centered spinner matching `HealthView`.
- **Empty State**: Used if no data could be generated, showing a `Users` icon and placeholder text.
- **Error State**: Displays a red warning icon and a "Try Again" button that triggers `refetch()`.
- **Regenerate Button**: Explicitly invokes `POST /regenerate` to bypass cache.
- **Preview Panel**: A collapsible panel toggled via the "Preview" button in the header. It renders the complete standup in a consolidated, share-ready format with clear visual separation between **Structured Data** (gray badge, `Database` icon) and **AI-Generated** content (violet badge, `Sparkles` icon). Users can review before exporting.
- **Stale Data Banner**: If the report was generated more than 2 hours ago, an amber warning banner appears with a "Refresh Now" button to prompt regeneration when underlying project activity may have changed.
- **Copy Success Toast**: A transient green confirmation banner after clipboard copy.
- **Export Menu**: Includes a dropdown for:
  - *Copy to Clipboard*: Copies the raw generated markdown.
  - *Download Markdown*: Triggers a `.md` file download.
  - *Download as PDF*: Opens a clean, print-optimized document in a new window and triggers `window.print()` natively.
- **Data Display**: The main content grid uses a 2/3 + 1/3 column layout. The left column renders structured project data (Yesterday, Today, Blockers, Team Summary) with a `Database` label header. The right column renders AI-generated insights (Recommendations, AI Narrative) with a `Sparkles` label header, using violet-themed styling to visually distinguish AI content from deterministic data.
