# AI Dependency Failure Predictor — Database Design

## 1. Current Schema Baseline

The following existing models are directly relevant to this feature. No changes exist
to these tables today.

```
Task
 id              Int          PK
 title           String
 description     String?
 status          String?
 priority        String?
 tags            String?      (comma-separated free text)
 startDate       DateTime?
 dueDate         DateTime?
 points          Int?
 projectId       Int          FK → Project.id  (CASCADE DELETE)
 authorUserId    Int          FK → User.userId
 assignedUserId  Int?         FK → User.userId (SET NULL)
 createdAt       DateTime
 updatedAt       DateTime
```

**Critical gap**: there is no column or table that records a directed relationship
between two tasks. Dependency edges are currently inferred at runtime from shared
assignees, tag overlap, and due-date proximity. This approach works for Phase 1 but
has three hard limits:

1. Inference produces false positives (unrelated tasks that happen to share an
   assignee are incorrectly linked).
2. There is no way for a user to *define* a dependency ("Task B cannot start until
   Task A is done").
3. Dependency type (`blocked-by`, `depends-on`, `related-to`) cannot be expressed.

The schema changes below resolve all three.

---

## 2. Required Schema Changes

### 2.1 New Table — `TaskDependency`

This is the **only new table** required. It is a self-referencing join table on
`Task`, recording a directed edge from one task to another with an explicit type.

#### Column specification

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `Int` | No | `autoincrement()` | Surrogate primary key |
| `predecessorId` | `Int` | No | — | The task that must be completed first (the "from" node) |
| `successorId` | `Int` | No | — | The task that depends on the predecessor (the "to" node) |
| `type` | `Enum(DependencyType)` | No | `DEPENDS_ON` | Semantic relationship label |
| `isActive` | `Boolean` | No | `true` | Soft-delete or toggle flag |
| `note` | `String` | Yes | — | Optional user-provided context for the dependency |
| `createdAt` | `DateTime` | No | `now()` | Audit timestamp |
| `updatedAt` | `DateTime` | No | `now()` | Audit update timestamp |
| `createdByUserId` | `Int` | No | — | FK → `User.userId` — who created this link |

#### New Enum — `DependencyType`

```
DEPENDS_ON   — "Task B cannot start until Task A is Done"
BLOCKED_BY   — "Task B is currently blocked because Task A is not resolved"
RELATED_TO   — "Tasks are thematically linked but not strictly sequential"
```

**Rationale for three types:**

| Type | Graph semantics | Risk weight |
|---|---|---|
| `DEPENDS_ON` | Hard sequencing constraint | High — scorer treats predecessor delay as a direct blocker |
| `BLOCKED_BY` | Soft blocker, may resolve independently | Medium — scorer applies a moderate penalty |
| `RELATED_TO` | Informational only, no sequencing | Low — displayed in UI but does not affect risk score |

#### Primary key & uniqueness

- PK: `id` (surrogate, for stable FK references).
- Unique constraint: `(predecessorId, successorId, type)` — the same pair can have at
  most one relationship *per type*, but a pair can have both `DEPENDS_ON` and
  `RELATED_TO` simultaneously, which is semantically valid.

#### Constraints & foreign keys

| FK | Target | On Delete |
|---|---|---|
| `predecessorId` | `Task.id` | **CASCADE** |
| `successorId` | `Task.id` | **CASCADE** |
| `createdByUserId` | `User.userId` | **RESTRICT** |

> **Why CASCADE on both task FKs?**  
> When a task is deleted, all dependency edges *touching* that task (whether it is
> predecessor or successor) become meaningless and must be removed. Leaving orphan
> rows would corrupt the graph. `CASCADE` is the correct semantic.

> **Why RESTRICT on `createdByUserId`?**  
> We want to retain the historical record of *who* created a dependency link even
> after the user is deactivated. However, the existing `User` model uses `onDelete:
> Cascade` for `authoredTasks`, so this needs to be revisited; for this table,
> `RESTRICT` is preferred with a future plan to `SET NULL` (requiring `createdByUserId`
> to become nullable).

---

### 2.2 Modifications to `Task` Model

Two new back-relation fields are added to `Task`. These are **Prisma-level virtual
fields only** (no new columns in the database). They allow Prisma to resolve
`task.predecessors` and `task.successors` without an extra query.

```
Task (additions — no new SQL columns)
 predecessors  TaskDependency[]  @relation("Predecessor")
 successors    TaskDependency[]  @relation("Successor")
```

No migration step is needed for these; they are defined purely in `schema.prisma`
and resolved by Prisma's query engine at runtime using the FK columns already present
in `TaskDependency`.

---

### 2.3 No Changes to Other Tables

| Table | Status |
|---|---|
| `Project` | Unchanged |
| `User` | Unchanged |
| `Activity` | Unchanged — dependency creation *can* be logged as a new `LINKED` action using the existing schema |
| `TaskAssignment` | Unchanged |
| `Comment`, `Attachment` | Unchanged |

---

## 3. Full `TaskDependency` Table Definition (SQL)

```sql
-- Enum type
CREATE TYPE "DependencyType" AS ENUM ('DEPENDS_ON', 'BLOCKED_BY', 'RELATED_TO');

-- New table
CREATE TABLE "TaskDependency" (
    "id"              SERIAL       PRIMARY KEY,
    "predecessorId"   INTEGER      NOT NULL,
    "successorId"     INTEGER      NOT NULL,
    "type"            "DependencyType" NOT NULL DEFAULT 'DEPENDS_ON',
    "isActive"        BOOLEAN      NOT NULL DEFAULT true,
    "note"            TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" INTEGER      NOT NULL,

    CONSTRAINT "TaskDependency_predecessorId_fkey"
        FOREIGN KEY ("predecessorId")
        REFERENCES "Task"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "TaskDependency_successorId_fkey"
        FOREIGN KEY ("successorId")
        REFERENCES "Task"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT "TaskDependency_createdByUserId_fkey"
        FOREIGN KEY ("createdByUserId")
        REFERENCES "User"("userId")
        ON DELETE RESTRICT ON UPDATE CASCADE,

    -- No self-loops
    CONSTRAINT "TaskDependency_no_self_loop"
        CHECK ("predecessorId" <> "successorId"),

    -- One relationship per (pair × type)
    CONSTRAINT "TaskDependency_predecessor_successor_type_key"
        UNIQUE ("predecessorId", "successorId", "type")
);
```

---

## 4. Circular Dependency Prevention

### Why it matters

A circular dependency (`Task A → Task B → Task A`) would:

- Make the in-memory graph an infinite loop during DFS traversal (without a visited
  set).
- Have no valid execution order (both tasks are blocked by each other).
- Produce meaningless risk scores.

### Prevention strategy: Application-level DAG validation

Database-level cycle detection requires a recursive CTE query on every `INSERT`,
which is expensive and difficult to express via Prisma's current API. The preferred
approach is a **lightweight application-level check** in the service layer before
committing the row.

**Algorithm:**
```
Before inserting edge (predecessorId=A, successorId=B):
  1. Load the existing outgoing edges of B (recursively, via DFS).
  2. If A appears in the reachable set of B → reject (cycle detected).
  3. Otherwise → insert.
```

This is O(V + E) per insert and acceptable for projects with ≤ 500 tasks.

**API response on cycle detection:**
```json
{ "message": "Cannot create dependency: this would introduce a circular dependency chain." }
```
HTTP status: `422 Unprocessable Entity`

### Database-level guard (belt-and-suspenders)

Add a `CHECK` constraint that prevents self-loops at the database level:

```sql
CONSTRAINT "TaskDependency_no_self_loop" CHECK ("predecessorId" <> "successorId")
```

This catches the simplest case (`A → A`) at zero cost and does not attempt full cycle
detection (which must remain in the application layer).

### Graph traversal guard (Phase 1 — inferred edges)

In Phase 1 the graph is built purely from existing `Task` fields (no
`TaskDependency` table). Because edges are ordered strictly by `dueDate`, the graph
is naturally a DAG: an edge `(A → B)` is only drawn when `A.dueDate < B.dueDate`.
By construction, a cycle is impossible — a task cannot be due both before and after
another task. No extra validation is needed in Phase 1.

---

## 5. Index Recommendations

### Indexes on `TaskDependency`

| Index | Columns | Type | Rationale |
|---|---|---|---|
| `idx_td_predecessor` | `predecessorId` | B-Tree | Fetch all successors of a given task — used in graph traversal |
| `idx_td_successor` | `successorId` | B-Tree | Fetch all predecessors of a given task — used for display ("what does Task X block?") |
| `idx_td_predecessor_type` | `(predecessorId, type)` | B-Tree | Filter successors by dependency type efficiently |
| `idx_td_created_by` | `createdByUserId` | B-Tree | Audit queries ("who linked tasks in this project?") |

> The unique constraint `(predecessorId, successorId, type)` already creates an
> implicit index that covers the `(predecessorId, successorId)` prefix efficiently.
> The explicit `idx_td_predecessor` index is still beneficial because many queries
> filter only on `predecessorId` without fixing `successorId`.

### Existing Task indexes that benefit this feature

The `Task` table already has an implicit index on `id` (PK). The graph builder
fetches tasks via `projectId`; if a `projectId` composite index does not already
exist, the following is recommended:

```sql
CREATE INDEX "idx_task_project_duedate"
    ON "Task" ("projectId", "dueDate" ASC NULLS LAST);
```

This makes the repository query (`WHERE projectId = ? ORDER BY dueDate ASC LIMIT 500`)
an index-only scan on PostgreSQL.

---

## 6. Prisma Schema (Reference — Do Not Apply Yet)

```prisma
// ── New enum ─────────────────────────────────────────────────────────────────
enum DependencyType {
  DEPENDS_ON
  BLOCKED_BY
  RELATED_TO
}

// ── New table ─────────────────────────────────────────────────────────────────
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

// ── Additions to Task ─────────────────────────────────────────────────────────
model Task {
  // … all existing fields unchanged …

  // New back-relations (no new DB columns)
  predecessors TaskDependency[] @relation("Predecessor")
  successors   TaskDependency[] @relation("Successor")
}

// ── Addition to User (back-relation only) ─────────────────────────────────────
model User {
  // … all existing fields unchanged …

  createdDependencies TaskDependency[] @relation("DependencyCreator")
}
```

---

## 7. Migration Strategy

### Phase 1 — No Migration Required

The inference-based approach in Phase 1 reads only from the existing `Task` table.
No `TaskDependency` table is created. No Prisma migration is run.

### Phase 2 — Additive Migration

When the team is ready to support explicit user-defined dependencies:

**Step 1 — Generate the migration**
```bash
npx prisma migrate dev --name add_task_dependency_table
```

Prisma will produce a single SQL file that:
- Creates the `DependencyType` enum.
- Creates the `TaskDependency` table with all FK constraints and indexes.
- Adds the back-relation references to `Task` and `User` (no SQL column changes,
  only Prisma metadata).

**Step 2 — Seed or backfill (optional)**
No existing data needs to be backfilled. All `TaskDependency` rows start empty; the
inference engine in `dependencyService.ts` continues to function as a fallback for
projects with no explicit edges.

**Step 3 — Deploy with zero downtime**
The migration is purely additive:
- No existing columns are modified.
- No existing indexes are dropped.
- No data is transformed.

The new table can be deployed in a standard rolling deploy without downtime.

**Rollback plan**
```bash
npx prisma migrate resolve --rolled-back <migration-name>
```
Then manually:
```sql
DROP TABLE IF EXISTS "TaskDependency";
DROP TYPE IF EXISTS "DependencyType";
```

This is safe because no existing tables reference `TaskDependency`.

---

## 8. Backward Compatibility

| Concern | Assessment |
|---|---|
| Existing GET /tasks responses | Unchanged — `task.predecessors` and `task.successors` are not included in existing query `select` clauses |
| Existing POST /tasks | Unchanged — creating a task does not require any dependency data |
| Seeded data | All 40 seed tasks remain valid without any `TaskDependency` rows |
| Health Score feature | Unchanged — `projectMetricsRepo.ts` does not query `TaskDependency` |
| Phase 1 graph builder | Works identically regardless of whether `TaskDependency` table exists or not; it only reads `Task` |
| Third-party integrations | None exist; not applicable |

The migration is **100% additive** — it adds a new table and two new Prisma relations.
Nothing is removed or altered.

---

## 9. Future Extensibility

### 9.1 `metadata` column for rich edge data

If the team later wants to store additional information per dependency link (e.g.,
a lag time, a condition, or a comment), a `metadata JSONB` column can be added to
`TaskDependency` without altering its structure:

```sql
ALTER TABLE "TaskDependency" ADD COLUMN "metadata" JSONB;
```

Example use: `{ "lagDays": 2, "note": "Must wait for QA sign-off" }`

### 9.2 Cross-project dependencies

If tasks in different projects need to be linked (e.g., a dependency on a shared
infrastructure task), add a `crossProject BOOLEAN NOT NULL DEFAULT false` column.
The uniqueness constraint would need a new variant, and the service would need to
validate cross-project access permissions before creating the edge.

### 9.3 Status-based automatic resolution

A future enhancement: when `predecessor.status` changes to `"Completed"`, a database
trigger or application-side hook automatically removes or marks the dependent
`BLOCKED_BY` edges as resolved. This could use the existing `Activity` log to emit a
`DEPENDENCY_RESOLVED` event.

### 9.4 `ProjectInsight` table for cached analysis

Per `system-design.md`, a nightly background job could store the results of the
dependency analysis into a `ProjectInsight` table, avoiding on-the-fly AI calls on
every tab open. The `TaskDependency` table would power that analysis directly instead
of relying on inference.

### 9.5 Graph visualisation data endpoint

A future `GET /projects/:projectId/dependencies/graph` endpoint would return the full
adjacency list from `TaskDependency` in a format ready for `react-flow` or D3.
This requires no schema changes — only a new controller and route.

### 9.6 Sprint integration

When the Sprint Planning feature is implemented, a sprint's tasks form a natural
subgraph. The `TaskDependency` table could be filtered by `task.sprintId` (once the
`Sprint` model is added per `database-design.md` for Sprint Planning) to show only
intra-sprint dependency risks.

---

## 10. Summary Table

| Item | Phase 1 | Phase 2 |
|---|---|---|
| New tables | None | `TaskDependency` |
| New enums | None | `DependencyType` |
| New SQL indexes | Recommended: `idx_task_project_duedate` | 4 indexes on `TaskDependency` |
| Modified tables | None | `Task` and `User` (Prisma relations only, no new columns) |
| Migration required | No | Yes — single additive migration |
| Rollback complexity | N/A | Low — drop table + enum |
| Backward compatible | Yes | Yes |
| Circular dependency guard | DAG by construction (dueDate ordering) | Application-layer DFS + DB CHECK constraint |
