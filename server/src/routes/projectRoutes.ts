import { Router } from "express";
import {
  createProject,
  getProjects,
  getProjectById,
  deleteProject,
} from "../controllers/projectController";

const router = Router();

router.get("/", getProjects);
router.post("/", createProject);
router.get("/:projectId", getProjectById);
router.delete("/:projectId", deleteProject);

export default router;
