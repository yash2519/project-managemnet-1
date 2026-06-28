import { Router } from "express";
import { validateIdParam } from "../middleware/validate";
import { requireProjectExists } from "../middleware/entityExistence";
import { getActivityTimeline } from "../controllers/activityTimelineController";

const router = Router({ mergeParams: true });

/**
 * GET /projects/:projectId/activity-timeline
 * Query params: date (YYYY-MM-DD) | from + to (YYYY-MM-DD range)
 */
router.get(
  "/",
  validateIdParam("projectId"),
  requireProjectExists,
  getActivityTimeline
);

export default router;
