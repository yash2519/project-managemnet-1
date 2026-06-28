# Unused Hooks Report

This report identifies custom React hooks in the `client/src/hooks/` directory that are defined but not utilized.

## Findings
- **Total Custom Hooks**: 1 (`useS3Upload.ts`)
- **Unused Hooks**: 0

## Analysis
The only custom hook present in the repository, `useS3Upload`, handles the presigned URL flow for AWS S3. It is actively utilized by:
- `client/src/components/FileUploader/index.tsx`
- `client/src/app/profile/page.tsx`

No dead code exists in the hooks directory.
