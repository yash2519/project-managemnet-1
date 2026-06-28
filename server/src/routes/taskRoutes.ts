import { Router } from "express";
import { validateIdParam } from "../middleware/validate";
import { requireTaskExists } from "../middleware/entityExistence";
import {
  createTask,
  getTasks,
  getUserTasks,
  updateTaskStatus,
  updateTask,
} from "../controllers/taskController";

const router = Router();

router.get("/", getTasks);
router.post("/", createTask);
router.patch("/:taskId/status", validateIdParam("taskId"), requireTaskExists, updateTaskStatus);
router.patch("/:taskId", validateIdParam("taskId"), requireTaskExists, updateTask);
router.get("/user/:userId", validateIdParam("userId"), getUserTasks);
// //changing
// router.get("/my/:cognitoId", getUserTasks); 
export default router;
