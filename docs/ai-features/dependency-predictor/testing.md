# AI Dependency Failure Predictor — Testing Strategy

## Overview

Testing is split across three concerns:

1. **Unit tests** — deterministic logic (`DependencyGraphEngine`, `FailurePredictionEngine`)
2. **Integration tests** — repository layer (Prisma queries against a test DB)
3. **Contract tests** — AI service (mocked Gemini client)

All unit tests are located in `server/src/__tests__/` and run via `npm test`.

---

## 1. Unit Tests — `DependencyGraphEngine`

**File**: `server/src/__tests__/DependencyGraphEngine.test.ts`  
**Status**: 8/8 passing ✅

| Scenario | Validates |
|---|---|
| Single-node graph | Roots = leafs = [1], critical path weight = node points |
| Disconnected graph | Two isolated roots, 0 edges |
| Linear graph A→B→C | Topological order, critical path, `getDependencyDepth()` |
| Tree (1→2, 1→3, 2→4, 2→5) | Multi-branch critical path selection |
| Diamond (1→2, 1→3, 2→4, 3→4) | Convergent paths, correct longest-path |
| Circular graph (1→2→3→1) | `detectCycles()` returns cycles, `topologicalSort()` returns null |
| Blocked tasks | Only tasks with incomplete predecessors are marked blocked |
| **Performance (1000V, 1898E)** | Build: **<1ms** · Full analysis: **<4ms** |

---

## 2. Unit Tests — `FailurePredictionEngine`

**File**: `server/src/__tests__/FailurePredictionEngine.test.ts`  
**Status**: 22/22 passing ✅

### Scoring signal tests

| Scenario | Signal tested | Expected |
|---|---|---|
| Single task, future due date | On-track baseline | `riskScore ≥ 85`, `riskLevel = "Low"` |
| Single task, `status = "Completed"` | Completed shortcut | No entry in `allAtRiskTasks`, `delay = 0` |
| Single task, overdue 3 days | `OVERDUE` penalty (−20) | task `riskScore < 85`, `estimatedDelay = 3` |
| Single task, overdue 10 days | `OVERDUE` + `OVERDUE_SEVERE` (−30) | task `riskScore` < mildly overdue score |
| Urgent task, overdue | `HIGH_PRIORITY_STUCK` (−10) stacks | task `riskScore` < Low-priority overdue |
| High-priority, in-progress | `HIGH_PRIORITY_STUCK` (−10) | `riskScore` lower than Low-priority in-progress |
| `dueDate = null` | `NO_DUE_DATE` penalty (−5) | `riskScore` lower than task with due date |
| `progressPercent = 20`, 1d left | `SLOW_PROGRESS` (−10) | reason mentions `%` or `complete` |
| `progressPercent = 90` | `NEAR_DONE` bonus (+15) | score ≥ score with no progress set |

### Graph-level tests

| Scenario | Validates |
|---|---|
| Linear A→B→C, A overdue | Tasks 2 and 3 appear in `affectedTasks` |
| Successor with incomplete predecessor | Blocked reason in task `reasons[]` |
| Successor with Completed predecessor | Not flagged as blocked |
| Diamond graph, root overdue | All 3 downstream nodes in `affectedTasks` |
| All tasks Completed | `allAtRiskTasks = []`, `estimatedDelay = 0` |
| Disconnected graph, 2 overdue tasks | `estimatedDelay = max(delays)` |

### Critical path tests

| Scenario | Validates |
|---|---|
| Heavier branch (10pts vs 1pt) | `isOnCriticalPath = true` on heavier branch |
| Overdue task on critical path | Lower project `riskScore` vs overdue non-critical task |

### Sprint impact tests

| Scenario | Validates |
|---|---|
| 5d overdue, sprint ends in 2d | `likelyToMissDeadline = true` |
| 2d overdue, sprint ends in 30d | `likelyToMissDeadline = false` |

### reasoningData structure

| Property | Validates |
|---|---|
| `baseScore` | Always 100 |
| `deductions` | Array of `{ reason, points }` |
| `finalScore` | Equals `result.riskScore` |
| `riskLevel` | Matches score threshold (≥85=Low, ≥70=Medium, ≥50=High, else Critical) |

### Performance benchmark

| Scenario | Result |
|---|---|
| 500 tasks, ~950 edges (10% overdue, 5% completed) | Prediction in **<100ms** (actual: ~20ms) |

---

## 2. Unit Tests — AI Service

**Target**: `services/aiDependencyService.ts`  
**File**: `server/src/__tests__/aiDependencyService.test.ts`

The `@google/genai` module is mocked using Jest:

```ts
jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn().mockResolvedValue({
        text: JSON.stringify([
          { chainId: "chain_1_0", explanation: "Test explanation." }
        ])
      })
    }
  })),
  Type: { ARRAY: "array", OBJECT: "object", STRING: "string" }
}));
```

### Test cases

| Scenario | Expected behaviour |
|---|---|
| Normal call with 2 chains | Returns 2 chains with `aiExplanation` populated |
| `GEMINI_API_KEY` not set | `aiExplanation` = `"AI unavailable: API key not configured."` |
| Gemini returns empty `text` | `aiExplanation` = `"No explanation generated."` |
| Gemini throws network error | `aiExplanation` = `"Failed to generate explanation: <error>"` |
| Duplicate concurrent call (same projectId) | Second call throws; lock is active |
| Lock released after failure | After Gemini throws, a subsequent call for same project succeeds |
| Chains array empty | Function returns empty array without calling Gemini |

---

## 3. Unit Tests — Repository

**Target**: `repository/taskDependencyRepo.ts`  
**File**: `server/src/__tests__/taskDependencyRepo.test.ts`

Prisma is mocked using `jest.mock("@prisma/client")`.

### Test cases

| Scenario | Expected behaviour |
|---|---|
| Project has 3 tasks | Returns array of 3 `TaskGraphNode` objects ordered by `dueDate asc` |
| Project has 0 tasks | Returns `[]`, `truncated: false` |
| Project has exactly 500 tasks | Returns 500 tasks, `truncated: false` |
| Project has 501 tasks (Prisma mock returns 500) | Returns 500 tasks, `truncated: true` |
| Prisma throws | Error propagates up to the service layer |

---

## 4. Unit Tests — Controller

**Target**: `controllers/dependencyController.ts`  
**File**: `server/src/__tests__/dependencyController.test.ts`

Mock `dependencyService.analyseProjectDependencies` and test HTTP-level behaviour.

### Test cases

| Scenario | Expected HTTP response |
|---|---|
| `req.user` is undefined | 401 |
| `res.locals.project` not set | 404 |
| User is owner | 200 with data |
| User is ADMIN | 200 with data |
| User has assigned task | 200 with data |
| User has no relation to project | 403 |
| Service throws | 500 with `message` |
| `analyseProjectDependencies` returns empty chains | 200 with `chains: []` |

---

## 5. Frontend Component Tests

**Target**: `DependencyView/index.tsx`, `DependencyView/ChainCard.tsx`  
**Framework**: React Testing Library + Jest

### DependencyView states

| State | Trigger | Expected render |
|---|---|---|
| Loading | `isLoading: true` | Spinner + "Analysing dependencies…" text |
| Error | `isError: true, error.data.message: "Forbidden"` | AlertTriangle icon + error message |
| Empty | `data.chains: []` | EmptyState with "No at-risk dependencies found." |
| Data | `data` with 2 chains | Risk summary banner + 2 `ChainCard` components |

### ChainCard

| Prop | Expected render |
|---|---|
| `riskLevel: "Critical"` | Red badge |
| `riskLevel: "High"` | Red-orange badge |
| `riskLevel: "Medium"` | Amber badge |
| `riskLevel: "Low"` | Green badge |
| 3-node chain | "Task A → Task B → Task C" |
| `aiExplanation: ""` | Explanation section hidden |
| `aiExplanation: "text"` | Blue insight box rendered |
| Collapse toggle | Clicking hides/shows reasons list |

---

## 6. Manual End-to-End Verification Checklist

### Migration and Seeding
- [ ] Run `npx prisma migrate dev` successfully without errors.
- [ ] Run `npm run seed` and ensure it runs successfully without violating any constraints.
- [ ] Verify `TaskDependency` table exists in database.

### Explicit Dependencies CRUD
- [ ] Open a Task Details Modal, select a task from the dropdown, choose "Blocks", and save. Ensure it appears under "Blocks".
- [ ] Select a task from the dropdown, choose "Is Blocked By", and save. Ensure it appears under "Blocked By".
- [ ] Verify adding a task to itself shows an error message.
- [ ] Verify adding an exact duplicate dependency shows an error message.
- [ ] Create a cycle (Task A blocks Task B, Task B blocks Task A) and verify the cycle detection error message is displayed.
- [ ] Click "x" on a dependency and ensure it is removed immediately.

### AI Prediction Flow (Regression)
- [ ] Navigate to a project with multiple incomplete and overdue tasks → Dependencies tab shows chains
- [ ] Open a project with > 500 tasks → `warning` field appears in the response; UI banner shown

---

## 7. Environment Setup

No new environment variables are required. The feature uses the existing
`GEMINI_API_KEY` environment variable already defined for the Health Score feature.

```env
GEMINI_API_KEY=your-key-here   # already present
DATABASE_URL=...               # already present
```
