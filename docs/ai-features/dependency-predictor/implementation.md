# AI Dependency Failure Predictor — Implementation Guide

## Phase 1 Objective

Build the full end-to-end pipeline — repository, service, AI service, controller,
route, DTOs, and frontend view — using zero schema migrations and following the exact
same structure established by the Health Score feature.

**Phase 2 (Graph Engine)**: A dedicated `DependencyGraphEngine` has been implemented
in `server/src/engine/` to provide a reusable, O(V+E) graph analytics foundation
consumed by all AI features.

---

## Folder Structure

```
server/src/
├── engine/
│   ├── types.ts                    ← GraphNode, ProjectAnalysis, WeightingStrategy
│   └── DependencyGraphEngine.ts    ← all graph algorithms (pure, no Prisma)
├── types/
│   └── dependency.ts               ← API-layer DTOs
├── services/
│   ├── dependencyGraphService.ts   ← Prisma fetch + Engine orchestration
│   ├── taskDependencyService.ts    ← CRUD + DependencyStatus evaluation
│   └── aiDependencyService.ts      ← Gemini integration
├── controllers/
│   ├── dependencyController.ts     ← project-level analysis endpoint
│   └── taskDependencyController.ts ← task-level CRUD endpoints
└── routes/
    ├── dependencyRoutes.ts         ← mounted in projectRoutes.ts
    └── taskDependencyRoutes.ts     ← /dependencies/tasks/:taskId

client/src/
├── types/index.ts                  ← DependencyType, DependencyStatus, TaskDependency
├── state/api.ts                    ← CRUD endpoints + hooks
└── app/projects/
    ├── ProjectHeader/index.tsx     ← add "Analytics" tab
    ├── [id]/page.tsx               ← render AnalyticsView when tab active
    └── AnalyticsView/
        ├── index.tsx               ← main dashboard shell
        ├── DependenciesDashboard.tsx ← dependency predictor UI shell
        └── components/             ← RiskSummaryCards, AIInsightCard, DependencyGraph (using @xyflow/react), etc.
```

---

## Step-by-Step Implementation

---

## Graph Engine (`engine/`)

The `engine/` directory is **framework-agnostic** (no Prisma, no Express). It receives
plain data arrays and operates entirely in-memory.

### `engine/types.ts` — Key interfaces

| Type | Purpose |
|---|---|
| `GraphNode` | Single task in the graph — stores metadata, `incomingEdges[]`, `outgoingEdges[]`, and `cachedAnalysis` |
| `WeightingStrategy` | `"POINTS"` (default) \| `"DURATION"` \| `"CUSTOM"` |
| `GraphStatistics` | `totalNodes`, `totalEdges`, `rootNodesCount`, `leafNodesCount`, `maxDepth` |
| `ProjectAnalysis` | Consolidated output of `analyzeProject()` consumed by all AI modules |

### `engine/DependencyGraphEngine.ts` — Algorithm summary

| Method | Algorithm | Complexity |
|---|---|---|
| `buildGraph(tasks, deps)` | Adjacency list initialization | O(V + E) |
| `topologicalSort()` | Kahn's Algorithm (BFS) | O(V + E) |
| `findRootTasks()` | Filter nodes with `incomingEdges.length === 0` | O(V) |
| `findLeafTasks()` | Filter nodes with `outgoingEdges.length === 0` | O(V) |
| `detectCycles()` | DFS with recursion stack | O(V + E) |
| `findBlockedTasks()` | Sweep predecessors, check status !== "Completed" | O(V + E) |
| `findCriticalPath(strategy)` | DP on topological order (longest-path) | O(V + E) |
| `getAffectedTasks(taskId)` | BFS downstream from given node | O(V + E) |
| `getDependencyDepth(taskId)` | DP on topo order (longest upstream path) | O(V + E) |
| `getGraphStatistics()` | Single DP pass over topo sort | O(V + E) |
| `analyzeProject()` | Runs all of the above, returns `ProjectAnalysis` | O(V + E) |

### Critical Path weighting

`findCriticalPath()` accepts a `WeightingStrategy`:

- **`POINTS`** (default): uses `task.points` as edge weight (falls back to `1`)
- **`DURATION`**: uses `(dueDate - startDate)` in days (falls back to `1`)
- **`CUSTOM`**: placeholder for downstream AI-specific weights; falls back to `1`

Future phases can pass a custom weight resolver without changing the algorithm itself.

### `analyzeProject()` as shared AI contract

All upcoming AI modules should consume `engine.analyzeProject()`:

