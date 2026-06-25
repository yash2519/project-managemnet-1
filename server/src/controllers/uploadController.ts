import { Response } from "express";
import { PrismaClient, UploadType } from "@prisma/client";
import {
  generatePresignedUploadUrl,
  UploadTypeKey,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "../services/s3Service";
import { AuthenticatedRequest } from "../middleware/auth";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Map URL-safe upload type strings → Prisma enum values
// ---------------------------------------------------------------------------

const UPLOAD_TYPE_MAP: Record<UploadTypeKey, UploadType> = {
  "profile-pictures": UploadType.PROFILE_PICTURE,
  "task-attachments": UploadType.TASK_ATTACHMENT,
  "project-documents": UploadType.PROJECT_DOCUMENT,
  general: UploadType.GENERAL,
};

const VALID_UPLOAD_TYPES = Object.keys(UPLOAD_TYPE_MAP) as UploadTypeKey[];

function isValidUploadType(value: string): value is UploadTypeKey {
  return VALID_UPLOAD_TYPES.includes(value as UploadTypeKey);
}

// ---------------------------------------------------------------------------
// POST /uploads/presign
// ---------------------------------------------------------------------------

/**
 * Step 1 of the upload flow.
 * Returns a short-lived presigned S3 PUT URL and the resulting s3Key.
 * The client must PUT the file binary directly to uploadUrl.
 *
 * Body: { uploadType, referenceId?, fileName, contentType, fileSize? }
 */
export const getPresignedUrl = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }

  const { uploadType, referenceId, fileName, contentType, fileSize } = req.body;

  // --- Validation ---
  if (!uploadType || !fileName || !contentType) {
    res.status(400).json({ message: "uploadType, fileName, and contentType are required" });
    return;
  }

  if (!isValidUploadType(uploadType)) {
    res
      .status(400)
      .json({ message: `Invalid uploadType. Allowed: ${VALID_UPLOAD_TYPES.join(", ")}` });
    return;
  }

  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    res.status(400).json({
      message: `File type "${contentType}" is not allowed.`,
      allowedTypes: ALLOWED_MIME_TYPES,
    });
    return;
  }

  if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
    res
      .status(400)
      .json({ message: `File exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB` });
    return;
  }

  try {
    // Use referenceId if provided, fall back to the authenticated userId
    const refId = referenceId ?? req.user.userId;

    const result = await generatePresignedUploadUrl(
      uploadType as UploadTypeKey,
      refId,
      fileName,
      contentType
    );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// POST /uploads/confirm
// ---------------------------------------------------------------------------

/**
 * Step 2 of the upload flow.
 * Called after a successful PUT to the presigned URL.
 * Saves the upload metadata to the FileUpload table.
 *
 * Body: { uploadType, referenceId?, s3Key, publicUrl, fileName, mimeType, fileSize? }
 */
export const confirmUpload = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }

  const { uploadType, referenceId, s3Key, publicUrl, fileName, mimeType, fileSize } = req.body;

  if (!uploadType || !s3Key || !publicUrl || !fileName || !mimeType) {
    res
      .status(400)
      .json({ message: "uploadType, s3Key, publicUrl, fileName, and mimeType are required" });
    return;
  }

  if (!isValidUploadType(uploadType)) {
    res
      .status(400)
      .json({ message: `Invalid uploadType. Allowed: ${VALID_UPLOAD_TYPES.join(", ")}` });
    return;
  }

  try {
    const prismaUploadType = UPLOAD_TYPE_MAP[uploadType as UploadTypeKey];

    const fileUpload = await prisma.fileUpload.create({
      data: {
        s3Key,
        publicUrl,
        fileName,
        mimeType,
        fileSize: fileSize ? Number(fileSize) : undefined,
        uploadType: prismaUploadType,
        referenceId: referenceId ? Number(referenceId) : undefined,
        uploadedById: req.user.userId,
      },
      include: {
        uploadedBy: {
          select: { userId: true, username: true },
        },
      },
    });

    res.status(201).json(fileUpload);
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(409).json({ message: "A file with this key already exists" });
      return;
    }
    res.status(500).json({ message: `Error confirming upload: ${error.message}` });
  }
};

// ---------------------------------------------------------------------------
// GET /uploads?uploadType=&referenceId=
// ---------------------------------------------------------------------------

/**
 * Lists uploads filtered by uploadType and optional referenceId.
 * Used by task detail views, project pages, etc.
 *
 * Query params: uploadType (required), referenceId (optional)
 */
export const getFileUploads = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }

  const { uploadType, referenceId } = req.query;

  if (!uploadType || !isValidUploadType(uploadType as string)) {
    res
      .status(400)
      .json({ message: `uploadType is required. Allowed: ${VALID_UPLOAD_TYPES.join(", ")}` });
    return;
  }

  try {
    const prismaUploadType = UPLOAD_TYPE_MAP[uploadType as UploadTypeKey];

    const uploads = await prisma.fileUpload.findMany({
      where: {
        uploadType: prismaUploadType,
        ...(referenceId ? { referenceId: Number(referenceId) } : {}),
      },
      include: {
        uploadedBy: {
          select: { userId: true, username: true, profilePictureUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(uploads);
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching uploads: ${error.message}` });
  }
};
