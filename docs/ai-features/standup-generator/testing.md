# Smart Daily Standup Generator — Testing Guide

## Overview

This document defines the testing strategy for the Smart Standup Generator, aligned with the project's existing testing approach established in `docs/architecture/12-testing-guidelines.md`. Tests are written using **Jest** and **Supertest** for the backend, with **React Testing Library** and **Mock Service Worker (MSW)** for the frontend.

---

## Backend Testing

### 1. Unit Tests — `standupService.ts`

**File**: `server/src/__tests__/standupService.test.ts`

These tests verify the data aggregation logic in isolation by mocking Prisma and the `dependencyGraphService`.

#### Test Scenarios

```ts
describe("standupService.generateStandup", () => {

  // --- Activity Aggregation ---

  it("groups activities by user correctly", async () => {
    // Given: 3 activity records for 2 different users
    // When: generateStandup is called
    // Then: memberSummaries has 2 entries, each with correct completedToday[]
  });

  it("returns empty completedToday when no activities exist for a user", async () => {
    // Given: team has user Bob with no activity records
    // When: generateStandup is called
    // Then: Bob's memberSummary.completedToday = []
  });

  it("only includes activities from the last 24 hours", async () => {
    // Given: activities exist for yesterday and 3 days ago
    // When: generateStandup is called
    // Then: only yesterday's activities appear
  });

  // --- WIP Task Aggregation ---

  it("populates inProgress with WIP task titles per user", async () => {
    // Given: Task A (WIP, assignedUserId: 12), Task B (Completed, assignedUserId: 12)
    // When: generateStandup is called
    // Then: memberSummaries[0].inProgress = ["Task A"]
  });

  it("assigns tasks with no assignee to an 'Unassigned' bucket", async () => {
    // Given: Task X with assignedUserId: null and status: WIP
    // When: generateStandup is called
    // Then: task appears in blockedItems.assignedTo = null
  });

  // --- Blocked Items ---

  it("identifies blocked items from prediction.allAtRiskTasks", async () => {
    // Given: PredictionResult with 1 task that has reason containing "block"
    // When: generateStandup is called
    // Then: blockedItems has 1 entry with correct taskId and blockedBy
  });

  it("returns empty blockedItems when no blocked tasks exist", async () => {
    // Given: PredictionResult.allAtRiskTasks is empty
    // When: generateStandup is called
    // Then: blockedItems = []
  });

  // --- Upcoming Failures ---

  it("returns top-3 critical tasks with expectedDelayDays > 0", async () => {
    // Given: 5 criticalTasks, all with expectedDelayDays > 0
    // When: generateStandup is called
    // Then: upcomingFailures.length === 3
  });

  it("excludes on-time critical tasks from upcomingFailures", async () => {
    // Given: 2 criticalTasks: one with delay 0, one with delay 3
    // When: generateStandup is called
    // Then: upcomingFailures has only the task with delay 3
  });

  it("marks sprint impact correctly from sprintImpacts", async () => {
    // Given: critical task ID 10 appears in sprintImpacts.atRiskTaskIds
    // When: generateStandup is called
    // Then: upcomingFailures[0].sprintImpact === true
  });

  // --- Large Team Handling ---

  it("limits memberSummaries to top-10 most active members for large teams", async () => {
    // Given: 25 team members with varying activity counts
    // When: generateStandup is called
    // Then: memberSummaries.length <= 10
  });

});
```

---

### 2. Unit Tests — `aiStandupService.ts`

**File**: `server/src/__tests__/aiStandupService.test.ts`

Mock `GoogleGenAI` to test prompt construction and response parsing without making real API calls.

#### Test Scenarios

```ts
describe("aiStandupService.generateStandupNarrative", () => {

  it("returns narrative and recommendations on successful Gemini response", async () => {
    // Given: Gemini mock returns { narrative: "...", recommendations: ["..."] }
    // When: generateStandupNarrative is called
    // Then: result.aiNarrative is the Gemini narrative
    //       result.aiRecommendations matches the array
  });

  it("returns fallback narrative when Gemini returns empty response", async () => {
    // Given: Gemini mock returns null text
    // When: generateStandupNarrative is called
    // Then: result.aiNarrative === "Standup narrative could not be generated..."
    //       result.aiRecommendations === []
  });

  it("returns fallback narrative when Gemini throws an error", async () => {
    // Given: Gemini mock throws Error("API quota exceeded")
    // When: generateStandupNarrative is called
    // Then: result.aiNarrative contains the failure message
  });

  it("prevents concurrent requests for the same project with 429-style error", async () => {
    // Given: one request is already active (activeRequests.has returns true)
    // When: a second request is made for the same projectId
    // Then: throws Error("Standup generation already in progress...")
  });

  it("always releases the lock in the finally block even on error", async () => {
    // Given: Gemini mock throws
    // When: generateStandupNarrative resolves (with fallback)
    // Then: activeRequests.has(requestKey) === false
  });

});
```

---

### 3. Integration Tests — Controller & Route

**File**: `server/src/__tests__/standupRoutes.test.ts`

Uses **Supertest** against the Express app with Prisma mocked.

#### Test Scenarios

