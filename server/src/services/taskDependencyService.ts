import { PrismaClient, TaskDependency, DependencyType } from "@prisma/client";
import { dependencyGraphService } from "./dependencyGraphService";
import { DependencyStatus } from "../types/dependency";

const prisma = new PrismaClient();

export class TaskDependencyService {
  /**
   * Adds a new dependency between two tasks.
   * Prevents self-dependencies, duplicate dependencies, and circular dependencies.
   */
  public async addDependency(
    predecessorId: number,
    successorId: number,
    type: DependencyType,
    createdByUserId: number,
    note?: string
  ): Promise<TaskDependency> {
    if (predecessorId === successorId) {
      throw new Error("A task cannot depend on itself.");
    }

    // Check if the exact dependency already exists
    const existing = await prisma.taskDependency.findFirst({
      where: { predecessorId, successorId, type },
    });
    if (existing) {
      throw new Error("This exact dependency already exists.");
    }

    // Prevent circular dependencies (DAG violation)
    const createsCycle = await dependencyGraphService.wouldCreateCycle(predecessorId, successorId);
    if (createsCycle) {
      throw new Error("Cannot create dependency: this would introduce a circular dependency chain.");
    }

    const dep = await prisma.taskDependency.create({
      data: {
        predecessorId,
        successorId,
        type,
        createdByUserId,
        note,
      },
      include: { predecessor: { select: { projectId: true } } },
    });

    // Emit activity log so the ActivityCollectionEngine can classify it
    await prisma.activity.create({
      data: {
        userId: createdByUserId,
        projectId: dep.predecessor.projectId,
        taskId: predecessorId,
        action: "CREATED",
        entity: "TaskDependency",
        details: `Dependency created: predecessor: ${predecessorId} successor: ${successorId} type: ${type}`,
      },
    });

    return dep;
  }

  /**
   * Updates an existing dependency.
   */
  public async updateDependency(
    id: number,
    data: { type?: DependencyType; isActive?: boolean; note?: string }
  ): Promise<TaskDependency> {
    const existing = await prisma.taskDependency.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Dependency not found.");
    }

    return prisma.taskDependency.update({
      where: { id },
      data,
    });
  }

  /**
   * Removes an existing dependency.
   * @param id               The dependency record ID
   * @param removedByUserId  Optional: the user performing the removal (for activity logging)
   */
  public async removeDependency(id: number, removedByUserId?: number): Promise<void> {
    const existing = await prisma.taskDependency.findUnique({
      where: { id },
      include: { predecessor: { select: { projectId: true } } },
    });
    if (!existing) {
      throw new Error("Dependency not found.");
    }

    await prisma.taskDependency.delete({ where: { id } });

    // Emit activity log so the ActivityCollectionEngine can classify it
    if (removedByUserId) {
      await prisma.activity.create({
        data: {
          userId: removedByUserId,
          projectId: existing.predecessor.projectId,
          taskId: existing.predecessorId,
          action: "REMOVED",
          entity: "TaskDependency",
          details: `Dependency removed: predecessor: ${existing.predecessorId} successor: ${existing.successorId}`,
        },
      });
    }
  }

  /**
   * Gets all dependencies for a task (both incoming and outgoing).
   * Also computes the current DependencyStatus for each.
   */
  public async getTaskDependencies(taskId: number) {
    const [predecessors, successors] = await Promise.all([
      prisma.taskDependency.findMany({
        where: { successorId: taskId },
        include: { predecessor: true }, // The task blocking me
      }),
      prisma.taskDependency.findMany({
        where: { predecessorId: taskId },
        include: { successor: true }, // The task I am blocking
      }),
    ]);

    // Attach computed status
    const predecessorsWithStatus = predecessors.map(dep => ({
      ...dep,
      status: this.evaluateStatus(dep.predecessor.status, null), // We'd need successor status to be perfectly accurate, but for now we look at predecessor
    }));

    const successorsWithStatus = successors.map(dep => ({
      ...dep,
      status: this.evaluateStatus(null, dep.successor.status), // Same here
    }));

    return {
      predecessors: predecessorsWithStatus,
      successors: successorsWithStatus,
    };
  }

  /**
   * Evaluates the current status of a dependency.
   * This is a reusable logic block for AI modules and UI.
   *
   * @param predecessorStatus The status of the task that must happen first
   * @param successorStatus The status of the task that depends on it
   */
  public evaluateStatus(predecessorStatus: string | null, successorStatus: string | null): DependencyStatus {
    const isPredecessorDone = predecessorStatus === "Completed";
    const isSuccessorDone = successorStatus === "Completed";

    if (isSuccessorDone) {
      return DependencyStatus.SATISFIED;
    }

    if (isPredecessorDone) {
      return DependencyStatus.READY;
    }

    return DependencyStatus.BLOCKED;
  }
}

export const taskDependencyService = new TaskDependencyService();
