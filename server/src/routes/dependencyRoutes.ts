import { Router } from "express";
import { validateIdParam } from "../middleware/validate";
import { requireProjectExists } from "../middleware/entityExistence";
import { 
  getProjectDependencies, 
  getDependencyGraph, 
  getAffectedTasks 
} from "../controllers/dependencyController";
import taskDependencyRoutes from "./taskDependencyRoutes";

const router = Router({ mergeParams: true });

// Prediction endpoint (GET prediction)
router.get(
  "/",
  validateIdParam("projectId"),
  requireProjectExists,
  getProjectDependencies
);

// Graph endpoint (GET dependency graph)
router.get(
  "/graph",
  validateIdParam("projectId"),
  requireProjectExists,
  getDependencyGraph
);

// Affected tasks endpoint (GET affected tasks)
router.get(
  "/affected/:taskId",
  validateIdParam("projectId"),
  requireProjectExists,
  validateIdParam("taskId"),
  getAffectedTasks
);

router.use(
  "/tasks/:taskId",
  validateIdParam("projectId"),
  requireProjectExists,
  validateIdParam("taskId"),
  taskDependencyRoutes
);

export default router;
