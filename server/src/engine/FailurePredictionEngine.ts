import { DependencyGraphEngine } from "./DependencyGraphEngine";
import {
  GraphNode,
  PredictionResult,
  TaskPrediction,
  SprintImpact,
  RiskLevel,
  RiskReasoningData,
} from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ──────────────────────────────────────────────────────────────────────────────
// Scoring constants — all deterministic, no AI
// ──────────────────────────────────────────────────────────────────────────────
const PENALTY = {
  OVERDUE: 20,                  // Task is past its due date
  OVERDUE_SEVERE: 10,           // Task is overdue by >7 days (stacks with OVERDUE)
  BLOCKED_BY_INCOMPLETE: 15,    // Has at least one incomplete predecessor
  ON_CRITICAL_PATH: 10,         // Task sits on the critical path
  HIGH_PRIORITY_STUCK: 10,      // High/Urgent task not yet started or overdue
  NO_DUE_DATE: 5,               // Cannot predict risk without a date
  SPRINT_MISS_RISK: 10,         // Task is in a sprint that is at risk of missing deadline
  SLOW_PROGRESS: 10,            // < 50 % done with < 2 days left to due date
};

const BONUS = {
  NEAR_DONE: 15,    // Task is ≥ 80 % complete
  COMPLETED: 999,   // Completed tasks get a large bonus → effectively not at risk
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function riskLevel(score: number): RiskLevel {
  if (score >= 85) return "Low";
  if (score >= 70) return "Medium";
  if (score >= 50) return "High";
  return "Critical";
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public class
// ──────────────────────────────────────────────────────────────────────────────

export class FailurePredictionEngine {
  private readonly graph: DependencyGraphEngine;
  private readonly projectId: number;
  private readonly now: Date;

  constructor(graph: DependencyGraphEngine, projectId: number, now?: Date) {
    this.graph = graph;
    this.projectId = projectId;
    this.now = now ?? new Date();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────────────────────

  public predict(): PredictionResult {
    const nodes = this.graph.getNodes();
    const analysis = this.graph.analyzeProject();
    const criticalPathSet = new Set(analysis.criticalPath);

    // Build per-task predictions
    const allPredictions: TaskPrediction[] = [];
    for (const node of nodes.values()) {
      const prediction = this.predictTask(node, criticalPathSet);
      allPredictions.push(prediction);
    }

    // Filter at-risk tasks (score < 85 = not "Low" risk, or has delay, or is blocked)
    const atRiskPredictions = allPredictions.filter(
      (p) => p.riskScore < 85 || p.expectedDelayDays > 0 || p.affectedDownstreamTaskIds.length > 0
    );

    const criticalTasks = atRiskPredictions.filter((p) => p.isOnCriticalPath);

    const affectedTaskIds = [
      ...new Set(
        atRiskPredictions.flatMap((p) => [p.taskId, ...p.affectedDownstreamTaskIds])
      ),
    ];

    const estimatedDelay = atRiskPredictions.reduce(
      (max, p) => Math.max(max, p.expectedDelayDays),
      0
    );

    const sprintImpacts = this.computeSprintImpacts(atRiskPredictions, nodes);
    const reasoningData = this.computeProjectRiskReasoning(atRiskPredictions, analysis, sprintImpacts);

    return {
      projectId: this.projectId,
      riskScore: reasoningData.finalScore,
      riskLevel: reasoningData.riskLevel,
      affectedTasks: affectedTaskIds,
      estimatedDelay,
      criticalTasks,
      allAtRiskTasks: atRiskPredictions,
      sprintImpacts,
      reasoningData,
      generatedAt: this.now.toISOString(),
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Per-task prediction
  // ────────────────────────────────────────────────────────────────────────────

  private predictTask(node: GraphNode, criticalPathSet: Set<number>): TaskPrediction {
    const { metadata, taskId } = node;
    const status = metadata.status ?? "";
    const isCompleted = status === "Completed";
    const isOnCriticalPath = criticalPathSet.has(taskId);

    const deductions: { reason: string; points: number }[] = [];
    const bonuses: { reason: string; points: number }[] = [];
    const baseScore = 100;

    // ── Completed shortcut ──────────────────────────────────────────────────
    if (isCompleted) {
      bonuses.push({ reason: "Task is Completed", points: BONUS.COMPLETED });
      const finalScore = clamp(baseScore + BONUS.COMPLETED, 0, 100);
      return {
        taskId,
        title: metadata.title,
        status: metadata.status,
        priority: metadata.priority,
        assignedUserId: metadata.assignedUserId,
        expectedDelayDays: 0,
        isOnCriticalPath,
        riskScore: finalScore,
        riskLevel: "Low",
        affectedDownstreamTaskIds: [],
        reasons: ["Task is Completed"],
      };
    }

    // ── Due date checks ─────────────────────────────────────────────────────
    let delayDays = 0;

    if (!metadata.dueDate) {
      deductions.push({ reason: "No due date set — cannot assess timeline risk", points: PENALTY.NO_DUE_DATE });
    } else {
      const effectiveDueDate = metadata.estimatedCompletionDate ?? metadata.dueDate;
      const daysUntilDue = daysBetween(this.now, effectiveDueDate);

      if (daysUntilDue < 0) {
        delayDays = Math.ceil(Math.abs(daysUntilDue));
        deductions.push({
          reason: `Overdue by ${delayDays} day(s)`,
          points: PENALTY.OVERDUE,
        });
        if (delayDays > 7) {
          deductions.push({
            reason: `Severely overdue (>${7} days)`,
            points: PENALTY.OVERDUE_SEVERE,
          });
        }
      }

      // Slow progress: less than 50% done, fewer than 2 days left
      const progress = metadata.progressPercent ?? 0;
      if (daysUntilDue >= 0 && daysUntilDue < 2 && progress < 50) {
        deductions.push({
          reason: `Only ${progress}% complete with <2 days to due date`,
          points: PENALTY.SLOW_PROGRESS,
        });
      }

      // Near-done bonus
      if (progress >= 80) {
        bonuses.push({
          reason: `Task is ${progress}% complete`,
          points: BONUS.NEAR_DONE,
        });
      }
    }

    // ── Blocking predecessor check ──────────────────────────────────────────
    let hasIncompletePrecessor = false;
    for (const predId of node.incomingEdges) {
      const predNode = this.graph.getNode(predId);
      if (predNode && predNode.metadata.status !== "Completed") {
        hasIncompletePrecessor = true;
        break;
      }
    }
    if (hasIncompletePrecessor) {
      deductions.push({
        reason: "Has at least one incomplete predecessor blocking it",
        points: PENALTY.BLOCKED_BY_INCOMPLETE,
      });
    }

    // ── Critical path penalty ───────────────────────────────────────────────
    if (isOnCriticalPath) {
      deductions.push({
        reason: "Task is on the critical path — delays propagate to all successors",
        points: PENALTY.ON_CRITICAL_PATH,
      });
    }

    // ── Priority check ──────────────────────────────────────────────────────
    const isHighPriority = ["High", "Urgent"].includes(metadata.priority ?? "");
    const isStuck = ["To Do", "Work In Progress"].includes(status);
    if (isHighPriority && (isStuck || delayDays > 0)) {
      deductions.push({
        reason: `High/Urgent priority task is ${delayDays > 0 ? "overdue" : "still in progress"}`,
        points: PENALTY.HIGH_PRIORITY_STUCK,
      });
    }

    // ── Sprint deadline check ───────────────────────────────────────────────
    if (metadata.sprintEndDate && metadata.dueDate) {
      const daysToSprintEnd = daysBetween(this.now, metadata.sprintEndDate);
      if (delayDays > 0 && daysToSprintEnd < delayDays) {
        deductions.push({
          reason: `Expected ${delayDays}d delay will push task beyond sprint end date`,
          points: PENALTY.SPRINT_MISS_RISK,
        });
      }
    }

    // ── Final score ─────────────────────────────────────────────────────────
    const totalDeductions = deductions.reduce((s, d) => s + d.points, 0);
    const totalBonuses = bonuses.reduce((s, b) => s + b.points, 0);
    const finalScore = clamp(baseScore - totalDeductions + totalBonuses, 0, 100);

    // ── Downstream affected tasks ───────────────────────────────────────────
    const affectedDownstreamTaskIds =
      delayDays > 0 || hasIncompletePrecessor
        ? this.graph.getAffectedTasks(taskId)
        : [];

    // Cache on node
    node.cachedAnalysis.expectedDelayDays = delayDays;
    node.cachedAnalysis.nodeRiskScore = finalScore;

    return {
      taskId,
      title: metadata.title,
      status: metadata.status,
      priority: metadata.priority,
      assignedUserId: metadata.assignedUserId,
      expectedDelayDays: delayDays,
      isOnCriticalPath,
      riskScore: finalScore,
      riskLevel: riskLevel(finalScore),
      affectedDownstreamTaskIds,
      reasons: [
        ...deductions.map((d) => `${d.reason}: -${d.points} pts`),
        ...bonuses.map((b) => `${b.reason}: +${b.points} pts`),
      ],
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Sprint impact
  // ────────────────────────────────────────────────────────────────────────────

  private computeSprintImpacts(
    atRiskPredictions: TaskPrediction[],
    nodes: Map<number, GraphNode>
  ): SprintImpact[] {
    const sprintMap = new Map<
      number,
      { sprintEndDate: Date | null; atRiskTaskIds: number[]; maxDelay: number }
    >();

    for (const pred of atRiskPredictions) {
      const node = nodes.get(pred.taskId);
      const sprintId = node?.metadata.sprintId;
      if (!sprintId) continue;

      if (!sprintMap.has(sprintId)) {
        sprintMap.set(sprintId, {
          sprintEndDate: node?.metadata.sprintEndDate ?? null,
          atRiskTaskIds: [],
          maxDelay: 0,
        });
      }
      const sprint = sprintMap.get(sprintId)!;
      sprint.atRiskTaskIds.push(pred.taskId);
      sprint.maxDelay = Math.max(sprint.maxDelay, pred.expectedDelayDays);
    }

    const impacts: SprintImpact[] = [];
    for (const [sprintId, data] of sprintMap.entries()) {
      const likelyToMissDeadline =
        data.sprintEndDate !== null &&
        data.maxDelay > 0 &&
        daysBetween(this.now, data.sprintEndDate) < data.maxDelay;

      impacts.push({
        sprintId,
        sprintEndDate: data.sprintEndDate,
        atRiskTaskIds: data.atRiskTaskIds,
        estimatedSprintDelayDays: data.maxDelay,
        likelyToMissDeadline,
      });
    }
    return impacts;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Project-level risk reasoning
  // ────────────────────────────────────────────────────────────────────────────

  private computeProjectRiskReasoning(
    atRiskPredictions: TaskPrediction[],
    analysis: ReturnType<DependencyGraphEngine["analyzeProject"]>,
    sprintImpacts: SprintImpact[]
  ): RiskReasoningData {
    const baseScore = 100;
    const deductions: { reason: string; points: number }[] = [];
    const bonuses: { reason: string; points: number }[] = [];

    const overdueTasks = atRiskPredictions.filter((p) => p.expectedDelayDays > 0);
    const criticalOverdue = atRiskPredictions.filter(
      (p) => p.isOnCriticalPath && p.expectedDelayDays > 0
    );
    const blockedCount = analysis.blockedTasks.length;
    const missedSprintCount = sprintImpacts.filter((s) => s.likelyToMissDeadline).length;
    const cycleCount = analysis.cycleDetails?.length ?? 0;

    if (overdueTasks.length > 0) {
      const pts = Math.min(overdueTasks.length * 5, 25);
      deductions.push({ reason: `${overdueTasks.length} overdue task(s)`, points: pts });
    }

    if (criticalOverdue.length > 0) {
      const pts = Math.min(criticalOverdue.length * 10, 30);
      deductions.push({
        reason: `${criticalOverdue.length} critical-path task(s) are overdue`,
        points: pts,
      });
    }

    if (blockedCount > 0) {
      const pts = Math.min(blockedCount * 3, 15);
      deductions.push({ reason: `${blockedCount} blocked task(s)`, points: pts });
    }

    if (missedSprintCount > 0) {
      deductions.push({
        reason: `${missedSprintCount} sprint(s) likely to miss their deadline`,
        points: missedSprintCount * 5,
      });
    }

    if (cycleCount > 0) {
      deductions.push({
        reason: `${cycleCount} dependency cycle(s) detected — graph is not a DAG`,
        points: 20,
      });
    }

    // Bonus: most tasks are on track
    const onTrackCount = atRiskPredictions.filter((p) => p.riskScore >= 85).length;
    const total = analysis.statistics.totalNodes;
    if (total > 0 && onTrackCount / total > 0.8) {
      bonuses.push({ reason: "More than 80% of tasks are on track", points: 10 });
    }

    const totalDeductions = deductions.reduce((s, d) => s + d.points, 0);
    const totalBonuses = bonuses.reduce((s, b) => s + b.points, 0);
    const finalScore = clamp(baseScore - totalDeductions + totalBonuses, 0, 100);

    return {
      baseScore,
      deductions,
      bonuses,
      finalScore,
      riskLevel: riskLevel(finalScore),
    };
  }
}
