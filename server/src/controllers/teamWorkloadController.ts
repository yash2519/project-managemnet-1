import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { teamWorkloadEngine } from "../engine/TeamWorkloadEngine";

const prisma = new PrismaClient();

/**
 * GET /projects/:projectId/team-workload
 */
export const getTeamWorkload = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }

    const { projectId } = req.params;

    // Project existence is guaranteed by requireProjectExists middleware.
    const project = res.locals.project;
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    // Authorization: owner | admin | assigned to at least one task in the project
    const isOwner = project.ownerId === req.user.userId;
    const isAdmin = req.user.role === "ADMIN";
    const hasAssignedTask = await prisma.task.findFirst({
      where: { projectId: Number(projectId), assignedUserId: req.user.userId },
    });

    if (!isOwner && !isAdmin && !hasAssignedTask) {
      res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions to view team workload" });
      return;
    }

    const result = await teamWorkloadEngine.analyze(Number(projectId));
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Team Workload Controller Error:", error);
    res
      .status(500)
      .json({ message: `Error retrieving team workload: ${error.message}` });
  }
};
