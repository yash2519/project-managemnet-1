# AI Dependency Failure Predictor — Architecture

## 1. Feature Overview

The **AI Dependency Failure Predictor** analyses a project's tasks — their statuses,
deadlines, assignees, and explicit dependency relationships — to detect chains of dependent work
that are at risk of cascading failure. It traverses the dependency graph constructed from the `TaskDependency`
table, runs a deterministic risk algorithm over the graph, and then
sends the highest-risk chains to Gemini 2.5 Flash for a plain-English explanation and
concrete recommendations.

The result is surfaced inside the existing Project view as a new **"Dependencies"** tab,
consistent with the Board / List / Timeline / Table / Health tab pattern already in
place.

---

## 2. User Workflow

```
User opens a project  →  clicks the "Dependencies" tab
        │
        ▼
Frontend fires useGetDependencyRisksQuery(projectId)
        │
        ▼
Loading spinner shown (matching HealthView pattern)
        │
        ▼
Response rendered:
  ┌──────────────────────────────────────────────────────┐
  │  Risk Summary Banner  (e.g. "3 critical chains found")│
  │  ┌────────────────────────────────────────────────┐  │
  │  │ Chain #1  [CRITICAL]                           │  │
  │  │  Task A → Task B → Task C                     │  │
  │  │  AI Explanation                                │  │
  │  └────────────────────────────────────────────────┘  │
  │  ┌────────────────────────────────────────────────┐  │
  │  │ Chain #2  [HIGH]     …                         │  │
  │  └────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────┘
```

- **No interaction required** – the analysis runs automatically when the tab is
  opened.  
- Each chain card is collapsible.  
- An empty-state message is shown when no at-risk chains are found.  
- An error state is shown when the AI fails, mirroring the HealthView pattern.

---

## 3. System Architecture

```
Client (Next.js)
│
│  RTK Query: useGetDependencyRisksQuery(projectId)
│
└──► GET /projects/:projectId/dependencies
          │
          ├── Middleware: validateIdParam("projectId")
          ├── Middleware: requireProjectExists         ← attaches project to res.locals
          │
          └── Controller: dependencyController.ts
                │
                ├── Auth check (owner / admin / assignee)
                │
                ├── Service: dependencyGraphService.ts  ← data retrieval + orchestration
                │     ├── Prisma: task.findMany()       ← single bulk fetch (O(V))
                │     ├── Prisma: taskDependency.findMany() ← single bulk fetch (O(E))
                │     │
                │     └── Engine: DependencyGraphEngine.ts
                │           ├── buildGraph(tasks, deps)   ← O(V+E) in-memory adjacency
                │           ├── analyzeProject()          ← single entry point for all AI
                │           │     ├── detectCycles()       (Kahn's algorithm)
                │           │     ├── findBlockedTasks()   (predecessor status check)
                │           │     ├── findCriticalPath()   (DP over topo sort)
                │           │     └── getGraphStatistics() (V, E, depth, roots, leafs)
                │           └── (individual ops) getAffectedTasks(), getDependencyDepth()
                │
                └── Service: aiDependencyService.ts    ← Gemini 2.5 Flash
```

### Layer responsibilities

| Layer | File | Responsibility |
|---|---|---|
| Route | `routes/dependencyRoutes.ts` | Wires middleware + controller |
| Controller | `controllers/dependencyController.ts` | Auth, param validation, delegates to service |
| Service | `services/dependencyGraphService.ts` | Data retrieval (Prisma) + Engine orchestration |
| **Graph Engine** | **`engine/DependencyGraphEngine.ts`** | **In-memory graph algorithms (O(V+E)): topo-sort, cycles, critical path, etc.** |
| **Prediction Engine** | **`engine/FailurePredictionEngine.ts`** | **Deterministic risk scoring: delay, sprint impact, reasoningData** |
| **Engine Types** | **`engine/types.ts`** | **`GraphNode`, `ProjectAnalysis`, `PredictionResult`, `TaskPrediction`, `SprintImpact`** |
| AI Service | `services/aiDependencyService.ts` | Builds prompt from `PredictionResult`, calls Gemini 2.5 Flash |
| Types | `types/dependency.ts` | API-layer DTOs |

The `DependencyGraphEngine` holds all graph traversal logic.  
The `FailurePredictionEngine` consumes the graph engine and produces a `PredictionResult`.  
The `DependencyGraphService` is the data layer — it fetches from Prisma and instantiates both engines.  
AI modules receive a pre-computed `PredictionResult` and generate narrative explanations only.

