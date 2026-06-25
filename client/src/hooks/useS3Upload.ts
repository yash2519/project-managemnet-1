"use client";

import { useCallback, useState } from "react";
import { useGetAuthUserQuery } from "@/state/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadTypeKey =
  | "profile-pictures"
  | "task-attachments"
  | "project-documents"
  | "general";

export interface ConfirmedUpload {
  id: number;
  s3Key: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  uploadType: string;
  referenceId?: number;
  uploadedById: number;
  createdAt: string;
}

export interface UseS3UploadOptions {
  /** Which feature-level folder to store under (maps to S3 prefix + DB UploadType) */
  uploadType: UploadTypeKey;
  /** Owning resource ID: taskId, projectId, userId, etc. Optional — falls back to auth userId on server */
  referenceId?: number;
  /** Maximum allowed file size in MB. Default: 5 */
  maxSizeMb?: number;
  /** Allowed MIME types. Default: common images + pdf */
  allowedMimeTypes?: string[];
  /** Called on successful upload + DB confirmation */
  onSuccess?: (result: ConfirmedUpload) => void;
  /** Called when upload fails at any step */
  onError?: (error: string) => void;
}

export interface UseS3UploadReturn {
  /** Call with a File object to run the full 3-step upload flow */
  upload: (file: File) => Promise<ConfirmedUpload | null>;
  /** True while any upload step is in progress */
  isUploading: boolean;
  /** 0-100 percentage (updates after each step: 33, 66, 100) */
  progress: number;
  /** Error message from the most recent failed upload, or null */
  error: string | null;
  /** Reset progress and error state */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_MAX_SIZE_MB = 5;
const DEFAULT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useS3Upload — reusable upload hook for any feature.
 *
 * Usage:
 *   const { upload, isUploading, error } = useS3Upload({
 *     uploadType: "task-attachments",
 *     referenceId: taskId,
 *     onSuccess: (result) => console.log(result.publicUrl),
 *   });
 *
 *   // In your event handler:
 *   const result = await upload(file);
 */
export function useS3Upload(options: UseS3UploadOptions): UseS3UploadReturn {
  const {
    uploadType,
    referenceId,
    maxSizeMb = DEFAULT_MAX_SIZE_MB,
    allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
    onSuccess,
    onError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(
    async (file: File): Promise<ConfirmedUpload | null> => {
      // --- Step 0: Client-side validation ---
      if (!allowedMimeTypes.includes(file.type)) {
        const msg = `File type "${file.type}" is not supported.`;
        setError(msg);
        onError?.(msg);
        return null;
      }

      const maxBytes = maxSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        const msg = `File is too large. Maximum allowed size is ${maxSizeMb} MB.`;
        setError(msg);
        onError?.(msg);
        return null;
      }

      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        // --- Step 1: Get presigned URL from our API ---
        const presignRes = await fetch(`${apiBase}uploads/presign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getAccessToken()}`,
          },
          body: JSON.stringify({
            uploadType,
            referenceId,
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
          }),
        });

        if (!presignRes.ok) {
          const err = await presignRes.json();
          throw new Error(err.message ?? "Failed to get upload URL");
        }

        const { uploadUrl, s3Key, publicUrl } = await presignRes.json();
        setProgress(33);

        // --- Step 2: PUT file binary directly to S3 ---
        const s3Res = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!s3Res.ok) {
          throw new Error(`S3 upload failed (status ${s3Res.status})`);
        }
        setProgress(66);

        // --- Step 3: Confirm upload — save to DB ---
        const confirmRes = await fetch(`${apiBase}uploads/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getAccessToken()}`,
          },
          body: JSON.stringify({
            uploadType,
            referenceId,
            s3Key,
            publicUrl,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          }),
        });

        if (!confirmRes.ok) {
          const err = await confirmRes.json();
          throw new Error(err.message ?? "Failed to confirm upload");
        }

        const confirmedUpload: ConfirmedUpload = await confirmRes.json();
        setProgress(100);
        onSuccess?.(confirmedUpload);
        return confirmedUpload;
      } catch (err: any) {
        const msg = err?.message ?? "Upload failed. Please try again.";
        setError(msg);
        onError?.(msg);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [uploadType, referenceId, maxSizeMb, allowedMimeTypes, apiBase, onSuccess, onError]
  );

  return { upload, isUploading, progress, error, reset };
}

// ---------------------------------------------------------------------------
// Helper: get the current Amplify access token for auth headers
// ---------------------------------------------------------------------------

async function getAccessToken(): Promise<string> {
  try {
    const { fetchAuthSession } = await import("aws-amplify/auth");
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() ?? "";
  } catch {
    return "";
  }
}
