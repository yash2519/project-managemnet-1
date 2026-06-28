import { Router } from "express";
import {
  getTaskDependencies,
  addDependency,
  updateDependency,
  removeDependency,
} from "../controllers/taskDependencyController";

const router = Router({ mergeParams: true });

// These routes will be mounted under /projects/:projectId/dependencies/tasks/:taskId
router.get("/", getTaskDependencies);
router.post("/", addDependency);
router.patch("/:dependencyId", updateDependency);
router.delete("/:dependencyId", removeDependency);

export default router;