---

## 4. Backend Flow

```
1. GET /projects/:projectId/dependencies arrives
2. validateIdParam → requireProjectExists → auth check in controller
3. dependencyGraphService.analyzeProject(projectId)
   a. Prisma: task.findMany({ where: { projectId } })         → O(V)
   b. Prisma: taskDependency.findMany({ where: { isActive } }) → O(E)
   c. engine.buildGraph(tasks, dependencies)                  → O(V+E)
   d. engine.analyzeProject()
      → detectCycles()        (Kahn's topo-sort / DFS recursion stack)
      → findBlockedTasks()    (predecessor status sweep)
      → findCriticalPath()    (DP on topo order, default POINTS weight)
      → getGraphStatistics()  (V, E, maxDepth, roots, leafs)
      → returns ProjectAnalysis
   e. aiDependencyService.explainChains(analysis, projectName)
      → Builds prompt from ProjectAnalysis, calls Gemini 2.5 Flash
4. Return DependencyResponseDTO to controller → 200 JSON
```

### Explicit Dependency Storage

Task dependencies are explicitly managed using the `TaskDependency` join table.
This eliminates false positives from inference and allows users to explicitly define relationships
(`DEPENDS_ON`, `BLOCKED_BY`, `RELATED_TO`) via the UI.
Cycle detection is handled at the application layer via both DFS (in `DependencyGraphEngine`)
and a pre-insert check in `dependencyGraphService.wouldCreateCycle()`.

---

## 5. Frontend Flow

```
projects/[id]/page.tsx
  │  activeTab === "Dependencies" → renders <DependencyView id={id} />
  │
  └── DependencyView/index.tsx
        │  useGetDependencyRisksQuery(Number(id))
        │
        ├── isLoading → <LoadingSpinner />
        ├── isError   → <ErrorState message={error.data.message} />
        ├── !data     → <EmptyState message="No risks detected." />
        └── data      → <RiskSummaryBanner /> + data.chains.map(<ChainCard />)
```

### Component files

| Component | Location |
|---|---|
| `DependencyView` | `client/src/app/projects/DependencyView/index.tsx` |
| `ChainCard` | `client/src/app/projects/DependencyView/ChainCard.tsx` |
| `DependencySection` | `client/src/components/TaskDetailsModal/DependencySection.tsx` |

New tab added to `ProjectHeader/index.tsx` following the same `TabButton` pattern
used for Health, Timeline, and Board tabs.

New RTK Query endpoints added to `state/api.ts` alongside the
existing `getProjectHealth` endpoint.

---

## 6. Database Design

Task dependencies are stored in a dedicated join table `TaskDependency`.

```prisma
model TaskDependency {
  id              Int            @id @default(autoincrement())
  predecessorId   Int
  successorId     Int
  type            DependencyType @default(DEPENDS_ON)
  isActive        Boolean        @default(true)
  note            String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  createdByUserId Int

  predecessor   Task @relation("Predecessor", fields: [predecessorId], references: [id], onDelete: Cascade)
  successor     Task @relation("Successor",   fields: [successorId],   references: [id], onDelete: Cascade)
  createdBy     User @relation("DependencyCreator", fields: [createdByUserId], references: [userId], onDelete: Restrict)

  @@unique([predecessorId, successorId, type])
  @@index([successorId])
  @@index([predecessorId])
  @@index([predecessorId, type])
  @@index([createdByUserId])
}
```

`Task` gains two back-relations:

```prisma
model Task {
  // … existing fields …
  predecessors TaskDependency[] @relation("Predecessor")
  successors   TaskDependency[] @relation("Successor")
}
```

---

## 7. API Design

See `api.md` for full endpoint specification.

**Route registration** (in `projectRoutes.ts`):

```ts
import dependencyRoutes from "./dependencyRoutes";
router.use("/:projectId/dependencies", dependencyRoutes);
```

Follows the exact pattern used by `healthRoutes`.

---

## 8. AI Analysis Flow

1. `aiDependencyService.ts` receives the top N risky chains (max 5 to control prompt
   size).
2. Each chain is serialised as a short JSON snippet:
   `{ chain: ["Task A", "Task B"], riskScore: 82, reasons: ["…"] }`
3. A single prompt is constructed (see `ai-prompt.md`) and sent to `gemini-2.5-flash`
   with `responseMimeType: "application/json"` and a typed `responseSchema`.
