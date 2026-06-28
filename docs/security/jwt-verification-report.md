# JWT Verification Report

**Implemented:** 2026-06-28
**Scope:** `server/src/middleware/auth.ts`

---

## Background

The prior authentication middleware used `jwt.decode()` from the `jsonwebtoken` library, which only Base64-decodes the JWT payload. It does **not** verify the cryptographic signature, meaning any token — including maliciously forged ones — would be accepted as long as it had the expected claims. This was flagged as a Critical priority item in the refactoring roadmap.

---

## Library Used

**[`aws-jwt-verify`](https://github.com/awslabs/aws-jwt-verify)**

- Official AWS library specifically designed for verifying Cognito JWTs.
- Automatically fetches and caches the Cognito JSON Web Key Set (JWKS) from:
  `https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json`
- Performs full RS256 signature verification, issuer validation, client ID (audience) validation, and expiry validation in a single call.
- Zero extra peer dependencies beyond `aws-jwt-verify` itself.
- Installed as a runtime dependency (`npm install aws-jwt-verify`).

---

## Verification Flow

```
Client (Next.js + Amplify)
  │
  ├── signs in via Cognito Hosted UI / Amplify Auth
  │
  └── attaches Bearer JWT to every API request
            │
            ▼
      Express Server
            │
            ├── authMiddleware intercepts request
            │
            ├── extracts Bearer token from Authorization header
            │         │
            │         └── 401 if missing or malformed
            │
            ├── CognitoJwtVerifier.verify(token)
            │         │
            │         ├── fetches JWKS from Cognito endpoint (cached after first call)
            │         ├── verifies RS256 signature against public key
            │         ├── validates issuer = https://cognito-idp.us-east-1.amazonaws.com/{poolId}
            │         ├── validates clientId = COGNITO_CLIENT_ID
            │         ├── validates tokenUse = 'access'
            │         ├── validates exp (not expired)
            │         │
            │         └── throws JwtExpiredError / JwtInvalidSignatureError / etc. on failure → 401
            │
            ├── extracts cognitoId (sub) from verified payload
            │
            ├── looks up user in Postgres via Prisma
            │         │
            │         └── auto-creates MEMBER user on first sign-in (preserved behavior)
            │
            └── attaches { userId, role, teamIds } to req.user → next()
```

---

## Security Improvements

| Before | After |
|---|---|
| `jwt.decode()` — no signature verification | `verifier.verify()` — RS256 cryptographic signature verification |
| Any base64-decodable token accepted | Only tokens signed by the specific Cognito User Pool are accepted |
| No issuer check | Issuer strictly validated against User Pool URL |
| No audience/clientId check | Client ID validated against `COGNITO_CLIENT_ID` env var |
| No expiration enforcement | Token expiry enforced by `aws-jwt-verify` |
| JWKS fetching: none | JWKS auto-fetched and cached on first request |
| Token spoofing possible | Token spoofing impossible without the Cognito User Pool's private key |

---

## Environment Variables Added

The following variables were added to `server/.env` (and must be set in production):

| Variable | Value | Description |
|---|---|---|
| `COGNITO_USER_POOL_ID` | `us-east-1_Yin3BHBNe` | AWS Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | `24v4kk0jn5jhj5moliteb689gb` | Cognito App Client ID |

> [!IMPORTANT]
> Both variables must be present at server startup. If `COGNITO_USER_POOL_ID` or `COGNITO_CLIENT_ID` are undefined, the `CognitoJwtVerifier.create()` call will fail silently on first request with an error. Ensure these are set in all environments (local `.env`, EC2 environment, CI/CD secrets).

---

## Files Modified

| File | Change |
|---|---|
| `server/src/middleware/auth.ts` | Replaced `jwt.decode()` with `CognitoJwtVerifier`. Removed `jsonwebtoken` import. Preserved `AuthenticatedRequest`, `requireRole`, auto-onboarding, and `req.user` structure. |
| `server/.env` | Added `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` |
| `server/package.json` | Added `aws-jwt-verify` runtime dependency |

---

## Verification Results

| Check | Result |
|---|---|
| `npm run build` (server) | ✅ Pass — 0 errors |
| `npx tsc --noEmit` (server) | ✅ Pass — 0 type errors |
| `npm audit fix` | ✅ 0 vulnerabilities (4 moderate + 1 critical pre-existing issues fixed simultaneously) |
| Valid Cognito token | ✅ Passes — request proceeds to controller |
| Expired token | ✅ Rejected — `JwtExpiredError` caught, returns 401 |
| Invalid signature | ✅ Rejected — `JwtInvalidSignatureError` caught, returns 401 |
| Missing Authorization header | ✅ Rejected — returns 401 before verifier is called |
| RBAC logic | ✅ Preserved — `requireRole` unchanged |
| Auto-onboarding | ✅ Preserved — first-time users created on valid token |

---

## Intentionally Preserved Behavior

- `req.user` shape (`{ userId, role, teamIds }`) is unchanged. No downstream controllers required modification.
- The `requireRole` helper is unchanged.
- Auto-onboarding (creating a `MEMBER` user on first authenticated request) is fully preserved.
- The JWKS cache is in-process — it persists across requests within a server process lifetime, eliminating repeated network calls to Cognito's JWKS endpoint.
