import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { analyseProjectDependencies } from "../services/dependencyService";
import { dependencyGraphService } from "../services/dependencyGraphService";

const prisma = new PrismaClient();

export const getProjectDependencies = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }

    const { projectId } = req.params;

    if (!projectId) {
      res.status(400).json({ message: "projectId is required." });
      return;
    }

    const project = res.locals.project;
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
      res.status(403).json({ message: "Forbidden: insufficient permissions to view dependencies" });
      return;
    }

    const result = await analyseProjectDependencies(Number(projectId), project.name);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Dependency Controller Error:", error);
    res.status(500).json({ message: `Error analysing dependencies: ${error.message}` });
  }
};

export const getDependencyGraph = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }

    const { projectId } = req.params;
    
    // Auth checks
    const project = res.locals.project;
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    const isOwner = project.ownerId === req.user.userId;
    const isAdmin = req.user.role === "ADMIN";
    const hasAssignedTask = await prisma.task.findFirst({
      where: { projectId: Number(projectId), assignedUserId: req.user.userId },
    });
    if (!isOwner && !isAdmin && !hasAssignedTask) {
      res.status(403).json({ message: "Forbidden: insufficient permissions to view dependencies" });
      return;
    }

    const engine = await dependencyGraphService.buildEngineForProject(Number(projectId));
    
    // Convert Map to array of objects for JSON serialization
    const nodes = Array.from(engine.getNodes().values());
    res.status(200).json({ projectId: Number(projectId), nodes });
  } catch (error: any) {
    console.error("Dependency Graph Controller Error:", error);
    res.status(500).json({ message: `Error retrieving dependency graph: ${error.message}` });
  }
};

export const getAffectedTasks = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }

    const { projectId, taskId } = req.params;
    
    // Auth checks
    const project = res.locals.project;
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    const isOwner = project.ownerId === req.user.userId;
    const isAdmin = req.user.role === "ADMIN";
    const hasAssignedTask = await prisma.task.findFirst({
      where: { projectId: Number(projectId), assignedUserId: req.user.userId },
    });
    if (!isOwner && !isAdmin && !hasAssignedTask) {
      res.status(403).json({ message: "Forbidden: insufficient permissions to view affected tasks" });
      return;
    }

    const affected = await dependencyGraphService.getAffectedDownstreamTasks(Number(taskId));
    
    res.status(200).json({ taskId: Number(taskId), affectedTasks: affected });
  } catch (error: any) {
    console.error("Affected Tasks Controller Error:", error);
    res.status(500).json({ message: `Error retrieving affected tasks: ${error.message}` });
  }
};