4. Gemini returns an array of explanations, one per chain, which are merged back
   into the chain objects.
5. The in-memory `activeRequests` Set (identical to `aiHealthService.ts`) prevents
   concurrent calls for the same project.

---

## 9. Dependency Graph Design

### Node

```ts
interface DependencyNode {
  taskId:        number;
  title:         string;
  status:        string | null;
  priority:      string | null;
  dueDate:       Date   | null;
  assignedUserId: number | null;
  tags:          string | null;
  points:        number | null;
}
```

### Edge (inferred)

```ts
interface DependencyEdge {
  fromTaskId: number;
  toTaskId:   number;
  reason:     "date-order" | "same-assignee" | "tag-overlap";
  strength:   number; // 0-1, used in risk scoring
}
```

### Graph structure

`Map<number, { node: DependencyNode; successors: DependencyEdge[] }>`

Built in O(n²) over tasks per project. For projects with < 500 tasks this is well
within acceptable latency. A hardcoded limit of 500 tasks is enforced in the
repository to protect performance.

### Chain extraction

A depth-first traversal finds all paths longer than 1 node. Cycles are impossible
(the graph is a DAG ordered by `dueDate`).

---

## 10. Prediction Algorithm Overview

Start from 100. Deductions are applied per chain, then the chain's overall
`riskScore` is the average of its node scores.

| Signal | Deduction | Cap |
|---|---|---|
| Predecessor task is overdue | −20 per overdue node | −60 |
| Predecessor task is Blocked / Under Review | −25 per blocked node | −50 |
| Assignee has workload > 100 points | −10 | −10 |
| Chain length ≥ 4 | −10 (long chains amplify risk) | −10 |
| High/Urgent priority in chain | +0 (informational only) | — |

`riskLevel` mapping (mirrors Health Score thresholds for consistency):
- ≥ 85 → `Low`
- 70–84 → `Medium`
- < 70 → `High`
- < 50 → `Critical`

---

## 11. Security Considerations

- The controller uses the same visibility guard as `healthController.ts`:
  user must be **owner**, **ADMIN**, or have **at least one assigned task** in the
  project.
- The `activeRequests` lock uses key `dependency_${projectId}` to prevent AI
  quota abuse.
- Task data never leaves the server-side prompt; no task titles or descriptions are
  stored by Gemini (stateless API calls).

---

## 12. Performance Considerations

- **Repository cap**: fetch at most 500 tasks per project. Projects larger than this
  are rare, and exceeding the cap produces a warning in the response.
- **AI call cap**: only the top 5 riskiest chains are sent to Gemini, regardless of
  how many are detected. The rest are returned with a `noAiExplanation: true` flag
  and their raw `reasons[]` array.
- **No additional DB tables or indexes** are needed for Phase 1, so there is zero
  migration cost.
- **RTK Query caching**: the query result is cached by `projectId` tag.

---

## 13. Future Scalability

1. **Explicit dependency storage** via `TaskDependency` join table (see §6).
2. **Real-time updates**: invalidate the dependency cache whenever a task status
   changes by using the existing `"Tasks"` RTK cache tag.
3. **Background nightly analysis**: move AI calls to a cron job that stores results
   in a `ProjectInsight` table (already proposed in `system-design.md`), making
   the tab load instantaneously.
4. **Graph visualisation**: render the dependency graph as an interactive SVG using
   `react-flow` or a lightweight D3 overlay, displayed alongside the chain list.

---

## 14. Component Reuse Opportunities

| Existing asset | How it is reused |
|---|---|
| `activeRequests` Set pattern (`aiController.ts`, `aiHealthService.ts`) | Directly replicated in `aiDependencyService.ts` for concurrency control |
| `requireProjectExists` middleware | Reused unchanged in `dependencyRoutes.ts` |
| `validateIdParam` middleware | Reused unchanged |
| `AuthenticatedRequest` type | Used in `dependencyController.ts` |
| `HealthView` loading / error / empty states | Visual template for `DependencyView` states |
| `TabButton` in `ProjectHeader` | New "Dependencies" tab added following the same pattern |
| `useGetProjectHealthQuery` RTK endpoint pattern | `useGetDependencyRisksQuery` follows identical shape |
| Team workload aggregation (`projectMetricsRepo.ts`) | Reused to determine per-assignee workload inside graph scoring |
