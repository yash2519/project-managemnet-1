# Project Analysis Context

The `ProjectAnalysisContext` is the foundational single source of truth for all AI modules in this project. Rather than having each AI service independently query databases or run analytical engines, a single context builder aggregates this data efficiently and deterministically.

## Core Design Principles

1. **Centralized Data Aggregation**: Fetches the core filtered dataset (Tasks, Activities, Users) first.
2. **Parallel Analytics Execution**: All deterministic engines (Workload, Activity, Dependency, Health) run concurrently, feeding off the same base dataset.
3. **Immutable Source of Truth**: Once built, the context is frozen and passed to the AI prompt generator.
4. **Persisted Exact Match**: The complete `ProjectAnalysisContext` is saved to the database alongside the generated AI reports. This guarantees historical diffing (e.g., Standup History Comparison) operates on the exact data the AI saw.

## Structure

```typescript
export interface ProjectAnalysisContext {
  metadata: {
    projectId: number;
    generatedAt: string;
    analysisVersion: string; // Iterates when the analytics engines change
    contextVersion: string;  // Iterates when this structure changes
    generatedBy: number;
    cacheStatus: "hit" | "miss" | "bypassed" | "stale";
    targetDateLabel: string;
  };

  filters: {
    userId?: number;
    teamId?: number;
    sprintId?: number;
    startDate?: string;
    endDate?: string;
    taskIds?: number[];
  };

  baseData: {
    filteredTasks: Task[];
    filteredActivities: Activity[];
    filteredUsers?: User[];
  };

  analytics: {
    activity?: any;
    workload?: any;
    dependency?: any;
    health?: any;
    
    // Future Expansion Slots
    velocity?: any;
    sprintMetrics?: any;
    retrospective?: any;
    riskAnalysis?: any;
  };

  aiMetadata?: {
    modelUsed?: string;
    promptVersion?: string;
  };
}
```

## How to use in new AI Modules

If you are building a new AI feature (e.g., Sprint Retrospective Generator):
1. Import `buildProjectAnalysisContext`.
2. Construct your `AnalysisFilters` (e.g., passing in a `sprintId` or `startDate`/`endDate`).
3. Call `const context = await buildProjectAnalysisContext(projectId, userId, label, filters);`
4. Serialize `context.analytics` into your prompt template.
5. Persist the `context` object unmodified to your database schema so it can be referenced in the future.
