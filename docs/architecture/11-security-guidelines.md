# 11 — Security Guidelines

Security is a paramount concern for the TaskMatrix application. This document outlines the security practices and implementations across the stack.

## Authentication and Identity

- **AWS Cognito**: Used as the primary identity provider (IdP). It handles user sign-up, sign-in, password recovery, and issues JWT access tokens.
- **Frontend Authentication**: The Next.js frontend uses AWS Amplify UI components (`@aws-amplify/ui-react`) to provide a secure authentication wrapper (`AuthProvider.tsx`). The RTK Query setup automatically attaches the Cognito JWT to API requests.
- **Backend Verification**: The Express backend uses custom middleware (`src/middleware/auth.ts`) to intercept API requests. It uses the `aws-jwt-verify` library to fully verify each JWT:
  - Cryptographic RS256 signature verification against the Cognito JWKS public keys.
  - Issuer validation (must match the configured User Pool URL).
  - Client ID (audience) validation against `COGNITO_CLIENT_ID`.
  - Token expiry (`exp` claim) strictly enforced.
  - JWKS are automatically fetched from Cognito and cached in-process on first request.

## Authorization and Access Control

- **Role-Based Access Control (RBAC)**: The Prisma schema defines three roles: `ADMIN`, `MANAGER`, and `MEMBER`.
- **Resource Ownership**:
  - **Projects**: Visible to the owner, team members, or assigned task holders. Admins see all.
  - **Tasks**: Modifiable primarily by the project owner or assigned user.
- **Middleware Enforcement**: A `requireRole` helper exists in `auth.ts` to strictly enforce endpoint access based on the `req.user.role`.

## File Upload Security

- **Presigned URLs**: Clients cannot upload directly to S3 without authorization. They must first request a presigned PUT URL from the backend, which validates the request.
- **MIME Type Validation**: The backend restricts uploads to specific MIME types (e.g., standard images, PDFs, Word documents) defined in `ALLOWED_MIME_TYPES`.
- **File Size Limits**: Uploads are restricted by a maximum file size (default 5MB) enforced during the presigned URL generation.
- **S3 Configuration**: The S3 bucket should be configured to prevent public write access. Files are served publicly via read-only URLs.

## General Web Security

- **Helmet**: The backend utilizes the `helmet` middleware to set secure HTTP headers (e.g., Content-Security-Policy, X-Frame-Options, HSTS).
- **CORS**: Cross-Origin Resource Sharing is enabled via the `cors` middleware. In production, this should be restricted to the specific frontend domain.
- **Environment Variables**: Sensitive keys (Database URLs, API keys, AWS credentials) are stored in `.env` files and never committed to source control.
