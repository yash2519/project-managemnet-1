import { Router } from "express";
import { validateIdParam } from "../middleware/validate";
import { requireProjectExists } from "../middleware/entityExistence";
import { getDailyTimeline } from "../controllers/dailyTimelineController";

const router = Router({ mergeParams: true });

/**
 * GET /projects/:projectId/daily-timeline
 * Query params: date (YYYY-MM-DD)
 */
router.get(
  "/",
  validateIdParam("projectId"),
  requireProjectExists,
  getDailyTimeline
);

export default router;