```ts
describe("POST /projects/:projectId/standup", () => {

  // --- Auth ---
  it("returns 401 when no Authorization header is provided");
  it("returns 401 when Authorization token is invalid");

  // --- Authorization ---
  it("returns 403 when user is not owner, admin, or team member");
  it("returns 200 when user is the project owner");
  it("returns 200 when user is an ADMIN");
  it("returns 200 when user has an assigned task in the project");

  // --- Validation ---
  it("returns 400 when projectId is not a valid integer (e.g. 'abc')");
  it("returns 404 when the project does not exist");

  // --- Business Logic ---
  it("returns 200 with a valid StandupResponseDTO on success");
  it("returns 429 when a concurrent standup generation is already in progress for the same filters");
  it("returns 500 when the standup service throws an unexpected error");

  // --- Filtering ---
  it("bypasses cache when AnalysisFilters are provided");
  it("returns empty dataset correctly if filter matches no users or tasks");
  it("processes invalid filters gracefully (e.g. invalid string for number)");
  it("handles very large task selections in taskIds filter");
  it("processes combined filters (user + date range + task)");

  // --- Response Shape ---
  it("response contains projectId, projectName, generatedAt, reportDate");
  it("response contains memberSummaries array");
  it("response contains blockedItems array");
  it("response contains upcomingFailures array");
  it("response contains aiNarrative string");
  it("response contains aiRecommendations array");

});
```

---

## Frontend Testing

### 4. Component Tests — `StandupView.tsx`

**File**: `client/src/__tests__/StandupView.test.tsx`

Uses **React Testing Library** and **MSW** to mock the `POST /projects/:id/standup` endpoint.

#### Test Scenarios

```ts
describe("StandupView", () => {

  // --- Idle State ---
  it("renders empty state with 'Generate Today's Standup' button before any generation");

  // --- Loading State ---
  it("shows a loading skeleton while the standup is being generated");
  it("disables the Generate button while loading to prevent duplicate requests");

  // --- Success State ---
  it("renders the AI narrative after a successful response");
  it("renders member summaries for each team member");
  it("renders blocked items list");
  it("renders upcoming failures list");
  it("renders recommendations list");
  it("shows the risk badge with the correct level (Low / Medium / High / Critical)");
  it("shows the report date in a human-readable format");

  // --- Error State ---
  it("renders an error card with retry button on API failure");
  it("re-enables the Generate button on error so the user can retry");

  // --- Interaction ---
  it("calls useGenerateStandupMutation when the Generate button is clicked");
  it("shows a new report when Regenerate is clicked after viewing an existing report");

  // --- Empty Data Handling ---
  it("renders a 'No blocked tasks' message when blockedItems is empty");
  it("renders a 'No upcoming failures' message when upcomingFailures is empty");
  it("renders 'No activity recorded' for team members with no completedToday items");

});
```

---

## Regression Tests

### 5. Existing Feature Regression

Before shipping the Standup Generator, run the existing test suites to confirm no regressions:

```bash
# Backend
cd server
npx jest --runInBand

# Frontend TypeScript
cd client
npx tsc --noEmit

# Frontend Lint
npm run lint
```

#### Key regression areas to verify:

| Area | What to Check |
|---|---|
| `dependencyGraphService.predictProject()` | Must still return `PredictionResult` unchanged |
| `DependencyGraphEngine` | No modifications; existing tests should pass |
| `FailurePredictionEngine` | No modifications; existing tests should pass |
| `projectRoutes.ts` | New `standupRoutes` mount must not break existing `/health` or `/dependencies` |
| `AnalyticsView` | Sub-tab toggle must still correctly render Dependencies and Health Score |

---

## Mocking Strategy

### Gemini (Server Tests)

```ts
jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn().mockResolvedValue({
        text: JSON.stringify({
          narrative: "Team made progress on auth yesterday...",
          recommendations: ["Merge payment branch today."],
        }),
      }),
    },
  })),
}));
```

### Prisma (Server Tests)

Use `jest.mock("@prisma/client")` with `mockResolvedValue` for each query. Seed mock data to cover all edge cases (empty teams, no activities, blocked tasks).

### MSW (Frontend Tests)

```ts
// handlers.ts
rest.post("/projects/1/standup", (req, res, ctx) =>
  res(ctx.json(mockStandupResponse))
),
```

---

## 4. Unit Tests — `DailyTimelineBuilder.ts`

**File**: `server/src/__tests__/DailyTimelineBuilder.test.ts`

These tests verify the grouping and formatting logic for the chronological project timeline.

#### Test Scenarios

```ts
describe("DailyTimelineBuilder.buildDailyTimeline", () => {
  it("groups activities accurately into Morning, Afternoon, and Evening", async () => {
    // Given: Activity collection with events at 08:00, 14:00, and 20:00 (UTC)
    // When: buildDailyTimeline is called
    // Then: Returns 3 timeline groups with correctly bucketed events
  });

  it("handles empty activity days without crashing", async () => {
    // Given: Activity collection with 0 events
    // When: buildDailyTimeline is called
    // Then: Returns 3 empty groups
  });

  it("formats change details efficiently based on ActivityEventType", async () => {
    // Given: Events with ASSIGNEE_CHANGED and DEPENDENCY_CREATED
    // When: buildDailyTimeline is called
    // Then: formattedEvent.newValue translates raw changeDetail to correct string representation
  });
});
```

---

## Test Coverage Targets

| Area | Target |
|---|---|
| `standupService.ts` | 90% line coverage |
| `DailyTimelineBuilder.ts` | 90% line coverage |
| `aiStandupService.ts` | 85% line coverage (Gemini paths mocked) |
| `standupController.ts` | 100% branch coverage (all auth/validation paths) |
| `dailyTimelineController.ts`| 100% branch coverage (all auth/validation paths) |
| `StandupView.tsx` | All 5 component states covered |
