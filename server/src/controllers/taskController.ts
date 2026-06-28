import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { projectId } = req.query;
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthenticated' });
      return;
    }
    // Verify project belongs to a team the user is a member of (unless admin)
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
      // select: { teamId: true }, // Removing select if causing issues
    });
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    if (req.user.role !== 'ADMIN' && project.teamId && (!req.user.teamIds || !req.user.teamIds.includes(project.teamId))) {
      res.status(403).json({ message: 'Forbidden: not part of project team' });
      return;
    }
    const whereClause: any = { projectId: Number(projectId) };
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        author: true,
        assignee: true,
        taskAssignments: { include: { user: true } },
        comments: { include: { user: true } },
        attachments: true,
      },
    });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving tasks: ${error.message}` });
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    title,
    description,
    status,
    priority,
    tags,
    startDate,
    dueDate,
    points,
    projectId,
    authorUserId,
    assignedUserId,
  } = req.body;
  try {
    const newTask = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        tags,
        startDate,
        dueDate,
        points,
        projectId,
        authorUserId,
        assignedUserId,
      },
    });

    if (req.user) {
      await prisma.activity.create({
        data: {
          userId: req.user.userId,
          projectId: Number(projectId),
          taskId: newTask.id,
          action: "CREATED",
          entity: "Task",
          details: `Task created: ${title}`,
        }
      });
    }

    res.status(201).json(newTask);
  } catch (error: any) {
    res.status(500).json({ message: `Error creating a task: ${error.message}` });
  }
};

export const updateTaskStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const { status } = req.body;
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }
    const task = res.locals.task!;
    
    const isOwner = task.project.ownerId === req.user.userId;
    const isAssigned = task.assignedUserId === req.user.userId;
    
    if (!isOwner && !isAssigned) {
      res.status(403).json({ message: "Forbidden: Only the task assignee or project owner can change status" });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id: Number(taskId) },
      data: { status },
    });

    await prisma.activity.create({
      data: {
        userId: req.user.userId,
        projectId: task.projectId,
        taskId: task.id,
        action: "UPDATED",
        entity: "Task",
        details: `Task status changed to ${status}`,
      }
    });

    res.json(updatedTask);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating task status: ${error.message}` });
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const { title, description, status, priority, tags, startDate, dueDate, points, assignedUserId } = req.body;
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }
    const task = res.locals.task!;

    const isOwner = task.project.ownerId === req.user.userId;
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: "Forbidden: Only project owners or admins can edit/assign tasks" });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id: Number(taskId) },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        status: status !== undefined ? status : undefined,
        priority: priority !== undefined ? priority : undefined,
        tags: tags !== undefined ? tags : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        points: points !== undefined ? (points ? Number(points) : null) : undefined,
        assignedUserId: assignedUserId !== undefined ? (assignedUserId ? Number(assignedUserId) : null) : undefined,
      },
    });

    // Emit specific activity events for each field that changed
    const activityPromises: Promise<any>[] = [];
    const baseActivity = {
      userId: req.user.userId,
      projectId: task.projectId,
      taskId: task.id,
      entity: "Task",
    };

    if (status !== undefined && status !== task.status) {
      const isCompleted = status === "Completed";
      const isReopened = task.status === "Completed" && status !== "Completed";
      activityPromises.push(
        prisma.activity.create({
          data: {
            ...baseActivity,
            action: "UPDATED",
            details: isCompleted
              ? `Task status changed to Completed`
              : isReopened
              ? `Task status changed to ${status} (reopened)`
              : `Task status changed to ${status}`,
          },
        })
      );
    }

    if (priority !== undefined && priority !== task.priority) {
      activityPromises.push(
        prisma.activity.create({
          data: {
            ...baseActivity,
            action: "UPDATED",
            details: `Task priority changed to ${priority}`,
          },
        })
      );
    }

    if (
      assignedUserId !== undefined &&
      Number(assignedUserId || 0) !== (task.assignedUserId || 0)
    ) {
      activityPromises.push(
        prisma.activity.create({
          data: {
            ...baseActivity,
            action: "UPDATED",
            details: assignedUserId
              ? `Task assigned to user ${assignedUserId}`
              : `Task unassigned`,
          },
        })
      );
    }

    if (activityPromises.length === 0) {
      activityPromises.push(
        prisma.activity.create({
          data: {
            ...baseActivity,
            action: "UPDATED",
            details: `Task ${task.title} was updated`,
          },
        })
      );
    }

    await Promise.all(activityPromises);

    res.json(updatedTask);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating task details: ${error.message}` });
  }
};

export const getUserTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { userId } = req.params;
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }
    // Only allow admins or the user themselves to fetch their own tasks
    if (req.user.role !== "ADMIN" && req.user.userId !== Number(userId)) {
      res.status(403).json({ message: "Forbidden: cannot view another user's tasks" });
      return;
    }
    const tasks = await prisma.task.findMany({
      where: { assignedUserId: Number(userId) },
      include: {
        author: true,
        assignee: true,
        taskAssignments: { include: { user: true } },
        comments: { include: { user: true } },
        attachments: true,
      },
    });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving user's tasks: ${error.message}` });
  }
};