```ts
const engine = await dependencyGraphService.buildEngineForProject(projectId);
const analysis: ProjectAnalysis = engine.analyzeProject();

// AI modules receive ProjectAnalysis and generate explanations / predictions
```

This ensures a single O(V+E) pass for all analytics, regardless of how many AI
modules are running.

---

### Step 1 — Types / DTOs (`types/dependency.ts`)

Define the following interfaces:

```ts
// One task node inside a dependency chain
export interface DependencyNodeDTO {
  taskId: number;
  title: string;
  status: string | null;
  priority: string | null;
  dueDate: string | null;     // ISO string
  assignedUserId: number | null;
}

// One detected chain of dependent tasks
export interface DependencyChainDTO {
  chainId: string;            // generated: "chain_${projectId}_${index}"
  nodes: DependencyNodeDTO[];
  riskScore: number;          // 0-100
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  reasons: string[];          // deterministic deduction list
  aiExplanation: string;      // Gemini output; may be empty if AI failed
}

// Top-level API response
export interface DependencyResponseDTO {
  projectId: number;
  totalChainsDetected: number;
  criticalChains: number;
  chains: DependencyChainDTO[];
  generatedAt: string;
  warning?: string;           // set when task count exceeds 500
}
```

---

### Step 2 — Repository (`repository/taskDependencyRepo.ts`)

Single exported function:

```ts
getTasksForGraph(projectId: number): Promise<TaskGraphNode[]>
```

Internal `TaskGraphNode` shape (not exported in the response DTO):

```ts
interface TaskGraphNode {
  id: number;
  title: string;
  status: string | null;
  priority: string | null;
  dueDate: Date | null;
  assignedUserId: number | null;
  tags: string | null;
  points: number | null;
}
```

**Query logic:**

```ts
const tasks = await prisma.task.findMany({
  where: { projectId },
  select: { id, title, status, priority, dueDate, assignedUserId, tags, points },
  orderBy: { dueDate: "asc" },
  take: 500,  // hard cap
});
```

Return the tasks array and a boolean `truncated` flag if `tasks.length === 500`.

---

### Step 3 — Service (`services/dependencyService.ts`)

Orchestrates the three sub-steps:

#### 3a. Build the graph

```
buildDependencyGraph(tasks: TaskGraphNode[]): DependencyGraph
```

Infer edges by iterating all task pairs `[i, j]` where `i.dueDate < j.dueDate`:

| Condition | Edge reason | Strength |
|---|---|---|
| `i.assignedUserId === j.assignedUserId` | `"same-assignee"` | 0.7 |
| Tag overlap between `i.tags` and `j.tags` | `"tag-overlap"` | 0.5 |
| `i.dueDate` is within 3 days before `j.dueDate` | `"date-order"` | 0.4 |

An edge is only created when **at least one** condition is met. If multiple apply,
pick the highest strength. This prevents an O(n²) explosion of edges for large projects.

#### 3b. Detect risky chains

```
detectRiskyChains(graph: DependencyGraph): DependencyChainDTO[]
```

- Depth-first traversal from every node with no incoming edges (roots).
- Extract all paths of length ≥ 2 nodes.
- For each path, compute `riskScore` using the algorithm in `architecture.md §10`.
- Sort by `riskScore` ascending (lowest score = most risk).
- Return only chains where `riskScore < 85` (i.e., Medium risk or worse).

#### 3c. Entry point

```ts
export const analyseProjectDependencies = async (
  projectId: number
): Promise<DependencyResponseDTO>
```

Flow:
1. `getTasksForGraph(projectId)` → tasks, truncated flag
2. `buildDependencyGraph(tasks)` → graph
3. `detectRiskyChains(graph)` → chains (deterministic)
4. `aiDependencyService.explainChains(chains.slice(0, 5), projectName)` → enriched chains
5. Merge and return `DependencyResponseDTO`

---

### Step 4 — AI Service (`services/aiDependencyService.ts`)

Pattern mirrors `aiHealthService.ts` exactly:

- Instantiate `GoogleGenAI` once at module level with `GEMINI_API_KEY`.
- Maintain `const activeRequests = new Set<string>()`.
- Use request key: `dependency_${projectId}`.
- Throw `429`-style error if a duplicate request arrives.
- Call `gemini-2.5-flash` with `responseMimeType: "application/json"` and a
  `responseSchema` typed as an array of `{ chainId: string, explanation: string }`.
- In the `finally` block, always `activeRequests.delete(requestKey)`.
- On error, return chains with `aiExplanation: ""` rather than crashing.

