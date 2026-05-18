import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get all projects visible to the user (owner or team member)
export const getProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  try {
    const where: any = {};
    if (req.user.role === "ADMIN") {
      // admin sees all projects
    } else {
      where.OR = [
        { ownerId: req.user.userId },
        { tasks: { some: { assignedUserId: req.user.userId } } },
      ];
    }
    const projects = await prisma.project.findMany({ 
      where, 
      include: { 
        tasks: true,
        owner: { select: { userId: true, username: true } },
      } 
    });
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching projects: ${error.message}` });
  }
};

// Get a single project by ID (must be visible to the user)
export const getProjectById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { projectId } = req.params;
  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
      include: {
        owner: { select: { userId: true, username: true } },
        tasks: true,
      },
    });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    // Check visibility: owner, assigned task, or global admin
    const isOwner = project.ownerId === req.user.userId;
    const isAdmin = req.user.role === "ADMIN";
    const hasAssignedTask = await prisma.task.findFirst({
      where: { projectId: Number(projectId), assignedUserId: req.user.userId },
    });
    
    if (!isOwner && !isAdmin && !hasAssignedTask) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching project: ${error.message}` });
  }
};

// Create a new project; user becomes owner and optionally assign to a team they belong to
export const createProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { name, description, startDate, endDate, teamId } = req.body;
  try {
    if (teamId) {
      const membership = await prisma.userTeam.findFirst({ 
        where: { userId: req.user.userId, teamId: Number(teamId) } 
      });
      if (!membership && req.user.role !== "ADMIN") {
        res.status(403).json({ message: "Forbidden: not a member of the team" });
        return;
      }
    }
    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        ownerId: req.user.userId,
        teamId: teamId ? Number(teamId) : undefined,
      },
    });
    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ message: `Error creating project: ${error.message}` });
  }
};

// Update a project (only owner, team admin/manager, or global admin)
export const updateProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { projectId } = req.params;
  const { name, description, startDate, endDate, teamId } = req.body;
  try {
    const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    const isOwner = project.ownerId === req.user.userId;
    
    if (!isOwner && req.user.role !== "ADMIN") {
      res.status(403).json({ message: "Forbidden: insufficient permissions" });
      return;
    }
    const updated = await prisma.project.update({
      where: { id: Number(projectId) },
      data: {
        name: name ?? undefined,
        description: description ?? undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        teamId: teamId ? Number(teamId) : undefined,
      },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating project: ${error.message}` });
  }
};

// Delete a project (owner or admin or team manager)
export const deleteProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { projectId } = req.params;
  const pId = Number(projectId);
  try {
    const project = await prisma.project.findUnique({ where: { id: pId } });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    const isOwner = project.ownerId === req.user.userId;
    
    if (!isOwner && req.user.role !== "ADMIN") {
      res.status(403).json({ message: "Forbidden: insufficient permissions" });
      return;
    }

    // Cascade delete project dependencies inside a transaction
    await prisma.$transaction(async (tx) => {
      // Find all tasks related to the project
      const tasks = await tx.task.findMany({
        where: { projectId: pId },
        select: { id: true },
      });
      const taskIds = tasks.map((t) => t.id);

      if (taskIds.length > 0) {
        // Delete all comments belonging to tasks in the project
        await tx.comment.deleteMany({
          where: { taskId: { in: taskIds } },
        });

        // Delete all attachments belonging to tasks in the project
        await tx.attachment.deleteMany({
          where: { taskId: { in: taskIds } },
        });

        // Delete all task assignments belonging to tasks in the project
        await tx.taskAssignment.deleteMany({
          where: { taskId: { in: taskIds } },
        });

        // Delete the tasks themselves
        await tx.task.deleteMany({
          where: { projectId: pId },
        });
      }

      // Delete all project team assignments
      await tx.projectTeam.deleteMany({
        where: { projectId: pId },
      });

      // Finally delete the project itself
      await tx.project.delete({
        where: { id: pId },
      });
    });

    res.json({ message: "Project and all associated tasks/data deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: `Error deleting project: ${error.message}` });
  }
};
