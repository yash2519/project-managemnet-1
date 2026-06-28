import { Router } from "express";
import { validateIdParam } from "../middleware/validate";
import { requireProjectExists } from "../middleware/entityExistence";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "../controllers/projectController";
import healthRoutes from "./healthRoutes";
import dependencyRoutes from "./dependencyRoutes";
import activityTimelineRoutes from "./activityTimelineRoutes";
import dailyTimelineRoutes from "./dailyTimelineRoutes";
import standupAnalysisRoutes from "./standupAnalysisRoutes";
import teamWorkloadRoutes from "./teamWorkloadRoutes";
import standupRoutes from "./standupRoutes";

const router = Router();

router.get("/", getProjects);
router.post("/", createProject);
router.get("/:projectId", validateIdParam("projectId"), getProjectById);
router.patch("/:projectId", validateIdParam("projectId"), requireProjectExists, updateProject);
router.delete("/:projectId", validateIdParam("projectId"), requireProjectExists, deleteProject);

router.use("/:projectId/health", healthRoutes);
router.use("/:projectId/dependencies", dependencyRoutes);
router.use("/:projectId/activity-timeline", activityTimelineRoutes);
router.use("/:projectId/daily-timeline", dailyTimelineRoutes);
router.use("/:projectId/standup-analysis", standupAnalysisRoutes);
router.use("/:projectId/team-workload", teamWorkloadRoutes);
router.use("/:projectId/standup", standupRoutes);

export default router;
