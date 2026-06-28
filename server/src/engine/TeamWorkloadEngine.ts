import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface MemberWorkload {
  userId: number;
  username: string;
  completedTasks: number;
  activeTasks: number;
  blockedTasks: number;
  totalPoints: number;
  isOverloaded: boolean;
  isIdle: boolean;
}

export interface TeamWorkloadResult {
  projectId: number;
  teamSummary: {
    totalMembers: number;
    totalActiveTasks: number;
    totalCompletedTasks: number;
    totalBlockedTasks: number;
  };
  memberSummary: MemberWorkload[];
  workloadStatistics: {
    overloadedMembers: MemberWorkload[];
    idleMembers: MemberWorkload[];
    workloadDistribution: { username: string; activePoints: number }[];
  };
}

export class TeamWorkloadEngine {
  /**
   * Generates a deterministic team workload analysis.
   * Calculates tasks per member, identifies overloaded and idle members.
   *
   * @param projectId The project to analyze
   */
  public async analyze(projectId: number): Promise<TeamWorkloadResult> {
    // 1. Fetch project to get associated team members
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          include: {
            members: {
              include: { user: { select: { userId: true, username: true } } },
            },
          },
        },
        projectTeams: {
          include: {
            team: {
              include: {
                members: {
                  include: { user: { select: { userId: true, username: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // 2. Fetch all tasks for the project
    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { userId: true, username: true } },
      },
    });

    // 3. Compile a unique list of members associated with the project
    const membersMap = new Map<number, { userId: number; username: string }>();

    // Include members from the primary team
    if (project.team) {
      project.team.members.forEach((m) => membersMap.set(m.userId, m.user));
    }
    // Include members from associated projectTeams
    project.projectTeams.forEach((pt) => {
      pt.team.members.forEach((m) => membersMap.set(m.userId, m.user));
    });
    // Include any assignee on tasks that might not be formally in the team
    tasks.forEach((task) => {
      if (task.assignee) {
        membersMap.set(task.assignee.userId, task.assignee);
      }
    });

    // Initialize workload map for all members
    const workloadMap = new Map<number, MemberWorkload>();
    membersMap.forEach((user) => {
      workloadMap.set(user.userId, {
        userId: user.userId,
        username: user.username,
        completedTasks: 0,
        activeTasks: 0,
        blockedTasks: 0,
        totalPoints: 0,
        isOverloaded: false,
        isIdle: true, // true until we find an active task
      });
    });

    // 4. Process all tasks to calculate workloads
    let totalActiveTasks = 0;
    let totalCompletedTasks = 0;
    let totalBlockedTasks = 0;

    for (const task of tasks) {
      const isCompleted = task.status === "Completed" || task.status === "Done";
      const isBlocked = task.status === "Blocked";
      const isActive = !isCompleted;

      if (isCompleted) totalCompletedTasks++;
      if (isActive) totalActiveTasks++;
      if (isBlocked) totalBlockedTasks++;

      // Only attribute to a member if assigned
      if (task.assignedUserId) {
        const workload = workloadMap.get(task.assignedUserId);
        if (workload) {
          if (isCompleted) {
            workload.completedTasks++;
          }
          if (isActive) {
            workload.activeTasks++;
            workload.totalPoints += task.points || 0;
            workload.isIdle = false;

            if (isBlocked) {
              workload.blockedTasks++;
            }
          }
        }
      }
    }

    // 5. Determine Overloaded / Idle status
    // Rule: Overloaded if > 5 active tasks OR > 21 active points
    const overloadedMembers: MemberWorkload[] = [];
    const idleMembers: MemberWorkload[] = [];
    const workloadDistribution: { username: string; activePoints: number }[] = [];

    const memberSummary = Array.from(workloadMap.values());

    for (const workload of memberSummary) {
      if (workload.activeTasks > 5 || workload.totalPoints > 21) {
        workload.isOverloaded = true;
        overloadedMembers.push(workload);
      }
      if (workload.isIdle) {
        idleMembers.push(workload);
      }

      workloadDistribution.push({
        username: workload.username,
        activePoints: workload.totalPoints,
      });
    }

    // Sort distribution by points descending
    workloadDistribution.sort((a, b) => b.activePoints - a.activePoints);

    // 6. Return Result
    return {
      projectId,
      teamSummary: {
        totalMembers: membersMap.size,
        totalActiveTasks,
        totalCompletedTasks,
        totalBlockedTasks,
      },
      memberSummary,
      workloadStatistics: {
        overloadedMembers,
        idleMembers,
        workloadDistribution,
      },
    };
  }

  /**
   * Processes pre-fetched filtered tasks from an AnalysisContext.
   */
  public processContext(context: any, projectId: number): TeamWorkloadResult {
    const tasks = context.filteredTasks;
    
    // We infer members from the tasks themselves since we don't fetch the full project team in context.
    const membersMap = new Map<number, { userId: number; username: string }>();
    
    // If context has explicit users, we could add them, but for filtered workload, 
    // it makes sense to only show workload for people involved in these tasks (or selected by filter).
    if (context.filteredUsers) {
      (context.filteredUsers as any[]).filter((u: any, i: number, arr: any[]) => arr.findIndex((x) => x.userId === u.userId) === i).forEach(u => membersMap.set(u.userId, u));
    }
    
    tasks.forEach((task: any) => {
      if (task.assignee) {
        membersMap.set(task.assignee.userId, task.assignee);
      }
    });

    const workloadMap = new Map<number, MemberWorkload>();
    membersMap.forEach((user) => {
      workloadMap.set(user.userId, {
        userId: user.userId,
        username: user.username,
        completedTasks: 0,
        activeTasks: 0,
        blockedTasks: 0,
        totalPoints: 0,
        isOverloaded: false,
        isIdle: true,
      });
    });

    let totalActiveTasks = 0;
    let totalCompletedTasks = 0;
    let totalBlockedTasks = 0;

    for (const task of tasks) {
      const isCompleted = task.status === "Completed" || task.status === "Done";
      const isBlocked = task.status === "Blocked";
      const isActive = !isCompleted;

      if (isCompleted) totalCompletedTasks++;
      if (isActive) totalActiveTasks++;
      if (isBlocked) totalBlockedTasks++;

      if (task.assignedUserId) {
        const workload = workloadMap.get(task.assignedUserId);
        if (workload) {
          if (isCompleted) {
            workload.completedTasks++;
          }
          if (isActive) {
            workload.activeTasks++;
            workload.totalPoints += task.points || 0;
            workload.isIdle = false;

            if (isBlocked) {
              workload.blockedTasks++;
            }
          }
        }
      }
    }

    const overloadedMembers: MemberWorkload[] = [];
    const idleMembers: MemberWorkload[] = [];
    const workloadDistribution: { username: string; activePoints: number }[] = [];

    const memberSummary = Array.from(workloadMap.values());

    for (const workload of memberSummary) {
      if (workload.activeTasks > 5 || workload.totalPoints > 21) {
        workload.isOverloaded = true;
        overloadedMembers.push(workload);
      }
      if (workload.isIdle) {
        idleMembers.push(workload);
      }

      workloadDistribution.push({
        username: workload.username,
        activePoints: workload.totalPoints,
      });
    }

    workloadDistribution.sort((a, b) => b.activePoints - a.activePoints);

    return {
      projectId,
      teamSummary: {
        totalMembers: membersMap.size,
        totalActiveTasks,
        totalCompletedTasks,
        totalBlockedTasks,
      },
      memberSummary,
      workloadStatistics: {
        overloadedMembers,
        idleMembers,
        workloadDistribution,
      },
    };
  }
}

export const teamWorkloadEngine = new TeamWorkloadEngine();
