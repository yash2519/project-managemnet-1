import { Router } from "express";
import { validateIdParam } from "../middleware/validate";
import { requireProjectExists } from "../middleware/entityExistence";
import { getStandupAnalysis } from "../controllers/standupAnalysisController";

const router = Router({ mergeParams: true });

/**
 * GET /projects/:projectId/standup-analysis
 * Query params: date (YYYY-MM-DD)
 */
router.get(
  "/",
  validateIdParam("projectId"),
  requireProjectExists,
  getStandupAnalysis
);

export default router;
