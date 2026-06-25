import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION ?? "us-east-1";
const BUCKET = process.env.AWS_S3_BUCKET ?? "pm-s3-images";
const BASE_URL = process.env.AWS_S3_BASE_URL ?? `https://${BUCKET}.s3.${REGION}.amazonaws.com`;
const PRESIGN_EXPIRES_IN = 60; // seconds

// S3 client singleton — uses EC2 instance role if no explicit keys are provided
export const s3Client = new S3Client({
  region: REGION,
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

// ---------------------------------------------------------------------------
// Upload type → S3 folder mapping
// To add a new upload type: add one entry here, add enum value in schema.prisma
// ---------------------------------------------------------------------------

export type UploadTypeKey =
  | "profile-pictures"
  | "task-attachments"
  | "project-documents"
  | "general";

const FOLDER_MAP: Record<UploadTypeKey, string> = {
  "profile-pictures": "profile-pictures",
  "task-attachments": "task-attachments",
  "project-documents": "project-documents",
  general: "general",
};

// ---------------------------------------------------------------------------
// Allowed MIME types (extend as needed — no architecture change required)
// ---------------------------------------------------------------------------

export const ALLOWED_MIME_TYPES: readonly string[] = [
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  // Documents
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PresignedUrlResult {
  /** Time-limited signed URL — PUT the file binary to this URL from the browser */
  uploadUrl: string;
  /** Full S3 key (folder/userId/uuid-filename) — store this in the DB */
  s3Key: string;
  /** Public HTTPS URL for rendering — ready to drop into <img src> */
  publicUrl: string;
}

// ---------------------------------------------------------------------------
// Core helper: build a unique, sanitized S3 key
// ---------------------------------------------------------------------------

function buildS3Key(
  uploadType: UploadTypeKey,
  referenceId: string | number,
  fileName: string
): string {
  const folder = FOLDER_MAP[uploadType];
  const safeName = sanitizeFileName(fileName);
  return `${folder}/${referenceId}/${uuidv4()}-${safeName}`;
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_") // keep safe chars only
    .replace(/_{2,}/g, "_")            // collapse consecutive underscores
    .toLowerCase()
    .slice(0, 100);                     // cap length
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a presigned S3 PUT URL.
 *
 * @param uploadType   One of the UploadTypeKey values
 * @param referenceId  The owning resource's ID (userId, taskId, projectId, etc.)
 * @param fileName     Original file name from the client
 * @param contentType  MIME type of the file
 * @returns            { uploadUrl, s3Key, publicUrl }
 * @throws             Error if contentType is not in the allowed list
 */
export async function generatePresignedUploadUrl(
  uploadType: UploadTypeKey,
  referenceId: string | number,
  fileName: string,
  contentType: string
): Promise<PresignedUrlResult> {
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    throw new Error(
      `File type "${contentType}" is not allowed. Supported types: ${ALLOWED_MIME_TYPES.join(", ")}`
    );
  }

  const s3Key = buildS3Key(uploadType, referenceId, fileName);
  const publicUrl = `${BASE_URL}/${s3Key}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGN_EXPIRES_IN,
  });

  return { uploadUrl, s3Key, publicUrl };
}

/**
 * Deletes an object from S3 by its key.
 * Call this when replacing a profile picture or deleting a resource.
 */
export async function deleteS3Object(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key });
  await s3Client.send(command);
}
