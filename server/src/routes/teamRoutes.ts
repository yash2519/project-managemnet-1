import { Router } from "express";
import { validateIdParam } from "../middleware/validate";
import { requireTeamExists } from "../middleware/entityExistence";
import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  addTeamMember,
  getTeamMembers,
  removeTeamMember,
} from "../controllers/teamController";

const router = Router();

router.get("/", getTeams);
router.post("/", createTeam);
router.get("/:teamId", validateIdParam("teamId"), getTeamById);
router.patch("/:teamId", validateIdParam("teamId"), requireTeamExists, updateTeam);
router.post("/:teamId/members", validateIdParam("teamId"), addTeamMember);
router.get("/:teamId/members", validateIdParam("teamId"), getTeamMembers);
router.delete("/:teamId/members/:userId", validateIdParam("teamId"), validateIdParam("userId"), removeTeamMember);

export default router;
