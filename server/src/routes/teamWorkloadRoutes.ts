import { Router } from "express";
import { validateIdParam } from "../middleware/validate";
import { requireProjectExists } from "../middleware/entityExistence";
import { getTeamWorkload } from "../controllers/teamWorkloadController";

const router = Router({ mergeParams: true });

/**
 * GET /projects/:projectId/team-workload
 */
router.get(
  "/",
  validateIdParam("projectId"),
  requireProjectExists,
  getTeamWorkload
);

export default router;
