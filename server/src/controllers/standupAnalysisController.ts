import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { standupAnalysisEngine } from "../engine/StandupAnalysisEngine";

const prisma = new PrismaClient();

/**
 * GET /projects/:projectId/standup-analysis
 *
 * Query params:
 *   date  – YYYY-MM-DD (UTC). The target date for "yesterday's" activities. Defaults to today if omitted.
 */
export const getStandupAnalysis = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }

    const { projectId } = req.params;
    const { date } = req.query as Record<string, string | undefined>;

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
        .json({ message: "Forbidden: insufficient permissions to view standup analysis" });
      return;
    }

    const result = await standupAnalysisEngine.analyze(Number(projectId), date);
    res.status(200).json(result);
  } catch (error: any) {
    if (error.message?.includes("Invalid date")) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error("Standup Analysis Controller Error:", error);
    res
      .status(500)
      .json({ message: `Error retrieving standup analysis: ${error.message}` });
  }
};
