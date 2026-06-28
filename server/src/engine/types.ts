export type WeightingStrategy = "POINTS" | "DURATION" | "CUSTOM";

// ──────────────────────────────────────────────────────────────────────────────
// Core Graph Types
// ──────────────────────────────────────────────────────────────────────────────

export interface GraphNode {
  taskId: number;
  metadata: {
    title: string;
    status: string | null;
    priority: string | null;
    points: number | null;
    startDate: Date | null;
    dueDate: Date | null;
    assignedUserId: number | null;
    /** 0–100: how much work is already done (supplied externally if available) */
    progressPercent?: number;
    /** Actual completion date, if the task is already done */
    actualCompletionDate?: Date | null;
    /** Estimated completion date (separate from official dueDate) */
    estimatedCompletionDate?: Date | null;
    /** Sprint this task belongs to, if any */
    sprintId?: number | null;
    sprintEndDate?: Date | null;
  };
  incomingEdges: number[];  // Predecessor task IDs
  outgoingEdges: number[];  // Successor task IDs
  cachedAnalysis: {
    depth?: number;
    criticalPathWeight?: number;
    isBlocked?: boolean;
    /** Computed delay in days this task is expected to cause */
    expectedDelayDays?: number;
    /** Risk score [0-100] for this individual node */
    nodeRiskScore?: number;
  };
}

export interface GraphStatistics {
  totalNodes: number;
  totalEdges: number;
  rootNodesCount: number;
  leafNodesCount: number;
  maxDepth: number;
}

export interface ProjectAnalysis {
  projectId: number;
  statistics: GraphStatistics;
  blockedTasks: number[];
  criticalPath: number[];
  criticalPathWeight: number;
  hasCycles: boolean;
  cycleDetails?: number[][];
}

// ──────────────────────────────────────────────────────────────────────────────
// Prediction Engine Types
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Risk tier used as a human-readable label alongside riskScore.
 */
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

/**
 * Breakdown of why the risk score is what it is.
 * Exposes every deduction/bonus so the AI narrative layer can write precise explanations.
 */
export interface RiskReasoningData {
  /** Scored 0–100 before clamping */
  baseScore: number;
  deductions: Array<{
    reason: string;
    points: number;
  }>;
  bonuses: Array<{
    reason: string;
    points: number;
  }>;
  /** Final clamped score */
  finalScore: number;
  riskLevel: RiskLevel;
}

/**
 * Prediction for a single task that is at risk.
 */
export interface TaskPrediction {
  taskId: number;
  title: string;
  status: string | null;
  priority: string | null;
  assignedUserId: number | null;
  /** How many days late this task is predicted to be (0 if on-track) */
  expectedDelayDays: number;
  /** Whether this task sits on the project's critical path */
  isOnCriticalPath: boolean;
  /** Risk score for this task in isolation [0–100, lower = riskier] */
  riskScore: number;
  riskLevel: RiskLevel;
  /** All downstream task IDs that are affected if this task slips */
  affectedDownstreamTaskIds: number[];
  reasons: string[];
}

/**
 * Sprint-level impact summary.
 */
export interface SprintImpact {
  sprintId: number;
  sprintEndDate: Date | null;
  /** Task IDs in this sprint that are at risk */
  atRiskTaskIds: number[];
  /** Estimated days the sprint could be delayed */
  estimatedSprintDelayDays: number;
  /** Whether the sprint is likely to miss its deadline entirely */
  likelyToMissDeadline: boolean;
}

/**
 * The full output of the Dependency Failure Prediction Engine.
 * All AI modules consume this object.
 */
export interface PredictionResult {
  projectId: number;
  /** Project-level risk score [0–100, lower = riskier] */
  riskScore: number;
  riskLevel: RiskLevel;
  /** All task IDs (not just critical path) that are considered at risk */
  affectedTasks: number[];
  /** Maximum estimated delay across all chains (days) */
  estimatedDelay: number;
  /** Tasks on the critical path that are failing or at risk */
  criticalTasks: TaskPrediction[];
  /** All at-risk tasks (critical path + blocked + overdue) */
  allAtRiskTasks: TaskPrediction[];
  /** Sprint-level impact summary per sprint */
  sprintImpacts: SprintImpact[];
  /** Full reasoning breakdown for AI narrative generation */
  reasoningData: RiskReasoningData;
  generatedAt: string;
}
