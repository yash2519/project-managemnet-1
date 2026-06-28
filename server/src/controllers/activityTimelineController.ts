import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { activityTimelineService } from "../services/activityTimelineService";

const prisma = new PrismaClient();

/**
 * GET /projects/:projectId/activity-timeline
 *
 * Query params:
 *   date  – YYYY-MM-DD (UTC). Defaults to today if omitted.
 *   from  – YYYY-MM-DD range start (use with "to" for multi-day)
 *   to    – YYYY-MM-DD range end   (use with "from" for multi-day)
 */
export const getActivityTimeline = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }

    const { projectId } = req.params;
    const { date, from, to } = req.query as Record<string, string | undefined>;

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
        .json({ message: "Forbidden: insufficient permissions to view activity timeline" });
      return;
    }

    // Validate that "from" and "to" are either both provided or neither is
    if ((from && !to) || (!from && to)) {
      res.status(400).json({
        message: 'Both "from" and "to" query parameters are required for range queries.',
      });
      return;
    }

    let result;
    if (from && to) {
      result = await activityTimelineService.getTimelineRange(
        Number(projectId),
        from,
        to
      );
    } else {
      result = await activityTimelineService.getTimeline(
        Number(projectId),
        date // undefined → defaults to today inside the engine
      );
    }

    res.status(200).json(result);
  } catch (error: any) {
    // Surface date validation errors as 400
    if (
      error.message?.includes("Invalid date") ||
      error.message?.includes('"from" date')
    ) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error("Activity Timeline Controller Error:", error);
    res
      .status(500)
      .json({ message: `Error retrieving activity timeline: ${error.message}` });
  }
};
