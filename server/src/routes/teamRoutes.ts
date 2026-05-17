import { Router } from "express";
import {
  createTeam,
  getTeams,
  addTeamMember,
  getTeamMembers,
  removeTeamMember,
} from "../controllers/teamController";

const router = Router();

router.get("/", getTeams);
router.post("/", createTeam);
router.post("/:teamId/members", addTeamMember);
router.get("/:teamId/members", getTeamMembers);
router.delete("/:teamId/members/:userId", removeTeamMember);

export default router;

