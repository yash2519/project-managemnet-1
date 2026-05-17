import { Router } from "express";

import { getUser, getUsers, getUserMe, postUser, updateUser } from "../controllers/userController";

const router = Router();

router.get("/", getUsers);
router.get("/me", getUserMe);
router.post("/", postUser);
router.get("/:cognitoId", getUser);
router.patch("/:cognitoId", updateUser);


export default router;
