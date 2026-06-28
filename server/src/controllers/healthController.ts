import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { calculateProjectHealth } from "../services/healthService";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getProjectHealth = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      res.status(403).json({ message: "Forbidden: insufficient permissions to view health" });
      return;
    }

    const healthData = await calculateProjectHealth(Number(projectId));
    res.status(200).json(healthData);
  } catch (error: any) {
    console.error("Health Controller Error:", error);
    res.status(500).json({ message: `Error calculating health: ${error.message}` });
  }
};
