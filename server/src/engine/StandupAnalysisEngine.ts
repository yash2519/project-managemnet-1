import { PrismaClient, Task } from "@prisma/client";
import { activityCollectionEngine } from "./ActivityCollectionEngine";

const prisma = new PrismaClient();

// --- DTOs for the Standup Analysis ---

export interface StandupTaskInfo {
  id: number;
  title: string;
  assignedTo: string | null;
  status: string | null;
  dueDate: string | null;
}

export interface StandupAnalysisResult {
  projectId: number;
  date: string;
  yesterday: {
    completedTasks: StandupTaskInfo[];
    startedTasks: StandupTaskInfo[];
    reviewedTasks: StandupTaskInfo[];
  };
  today: {
    tasksInProgress: StandupTaskInfo[];
    upcomingWork: StandupTaskInfo[];
  };
  blockers: {
    blockedTasks: StandupTaskInfo[];
    waitingReview: StandupTaskInfo[];
    missingDependencies: StandupTaskInfo[];
    overdueTasks: StandupTaskInfo[];
  };
  teamHighlights: {
    mostActiveMembers: { username: string; actionCount: number }[];
    largestProgress: { username: string; completedCount: number }[];
  };
}

export class StandupAnalysisEngine {
  /**
   * Generates a deterministic standup analysis (Yesterday, Today, Blockers, Team Highlights)
   * based on project activity and current task state.
   * 
   * @param projectId The project to analyze
   * @param targetDate The date representing "Yesterday" (usually the date the standup is run for). Defaults to today UTC if not provided.
   */
  public async analyze(projectId: number, targetDate?: string): Promise<StandupAnalysisResult> {
    // 1. Fetch Yesterday's Activity (using the ActivityCollectionEngine)
    const timeline = await activityCollectionEngine.collectForDate(projectId, targetDate);

    // 2. Fetch Current Project State (Tasks and Dependencies)
    const now = new Date();
    // For upcoming work, let's consider tasks due within the next 3 days
    const next3Days = new Date();
    next3Days.setDate(now.getDate() + 3);

    const projectTasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { username: true } },
        predecessors: {
          include: {
            predecessor: { select: { status: true } },
          },
        },
      },
    });

    // --- Helper function to map a Prisma Task to StandupTaskInfo ---
    const mapTask = (t: any): StandupTaskInfo => ({
      id: t.id,
      title: t.title,
      assignedTo: t.assignee?.username || null,
      status: t.status,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    });

    // =========================================================================
    // YESTERDAY
    // =========================================================================
    const completedTasksMap = new Map<number, StandupTaskInfo>();
    const startedTasksMap = new Map<number, StandupTaskInfo>();
    const reviewedTasksMap = new Map<number, StandupTaskInfo>();

    const userActionCounts: Record<string, number> = {};
    const userCompletionCounts: Record<string, number> = {};

    for (const event of timeline.events) {
      if (!event.task || !event.actor) continue;

      const username = event.actor.username;
      
      // Track most active members
      userActionCounts[username] = (userActionCounts[username] || 0) + 1;

      const tInfo: StandupTaskInfo = {
        id: event.task.taskId,
        title: event.task.title,
        assignedTo: event.task.assignedUserId ? username : null, // Approx
        status: event.task.status,
        dueDate: null, // We don't have it in event.task, but that's fine for activity summary
      };

      if (event.eventType === "TASK_COMPLETED") {
        completedTasksMap.set(tInfo.id, tInfo);
        userCompletionCounts[username] = (userCompletionCounts[username] || 0) + 1;
      } 
      else if (event.eventType === "STATUS_CHANGED" && event.changeDetail?.kind === "STATUS_CHANGED") {
        const toStatus = event.changeDetail.to.toLowerCase();
        if (toStatus.includes("progress") || toStatus.includes("wip")) {
          startedTasksMap.set(tInfo.id, tInfo);
        } else if (toStatus.includes("review")) {
          reviewedTasksMap.set(tInfo.id, tInfo);
        }
      }
    }

    // =========================================================================
    // TODAY & BLOCKERS
    // =========================================================================
    const tasksInProgress: StandupTaskInfo[] = [];
    const upcomingWork: StandupTaskInfo[] = [];
    const blockedTasks: StandupTaskInfo[] = [];
    const waitingReview: StandupTaskInfo[] = [];
    const missingDependencies: StandupTaskInfo[] = [];
    const overdueTasks: StandupTaskInfo[] = [];

    for (const task of projectTasks) {
      const isCompleted = task.status === "Completed" || task.status === "Done";
      const statusLower = task.status?.toLowerCase() || "";

      // In Progress
      if (statusLower === "work in progress" || statusLower === "in progress" || statusLower === "wip") {
        tasksInProgress.push(mapTask(task));
      }

      // Upcoming (To Do and due soon)
      if (statusLower === "to do" && task.dueDate && task.dueDate >= now && task.dueDate <= next3Days) {
        upcomingWork.push(mapTask(task));
      }

      // Blocked
      if (statusLower === "blocked") {
        blockedTasks.push(mapTask(task));
      }

      // Waiting Review
      if (statusLower === "under review" || statusLower === "review") {
        waitingReview.push(mapTask(task));
      }

      // Overdue
      if (!isCompleted && task.dueDate && task.dueDate < now) {
        overdueTasks.push(mapTask(task));
      }

      // Missing Dependencies (Task is NOT completed, and has predecessors that are NOT completed)
      if (!isCompleted) {
        const hasUnmetDependencies = task.predecessors.some(
          (dep) => dep.predecessor.status !== "Completed" && dep.predecessor.status !== "Done"
        );
        if (hasUnmetDependencies && statusLower !== "blocked") {
          // It's effectively blocked by a dependency, even if not explicitly marked "Blocked"
          missingDependencies.push(mapTask(task));
        }
      }
    }

    // =========================================================================
    // TEAM HIGHLIGHTS
    // =========================================================================
    const mostActiveMembers = Object.entries(userActionCounts)
      .map(([username, actionCount]) => ({ username, actionCount }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 3); // Top 3

    const largestProgress = Object.entries(userCompletionCounts)
      .map(([username, completedCount]) => ({ username, completedCount }))
      .sort((a, b) => b.completedCount - a.completedCount)
      .slice(0, 3); // Top 3

    return {
      projectId,
      date: timeline.date,
      yesterday: {
        completedTasks: Array.from(completedTasksMap.values()),
        startedTasks: Array.from(startedTasksMap.values()),
        reviewedTasks: Array.from(reviewedTasksMap.values()),
      },
      today: {
        tasksInProgress,
        upcomingWork,
      },
      blockers: {
        blockedTasks,
        waitingReview,
        missingDependencies,
        overdueTasks,
      },
      teamHighlights: {
        mostActiveMembers,
        largestProgress,
      },
    };
  }

  /**
   * Processes a pre-fetched set of activities and tasks from an AnalysisContext.
   */
  public processContext(context: any, projectId: number, dateLabel: string): StandupAnalysisResult {
    const timeline = context.activitySummary; // Assume activitySummary is attached before calling this
    const projectTasks = context.filteredTasks;
    
    const now = new Date();
    const next3Days = new Date();
    next3Days.setDate(now.getDate() + 3);

    const mapTask = (t: any): StandupTaskInfo => ({
      id: t.id,
      title: t.title,
      assignedTo: t.assignee?.username || null,
      status: t.status,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    });

    // YESTERDAY
    const completedTasksMap = new Map<number, StandupTaskInfo>();
    const startedTasksMap = new Map<number, StandupTaskInfo>();
    const reviewedTasksMap = new Map<number, StandupTaskInfo>();

    const userActionCounts: Record<string, number> = {};
    const userCompletionCounts: Record<string, number> = {};

    for (const event of timeline.events) {
      if (!event.task || !event.actor) continue;

      const username = event.actor.username;
      
      userActionCounts[username] = (userActionCounts[username] || 0) + 1;

      const tInfo: StandupTaskInfo = {
        id: event.task.taskId,
        title: event.task.title,
        assignedTo: event.task.assignedUserId ? username : null,
        status: event.task.status,
        dueDate: null,
      };

      if (event.eventType === "TASK_COMPLETED") {
        completedTasksMap.set(tInfo.id, tInfo);
        userCompletionCounts[username] = (userCompletionCounts[username] || 0) + 1;
      } 
      else if (event.eventType === "STATUS_CHANGED" && event.changeDetail?.kind === "STATUS_CHANGED") {
        const toStatus = event.changeDetail.to.toLowerCase();
        if (toStatus.includes("progress") || toStatus.includes("wip")) {
          startedTasksMap.set(tInfo.id, tInfo);
        } else if (toStatus.includes("review")) {
          reviewedTasksMap.set(tInfo.id, tInfo);
        }
      }
    }

    // TODAY & BLOCKERS
    const tasksInProgress: StandupTaskInfo[] = [];
    const upcomingWork: StandupTaskInfo[] = [];
    const blockedTasks: StandupTaskInfo[] = [];
    const waitingReview: StandupTaskInfo[] = [];
    const missingDependencies: StandupTaskInfo[] = [];
    const overdueTasks: StandupTaskInfo[] = [];

    for (const task of projectTasks) {
      const isCompleted = task.status === "Completed" || task.status === "Done";
      const statusLower = task.status?.toLowerCase() || "";

      if (statusLower === "work in progress" || statusLower === "in progress" || statusLower === "wip") {
        tasksInProgress.push(mapTask(task));
      }

      if (statusLower === "to do" && task.dueDate && new Date(task.dueDate) >= now && new Date(task.dueDate) <= next3Days) {
        upcomingWork.push(mapTask(task));
      }

      if (statusLower === "blocked") {
        blockedTasks.push(mapTask(task));
      }

      if (statusLower === "under review" || statusLower === "review") {
        waitingReview.push(mapTask(task));
      }

      if (!isCompleted && task.dueDate && new Date(task.dueDate) < now) {
        overdueTasks.push(mapTask(task));
      }

      if (!isCompleted) {
        const predecessors = (task as any).predecessors || [];
        const hasUnmetDependencies = predecessors.some(
          (dep: any) => dep.predecessor.status !== "Completed" && dep.predecessor.status !== "Done"
        );
        if (hasUnmetDependencies && statusLower !== "blocked") {
          missingDependencies.push(mapTask(task));
        }
      }
    }

    // TEAM HIGHLIGHTS
    const mostActiveMembers = Object.entries(userActionCounts)
      .map(([username, actionCount]) => ({ username, actionCount }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 3);

    const largestProgress = Object.entries(userCompletionCounts)
      .map(([username, completedCount]) => ({ username, completedCount }))
      .sort((a, b) => b.completedCount - a.completedCount)
      .slice(0, 3);

    return {
      projectId,
      date: dateLabel,
      yesterday: {
        completedTasks: Array.from(completedTasksMap.values()),
        startedTasks: Array.from(startedTasksMap.values()),
        reviewedTasks: Array.from(reviewedTasksMap.values()),
      },
      today: {
        tasksInProgress,
        upcomingWork,
      },
      blockers: {
        blockedTasks,
        waitingReview,
        missingDependencies,
        overdueTasks,
      },
      teamHighlights: {
        mostActiveMembers,
        largestProgress,
      },
    };
  }
}

export const standupAnalysisEngine = new StandupAnalysisEngine();
