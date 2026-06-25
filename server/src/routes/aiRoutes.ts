import { Router } from "express";
import { generateTaskBreakdown } from "../controllers/aiController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/breakdown", authMiddleware, generateTaskBreakdown);

export default router;
