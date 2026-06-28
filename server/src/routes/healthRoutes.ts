import { Router } from "express";
import { validateIdParam } from "../middleware/validate";
import { requireProjectExists } from "../middleware/entityExistence";
import { getProjectHealth } from "../controllers/healthController";

const router = Router({ mergeParams: true });

router.get("/", validateIdParam("projectId"), requireProjectExists, getProjectHealth);

export default router;
