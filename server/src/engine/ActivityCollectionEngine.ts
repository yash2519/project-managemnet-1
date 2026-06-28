import {
  PrismaClient,
  Activity,
} from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Activity Event Types
// Each ActivityEventType maps to a specific user action recorded in the system.
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityEventType =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "COMMENT_ADDED"
  | "TASK_COMPLETED"
  | "TASK_REOPENED"
  | "DEPENDENCY_CREATED"
  | "DEPENDENCY_REMOVED";

// ─────────────────────────────────────────────────────────────────────────────
// Normalized Activity Timeline Event
// A single, uniformly-shaped event record regardless of the source event type.
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityTimelineEvent {
  /** Unique identifier of the underlying Activity record */
  id: number;

  /** ISO 8601 timestamp of when the event occurred */
  timestamp: string;

  /** Normalized event type derived from Activity.action + Activity.entity */
  eventType: ActivityEventType;

  /** User who performed the action */
  actor: {
    userId: number;
    username: string;
    profilePictureUrl?: string | null;
  } | null;

  /** Task the event relates to (null for project-level events) */
  task: {
    taskId: number;
    title: string;
    status: string | null;
    priority: string | null;
    assignedUserId: number | null;
  } | null;

  /** Human-readable description of the event */
  summary: string;

  /** Structured change data for precise display in UI */
  changeDetail: ActivityChangeDetail | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured Change Detail
// Carries before/after values for field-change events.
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityChangeDetail =
  | { kind: "STATUS_CHANGED"; from: string | null; to: string }
  | { kind: "PRIORITY_CHANGED"; from: string | null; to: string }
  | { kind: "ASSIGNEE_CHANGED"; from: string | null; to: string | null }
  | { kind: "COMMENT_ADDED"; commentText: string }
  | { kind: "DEPENDENCY_CREATED"; predecessorId: number; successorId: number; dependencyType: string }
  | { kind: "DEPENDENCY_REMOVED"; predecessorId: number; successorId: number }
  | { kind: "GENERIC" };

// ─────────────────────────────────────────────────────────────────────────────
// Activity Timeline Response DTO
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityTimelineResponseDTO {
  projectId: number;
  date: string;               // YYYY-MM-DD (the requested date in UTC)
  periodStart: string;        // ISO 8601 start of the queried window
  periodEnd: string;          // ISO 8601 end of the queried window
  totalEvents: number;
  events: ActivityTimelineEvent[];

  /** Counts broken down by event type for quick UI summaries */
  summary: {
    tasksCreated: number;
    tasksCompleted: number;
    statusChanges: number;
    priorityChanges: number;
    assigneeChanges: number;
    commentsAdded: number;
    tasksReopened: number;
    dependenciesCreated: number;
    dependenciesRemoved: number;
    otherUpdates: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Type Classifier
// Maps raw Activity { action, entity, details } into a normalized ActivityEventType.
// ─────────────────────────────────────────────────────────────────────────────

export function classifyActivityEvent(activity: Activity): ActivityEventType {
  const action = activity.action?.toUpperCase() ?? "";
  const entity = activity.entity?.toUpperCase() ?? "";
  const details = (activity.details ?? "").toLowerCase();

  // Dependency events
  if (entity === "TASKDEPENDENCY" || entity === "DEPENDENCY") {
    if (action === "CREATED") return "DEPENDENCY_CREATED";
    if (action === "DELETED" || action === "REMOVED") return "DEPENDENCY_REMOVED";
  }

  // Comment events
  if (entity === "COMMENT") {
    return "COMMENT_ADDED";
  }

  // Task-level events
  if (entity === "TASK") {
    if (action === "CREATED") return "TASK_CREATED";

    if (action === "UPDATED") {
      // Infer specific sub-type from details string (set by taskController)
      if (details.includes("status changed") || details.includes("status:")) return "STATUS_CHANGED";
      if (details.includes("priority")) return "PRIORITY_CHANGED";
      if (details.includes("assign") || details.includes("reassign")) return "ASSIGNEE_CHANGED";
      if (details.includes("completed") || details.includes("status changed to completed")) return "TASK_COMPLETED";
      if (details.includes("reopened") || details.includes("to do") || details.includes("reopen")) return "TASK_REOPENED";
      return "TASK_UPDATED";
    }

    if (action === "COMPLETED") return "TASK_COMPLETED";
    if (action === "DELETED") return "TASK_UPDATED"; // deletion mapped to generic update for safety
  }

  return "TASK_UPDATED";
}

// ─────────────────────────────────────────────────────────────────────────────
// Change Detail Extractor
// Parses the raw Activity.details string into a structured ActivityChangeDetail.
// ─────────────────────────────────────────────────────────────────────────────

export function extractChangeDetail(
  eventType: ActivityEventType,
  details: string | null | undefined
): ActivityChangeDetail | null {
  if (!details) return { kind: "GENERIC" };

  const d = details.trim();

  switch (eventType) {
    case "STATUS_CHANGED":
    case "TASK_COMPLETED":
    case "TASK_REOPENED": {
      // Expected format: "Task status changed to <newStatus>" or "Task status changed from <old> to <new>"
      const toMatch = d.match(/to\s+([^\s(]+(?:\s+[^\s(]+)*?)(?:\s*[.(]|$)/i);
      const fromMatch = d.match(/from\s+([^\s]+(?:\s+[^\s]+)*?)\s+to/i);
      return {
        kind: "STATUS_CHANGED",
        from: fromMatch?.[1] ?? null,
        to: toMatch?.[1] ?? d,
      };
    }

    case "PRIORITY_CHANGED": {
      const toMatch = d.match(/priority.*?to\s+([^\s.]+)/i);
      const fromMatch = d.match(/from\s+([^\s]+)\s+to/i);
      return {
        kind: "PRIORITY_CHANGED",
        from: fromMatch?.[1] ?? null,
        to: toMatch?.[1] ?? d,
      };
    }

    case "ASSIGNEE_CHANGED": {
      const toMatch = d.match(/assigned?\s+to\s+([^\s.]+)/i);
      const fromMatch = d.match(/from\s+([^\s]+)\s+to/i);
      return {
        kind: "ASSIGNEE_CHANGED",
        from: fromMatch?.[1] ?? null,
        to: toMatch?.[1] ?? null,
      };
    }

    case "COMMENT_ADDED": {
      return { kind: "COMMENT_ADDED", commentText: d };
    }

    case "DEPENDENCY_CREATED": {
      const predMatch = d.match(/predecessor[:\s]+(\d+)/i);
      const succMatch = d.match(/successor[:\s]+(\d+)/i);
      const typeMatch = d.match(/type[:\s]+([A-Z_]+)/i);
      return {
        kind: "DEPENDENCY_CREATED",
        predecessorId: predMatch ? Number(predMatch[1]) : 0,
        successorId: succMatch ? Number(succMatch[1]) : 0,
        dependencyType: typeMatch?.[1] ?? "DEPENDS_ON",
      };
    }

    case "DEPENDENCY_REMOVED": {
      const predMatch = d.match(/predecessor[:\s]+(\d+)/i);
      const succMatch = d.match(/successor[:\s]+(\d+)/i);
      return {
        kind: "DEPENDENCY_REMOVED",
        predecessorId: predMatch ? Number(predMatch[1]) : 0,
        successorId: succMatch ? Number(succMatch[1]) : 0,
      };
    }

    default:
      return { kind: "GENERIC" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity Collection Engine
// Core service responsible for querying, classifying, and normalizing activity
// events for a given project and date window.
// ─────────────────────────────────────────────────────────────────────────────

export class ActivityCollectionEngine {
  /**
   * Collects and normalizes all activity events for a project on a specific date (UTC).
   * If no date is provided, defaults to today UTC.
   *
   * @param projectId  The project to collect activity for
   * @param date       Target date string in YYYY-MM-DD format (UTC), defaults to today
   * @returns          A normalized ActivityTimelineResponseDTO
   */
  public async collectForDate(
    projectId: number,
    date?: string
  ): Promise<ActivityTimelineResponseDTO> {
    const { periodStart, periodEnd, dateLabel } = this.buildDateWindow(date);

    // Verify the project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });
    if (!project) {
      throw new Error(`Project ${projectId} not found.`);
    }

    // Fetch all activities within the window in a single query
    const activities = await prisma.activity.findMany({
      where: {
        projectId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        user: {
          select: {
            userId: true,
            username: true,
            profilePictureUrl: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assignedUserId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Normalize each activity record into a timeline event
    const events: ActivityTimelineEvent[] = activities.map((a) =>
      this.normalizeActivity(a as any)
    );

    // Compute summary counts
    const summary = this.computeSummary(events);

    return {
      projectId,
      date: dateLabel,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalEvents: events.length,
      events,
      summary,
    };
  }

  /**
   * Collects activity for a date range (inclusive).
   * Useful for standup generation that needs to span multiple days.
   *
   * @param projectId  The project to collect activity for
   * @param from       Start date in YYYY-MM-DD format (UTC)
   * @param to         End date in YYYY-MM-DD format (UTC)
   */
  public async collectForRange(
    projectId: number,
    from: string,
    to: string
  ): Promise<ActivityTimelineResponseDTO> {
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);

    // Verify the project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new Error(`Project ${projectId} not found.`);
    }

    const activities = await prisma.activity.findMany({
      where: {
        projectId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        user: {
          select: {
            userId: true,
            username: true,
            profilePictureUrl: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assignedUserId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const events: ActivityTimelineEvent[] = activities.map((a) =>
      this.normalizeActivity(a as any)
    );

    const summary = this.computeSummary(events);

    return {
      projectId,
      date: `${from}/${to}`,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      totalEvents: events.length,
      events,
      summary,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private buildDateWindow(date?: string): {
    periodStart: Date;
    periodEnd: Date;
    dateLabel: string;
  } {
    let target: Date;
    let dateLabel: string;

    if (date) {
      // Validate YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`Invalid date format "${date}". Expected YYYY-MM-DD.`);
      }
      target = new Date(`${date}T00:00:00.000Z`);
      if (isNaN(target.getTime())) {
        throw new Error(`Invalid date value "${date}".`);
      }
      dateLabel = date;
    } else {
      // Default to today UTC
      const now = new Date();
      dateLabel = now.toISOString().slice(0, 10);
      target = new Date(`${dateLabel}T00:00:00.000Z`);
    }

    const periodStart = new Date(target);
    periodStart.setUTCHours(0, 0, 0, 0);

    const periodEnd = new Date(target);
    periodEnd.setUTCHours(23, 59, 59, 999);

    return { periodStart, periodEnd, dateLabel };
  }

  private normalizeActivity(
    a: Activity & {
      user: { userId: number; username: string; profilePictureUrl?: string | null } | null;
      task: { id: number; title: string; status: string | null; priority: string | null; assignedUserId: number | null } | null;
    }
  ): ActivityTimelineEvent {
    const eventType = classifyActivityEvent(a);
    const changeDetail = extractChangeDetail(eventType, a.details);

    return {
      id: a.id,
      timestamp: a.createdAt.toISOString(),
      eventType,
      actor: a.user
        ? {
            userId: a.user.userId,
            username: a.user.username,
            profilePictureUrl: a.user.profilePictureUrl,
          }
        : null,
      task: a.task
        ? {
            taskId: a.task.id,
            title: a.task.title,
            status: a.task.status,
            priority: a.task.priority,
            assignedUserId: a.task.assignedUserId,
          }
        : null,
      summary: a.details ?? `${a.action} ${a.entity}`,
      changeDetail,
    };
  }

  private computeSummary(
    events: ActivityTimelineEvent[]
  ): ActivityTimelineResponseDTO["summary"] {
    const counts = {
      tasksCreated: 0,
      tasksCompleted: 0,
      statusChanges: 0,
      priorityChanges: 0,
      assigneeChanges: 0,
      commentsAdded: 0,
      tasksReopened: 0,
      dependenciesCreated: 0,
      dependenciesRemoved: 0,
      otherUpdates: 0,
    };

    for (const e of events) {
      switch (e.eventType) {
        case "TASK_CREATED":        counts.tasksCreated++;        break;
        case "TASK_COMPLETED":      counts.tasksCompleted++;      break;
        case "STATUS_CHANGED":      counts.statusChanges++;       break;
        case "PRIORITY_CHANGED":    counts.priorityChanges++;     break;
        case "ASSIGNEE_CHANGED":    counts.assigneeChanges++;     break;
        case "COMMENT_ADDED":       counts.commentsAdded++;       break;
        case "TASK_REOPENED":       counts.tasksReopened++;       break;
        case "DEPENDENCY_CREATED":  counts.dependenciesCreated++; break;
        case "DEPENDENCY_REMOVED":  counts.dependenciesRemoved++; break;
        default:                    counts.otherUpdates++;         break;
      }
    }

    return counts;
  }

  /**
   * Processes a pre-fetched set of activities from an AnalysisContext.
   */
  public processContext(context: any, projectId: number, dateLabel: string): any {
    const events: ActivityTimelineEvent[] = (context.filteredActivities || []).map((a: any) =>
      this.normalizeActivity(a as any)
    );
    const summary = this.computeSummary(events);
    
    // Determine bounds from context activities
    let periodStart = new Date().toISOString();
    let periodEnd = new Date().toISOString();
    if (events.length > 0) {
      periodStart = events[0].timestamp;
      periodEnd = events[events.length - 1].timestamp;
    }

    return {
      projectId,
      date: dateLabel,
      periodStart,
      periodEnd,
      totalEvents: events.length,
      events,
      summary,
    };
  }
}

// Singleton export for use in services and controllers
export const activityCollectionEngine = new ActivityCollectionEngine();
