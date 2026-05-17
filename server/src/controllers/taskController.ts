import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { projectId, userId } = req.query;
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
        comments: true,
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
    res.status(201).json(newTask);
  } catch (error: any) {
    res.status(500).json({ message: `Error creating a task: ${error.message}` });
  }
};

export const updateTaskStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { taskId } = req.params;
  const { status } = req.body;
  try {
    const updatedTask = await prisma.task.update({
      where: { id: Number(taskId) },
      data: { status },
    });
    res.json(updatedTask);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating task: ${error.message}` });
  }
};

export const getUserTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { userId } = req.params;
  try {
    const tasks = await prisma.task.findMany({
      where: { assignedUserId: Number(userId) },
      include: { author: true, assignee: true },
    });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving user's tasks: ${error.message}` });
  }
};