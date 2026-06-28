import { PrismaClient } from "@prisma/client";
import { HealthMetricsDTO } from "../types/health";

const prisma = new PrismaClient();

export const getProjectMetrics = async (projectId: number): Promise<HealthMetricsDTO> => {
  const now = new Date();

  // Completed Tasks
  const completedTasks = await prisma.task.count({
    where: { projectId, status: "Completed" }
  });

  // Overdue Tasks: Active tasks with due date in the past
  const overdueTasks = await prisma.task.count({
    where: { 
      projectId, 
      status: { notIn: ["Completed", "Done"] },
      dueDate: { lt: now } 
    }
  });

  // Blocked Tasks: Based on tags or status
  const blockedTasks = await prisma.task.count({
    where: { 
      projectId, 
      OR: [
        { status: { in: ["Blocked", "Under Review"] } },
        { tags: { contains: "Blocked", mode: "insensitive" } }
      ]
    }
  });

  // High Priority Tasks
  const highPriorityTasks = await prisma.task.count({
    where: { 
      projectId, 
      priority: { in: ["High", "Urgent"] }
    }
  });

  // Missed Deadlines: Any task (even completed ones) where a deadline was missed. 
  // We'll approximate this by counting overdue tasks plus completed tasks whose updated date is past their due date
  // Since we don't have a strict 'completedAt' field, we will just use dueDate < now for simplicity as an approximation,
  // or count total tasks with dueDate < now.
  const missedDeadlines = await prisma.task.count({
    where: {
      projectId,
      dueDate: { lt: now }
    }
  });

  // Team Workload: Sum of points for all active tasks
  const activeTasks = await prisma.task.aggregate({
    where: { projectId, status: { notIn: ["Completed", "Done"] } },
    _sum: { points: true }
  });
  const teamWorkload = activeTasks._sum.points || 0;

  return {
    completedTasks,
    overdueTasks,
    blockedTasks,
    highPriorityTasks,
    missedDeadlines,
    teamWorkload,
  };
};
