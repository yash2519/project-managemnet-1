import { Router } from "express";

import { getUser, getUsers, getUserMe, postUser, updateUser, updateProfilePicture } from "../controllers/userController";


const router = Router();

router.get("/", getUsers);
router.get("/me", getUserMe);
router.post("/", postUser);
// NOTE: /me/profile-picture MUST be declared before /:cognitoId
// so Express does not match "me" as the cognitoId param
router.patch("/me/profile-picture", updateProfilePicture);
router.get("/:cognitoId", getUser);
router.patch("/:cognitoId", updateUser);



export default router;
