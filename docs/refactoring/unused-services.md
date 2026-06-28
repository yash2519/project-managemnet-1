# Unused Services Report

This report identifies backend service modules in the `server/src/services/` directory that are defined but not utilized.

## Findings
- **Total Services**: 1 (`s3Service.ts`)
- **Unused Services**: 0

## Analysis
The `s3Service.ts` module encapsulates the logic for generating AWS S3 presigned URLs and deleting objects. It is actively imported and utilized by the `uploadController.ts` handling the file upload routes.

No dead code exists in the backend services directory.
