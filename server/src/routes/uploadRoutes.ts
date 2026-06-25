import { Router } from "express";
import { getPresignedUrl, confirmUpload, getFileUploads } from "../controllers/uploadController";

const router = Router();

// POST /uploads/presign  — Step 1: get a presigned PUT URL for any upload type
router.post("/presign", getPresignedUrl);

// POST /uploads/confirm  — Step 2: record the completed upload in the DB
router.post("/confirm", confirmUpload);

// GET  /uploads?uploadType=task-attachments&referenceId=7  — list uploads
router.get("/", getFileUploads);

export default router;
