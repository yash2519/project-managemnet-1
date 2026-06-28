import { Router } from "express";
import { validateIdParam } from "../middleware/validate";
import { requireProjectExists } from "../middleware/entityExistence";
import {
  generateStandup,
  regenerateStandup,
  getTodayStandup,
  getStandupByDate,
  getStandupHistory,
  compareStandups,
  exportStandups,
} from "../controllers/standupController";

const router = Router({ mergeParams: true });

router.use(validateIdParam("projectId"));
router.use(requireProjectExists);

// GET /projects/:projectId/standup/today
router.get("/today", getTodayStandup);

// GET /projects/:projectId/standup/history?page=&limit=&startDate=&endDate=
router.get("/history", getStandupHistory);

// GET /projects/:projectId/standup/export?format=json|csv|md&startDate=&endDate=
router.get("/export", exportStandups);

// GET /projects/:projectId/standup/compare?dateA=YYYY-MM-DD&dateB=YYYY-MM-DD
router.get("/compare", compareStandups);

// GET /projects/:projectId/standup/date/:date
router.get("/date/:date", getStandupByDate);

// POST /projects/:projectId/standup
router.post("/", generateStandup);

// POST /projects/:projectId/standup/regenerate
router.post("/regenerate", regenerateStandup);

export default router;