---

### Step 5 — Controller (`controllers/dependencyController.ts`)

```ts
export const getProjectDependencies = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void>
```

Identical guards to `healthController.ts`:

1. `if (!req.user)` → 401
2. Validate `projectId` param (already validated by middleware)
3. Read `res.locals.project` (populated by `requireProjectExists`)
4. Visibility check: owner OR admin OR has assigned task → 403 if none
5. Call `analyseProjectDependencies(Number(projectId))`
6. `res.status(200).json(result)`
7. Catch-all → `res.status(500).json({ message: … })`

---

### Step 6 — Routes (`routes/dependencyRoutes.ts`)

```ts
const router = Router({ mergeParams: true });
router.get(
  "/",
  validateIdParam("projectId"),
  requireProjectExists,
  getProjectDependencies
);
export default router;
```

Mount in `routes/projectRoutes.ts`:

```ts
import dependencyRoutes from "./dependencyRoutes";
router.use("/:projectId/dependencies", dependencyRoutes);
```

---

### Step 7 — Frontend Types (`client/src/types/index.ts`)

Add `DependencyNodeDTO`, `DependencyChainDTO`, and `DependencyResponseDTO` following
the existing pattern (see `HealthMetricsDTO` / `ProjectHealthResponseDTO`).

---

### Step 8 — RTK Query (`client/src/state/api.ts`)

Add alongside `getProjectHealth`:

```ts
getProjectDependencies: build.query<DependencyResponseDTO, number>({
  query: (projectId) => `projects/${projectId}/dependencies`,
  providesTags: (result, error, projectId) => [{ type: "Projects", id: projectId }],
}),
```

Export `useGetDependencyRisksQuery` in the destructured exports block.

---

### Step 9 — ProjectHeader Tab

In `ProjectHeader/index.tsx`, add a `TabButton` for `"Dependencies"` using the
`GitBranch` icon from `lucide-react`, between the "Health" and "Table" tabs.

---

### Step 10 — Project Page (`[id]/page.tsx`)

```tsx
import DependencyView from "../DependencyView";

{activeTab === "Dependencies" && <DependencyView id={id} />}
```

---

### Step 11 — AnalyticsView Component

**`AnalyticsView/index.tsx`**: A dashboard shell hosting sub-features (`Dependencies`, `Health Score`).

**`AnalyticsView/DependenciesDashboard.tsx`**: Orchestrates state and rendering for the dependencies UI.
Renders sub-components inside `components/`:
- `DependencyGraph.tsx`: Interactive DAG using `@xyflow/react` and `dagre`.
- `RiskSummaryCards.tsx`: Top level metrics.
- `AIInsightCard.tsx`: Renders the Gemini explanation.
- `CriticalPathCard.tsx`, `BlockedTasksCard.tsx`: Contextual task lists.

**`DependencyView/ChainCard.tsx`**: renders one `DependencyChainDTO`. Shows:
- Chain node list as `Task A → Task B → Task C`
- Risk badge (colour matches HealthView risk badge pattern)
- `reasons[]` list
- `aiExplanation` in a blue insight box (matches HealthView AI insight panel)
- Collapsible toggle

---

## Scoring Algorithm

```
Start at 100

For each node in the chain:
  if node.status is overdue (dueDate < now AND status not Completed):
    score -= min(20, remaining)

  if node.status in ["Blocked", "Under Review"]:
    score -= min(25, remaining)

If assignee workload > 100 points:
  score -= 10

If chain.length >= 4:
  score -= 10

score = max(0, score)

riskLevel:
  score >= 85  → "Low"
  score >= 70  → "Medium"
  score >= 50  → "High"
  score < 50   → "Critical"
```

---

## Implementation Order

1. [x] `types/dependency.ts`
2. [x] `repository/taskDependencyRepo.ts`
3. [x] `services/dependencyService.ts` (no AI yet — dummy `aiExplanation: ""`)
4. [x] `services/aiDependencyService.ts`
5. [x] `controllers/dependencyController.ts`
6. [x] `routes/dependencyRoutes.ts`
7. [x] Mount route in `projectRoutes.ts`
8. [x] `client/src/types/index.ts` (add DTOs)
9. [x] `client/src/state/api.ts` (add endpoint + export hook)
10. [x] `ProjectHeader/index.tsx` (rename Health to Analytics)
11. [x] `[id]/page.tsx` (render AnalyticsView)
12. [x] `AnalyticsView/` components (DependencyGraph, Cards, Dashboard)
