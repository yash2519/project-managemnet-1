"use client";

import React, { useRef, useState, useCallback, DragEvent } from "react";
import { useS3Upload, UploadTypeKey, ConfirmedUpload } from "@/hooks/useS3Upload";
import { Upload, File, CheckCircle, XCircle, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileUploaderProps {
  /** Which upload category this instance handles */
  uploadType: UploadTypeKey;
  /** Owning resource ID (taskId, projectId, etc.) — optional */
  referenceId?: number;
  /** Label shown on the upload button / drop zone */
  label?: string;
  /** HTML accept attribute: e.g. "image/*" or "image/*,application/pdf" */
  accept?: string;
  /** Allowed MIME types forwarded to the hook for client-side validation */
  allowedMimeTypes?: string[];
  /** Max size in MB (default: 5) */
  maxSizeMb?: number;
  /** Called with the confirmed upload record on success */
  onUploadComplete?: (upload: ConfirmedUpload) => void;
  /** Called with error message on failure */
  onUploadError?: (error: string) => void;
  /** Extra className for the container div */
  className?: string;
  /** Whether to show a compact inline version instead of the full drop zone */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FileUploader — drop-in reusable upload component.
 *
 * Usage (full drop-zone mode):
 *   <FileUploader
 *     uploadType="task-attachments"
 *     referenceId={taskId}
 *     label="Add Attachment"
 *     accept="image/*,application/pdf"
 *     onUploadComplete={(u) => console.log(u.publicUrl)}
 *   />
 *
 * Usage (compact button mode):
 *   <FileUploader
 *     uploadType="project-documents"
 *     referenceId={projectId}
 *     compact
 *     accept="application/pdf"
 *     onUploadComplete={handleDoc}
 *   />
 */
const FileUploader: React.FC<FileUploaderProps> = ({
  uploadType,
  referenceId,
  label = "Upload File",
  accept = "image/*,application/pdf",
  allowedMimeTypes,
  maxSizeMb = 5,
  onUploadComplete,
  onUploadError,
  className = "",
  compact = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastUpload, setLastUpload] = useState<ConfirmedUpload | null>(null);

  const { upload, isUploading, progress, error, reset } = useS3Upload({
    uploadType,
    referenceId,
    maxSizeMb,
    allowedMimeTypes,
    onSuccess: (result) => {
      setLastUpload(result);
      onUploadComplete?.(result);
    },
    onError: onUploadError,
  });

  const handleFile = useCallback(
    async (file: File) => {
      setLastUpload(null);
      reset();
      await upload(file);
    },
    [upload, reset]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const triggerInput = () => inputRef.current?.click();

  // ---- Hidden file input (shared by both modes) ----
  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      className="hidden"
      onChange={handleInputChange}
      aria-label={label}
    />
  );

  // ---- Compact mode ----
  if (compact) {
    return (
      <div className={`inline-flex flex-col gap-1 ${className}`}>
        {hiddenInput}
        <button
          type="button"
          onClick={triggerInput}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-dark-secondary dark:text-gray-200 dark:hover:bg-dark-tertiary"
        >
          {isUploading ? (
            <>
              <ProgressSpinner size={14} />
              <span>Uploading… {progress}%</span>
            </>
          ) : (
            <>
              <Upload size={14} />
              <span>{label}</span>
            </>
          )}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {lastUpload && (
          <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle size={12} />
            {lastUpload.fileName}
          </p>
        )}
      </div>
    );
  }

  // ---- Full drop-zone mode ----
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {hiddenInput}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label} — drag and drop or click to browse`}
        onClick={triggerInput}
        onKeyDown={(e) => e.key === "Enter" && triggerInput()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all",
          isDragging
            ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
            : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:bg-dark-secondary dark:hover:border-blue-500 dark:hover:bg-dark-tertiary",
          isUploading ? "pointer-events-none" : "",
        ].join(" ")}
      >
        {/* Icon */}
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            isDragging ? "bg-blue-100 dark:bg-blue-900/50" : "bg-gray-100 dark:bg-dark-tertiary"
          } transition-colors`}
        >
          <Upload
            size={22}
            className={isDragging ? "text-blue-500" : "text-gray-400 dark:text-gray-500"}
          />
        </div>

        {/* Text */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {isDragging ? "Drop it!" : label}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            Drag & drop or{" "}
            <span className="text-blue-500 underline dark:text-blue-400">browse</span>
            {" "}· Max {maxSizeMb} MB
          </p>
        </div>

        {/* Progress overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/80 dark:bg-gray-900/80">
            <ProgressSpinner size={28} />
            <div className="w-48">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-center text-xs text-gray-500 dark:text-gray-400">
                Uploading… {progress}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={reset}
            className="ml-auto shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Success state */}
      {lastUpload && !error && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
          <CheckCircle size={16} className="shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-medium">{lastUpload.fileName}</p>
            {lastUpload.fileSize && (
              <p className="text-xs opacity-70">
                {(lastUpload.fileSize / 1024).toFixed(1)} KB uploaded
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            className="ml-auto shrink-0 text-green-500 hover:text-green-700 dark:hover:text-green-300"
            aria-label="Upload another"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Spinner sub-component
// ---------------------------------------------------------------------------

const ProgressSpinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className="animate-spin text-blue-500"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export default FileUploader;
