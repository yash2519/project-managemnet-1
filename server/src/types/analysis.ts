import { Task, Activity, User } from "@prisma/client";

/**
 * Reusable analysis filters for targeting specific AI generation slices
 * Can be shared by Standup Generator, Health Score, Retrospective, etc.
 */
export interface AnalysisFilters {
  userId?: number;
  teamId?: number;
  sprintId?: number; // Kept for future compatibility, disabled in UI
  startDate?: string;
  endDate?: string;
  taskIds?: number[];
}

/**
 * The single source of truth context object that aggregates all project data
 * and deterministic analytics for consumption by AI models.
 */
export interface ProjectAnalysisContext {
  metadata: {
    projectId: number;
    generatedAt: string;
    analysisVersion: string;
    contextVersion: string;
    generatedBy: number;
    cacheStatus: "hit" | "miss" | "bypassed" | "stale";
    targetDateLabel: string;
  };

  filters: AnalysisFilters;

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
    // Additional modules can be added here without breaking structure
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

