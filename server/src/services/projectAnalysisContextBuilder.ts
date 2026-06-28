import { PrismaClient, Prisma } from "@prisma/client";
import { AnalysisFilters, ProjectAnalysisContext } from "../types/analysis";
import { activityCollectionEngine } from "../engine/ActivityCollectionEngine";
import { teamWorkloadEngine } from "../engine/TeamWorkloadEngine";
import { dependencyGraphService } from "./dependencyGraphService";
import { calculateProjectHealth } from "./healthService";

const prisma = new PrismaClient();

export const buildProjectAnalysisContext = async (
  projectId: number,
  userId: number,
  targetDateLabel: string,
  filters: AnalysisFilters = {},
  cacheStatus: ProjectAnalysisContext["metadata"]["cacheStatus"] = "miss"
): Promise<ProjectAnalysisContext> => {
  // 1. Determine date range for activities
  let periodStart = new Date();
  periodStart.setUTCHours(0, 0, 0, 0);
  let periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 1);

  if (filters.startDate) {
    periodStart = new Date(filters.startDate);
  }
  if (filters.endDate) {
    periodEnd = new Date(filters.endDate);
    periodEnd.setUTCHours(23, 59, 59, 999);
  } else if (filters.startDate) {
    periodEnd = new Date(filters.startDate);
    periodEnd.setUTCHours(23, 59, 59, 999);
  }

  // 2. Build Where clauses
  const activityWhere: Prisma.ActivityWhereInput = {
    projectId,
    createdAt: { gte: periodStart, lte: periodEnd }
  };
  const taskWhere: Prisma.TaskWhereInput = { projectId };

  // 3. Apply explicit filters
  if (filters.userId) {
    activityWhere.userId = filters.userId;
    taskWhere.assignedUserId = filters.userId;
  }

  if (filters.taskIds && filters.taskIds.length > 0) {
    activityWhere.taskId = { in: filters.taskIds };
    taskWhere.id = { in: filters.taskIds };
  }

  if (filters.teamId) {
    const teamMembers = await prisma.userTeam.findMany({
      where: { teamId: filters.teamId },
      select: { userId: true }
    });
    const userIds = teamMembers.map(tm => tm.userId);
    if (userIds.length > 0) {
      if (!activityWhere.userId) activityWhere.userId = { in: userIds };
      if (!taskWhere.assignedUserId) taskWhere.assignedUserId = { in: userIds };
    } else {
      activityWhere.userId = -1;
      taskWhere.assignedUserId = -1;
    }
  }

  // 4. Fetch base data
  const [filteredActivities, filteredTasks] = await Promise.all([
    prisma.activity.findMany({
      where: activityWhere,
      include: {
        user: { select: { userId: true, username: true, profilePictureUrl: true } },
        task: { select: { id: true, title: true, status: true, priority: true, assignedUserId: true } }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.task.findMany({
      where: taskWhere,
      include: {
        assignee: { select: { userId: true, username: true } },
        predecessors: { include: { predecessor: { select: { status: true } } } }
      }
    })
  ]);

  // Temporary mock context just to feed engines that currently expect the flat structure
  const legacyContextMock = {
    filters,
    filteredActivities,
    filteredTasks
  };

  // 5. Execute analytics engines in parallel
  const [activitySummary, workloadSummary, dependencySummary, healthSummary] = await Promise.all([
    Promise.resolve(activityCollectionEngine.processContext(legacyContextMock, projectId, targetDateLabel)),
    Promise.resolve(teamWorkloadEngine.processContext(legacyContextMock, projectId)),
    dependencyGraphService.predictProject(projectId),
    calculateProjectHealth(projectId)
  ]);

  // 6. Assemble the final immutable ProjectAnalysisContext
  const context: ProjectAnalysisContext = {
    metadata: {
      projectId,
      generatedAt: new Date().toISOString(),
      analysisVersion: "1.1",
      contextVersion: "1.0",
      generatedBy: userId,
      cacheStatus,
      targetDateLabel
    },
    filters,
    baseData: {
      filteredTasks,
      filteredActivities
    },
    analytics: {
      activity: activitySummary,
      workload: workloadSummary,
      dependency: dependencySummary,
      health: healthSummary
    },
    aiMetadata: {
      promptVersion: "1.0"
    }
  };

  return context;
};

