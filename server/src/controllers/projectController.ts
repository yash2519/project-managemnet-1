import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const requireProjectOwnerOrAdmin = (project: { ownerId: number }, user: { userId: number, role: string }, res: Response): boolean => {
  if (project.ownerId !== user.userId && user.role !== "ADMIN") {
    res.status(403).json({ message: "Forbidden: insufficient permissions" });
    return false;
  }
  return true;
};

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

    if (req.user) {
      await prisma.activity.create({
        data: {
          userId: req.user.userId,
          projectId: project.id,
          action: "CREATED",
          entity: "Project",
          details: `Project created: ${name}`,
        }
      });
    }

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
    const project = res.locals.project!;
    if (!requireProjectOwnerOrAdmin(project, req.user, res)) return;
    const updated = await prisma.project.update({
      where: { id: Number(projectId) },
      data: {
        name: name ?? undefined,
        description: description ?? undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
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
    const project = res.locals.project!;
    if (!requireProjectOwnerOrAdmin(project, req.user, res)) return;

    // Database natively cascades deletion of tasks, comments, attachments, assignments, and activities
    await prisma.project.delete({
      where: { id: pId },
    });

    res.json({ message: "Project and all associated tasks/data deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: `Error deleting project: ${error.message}` });
  }
};
