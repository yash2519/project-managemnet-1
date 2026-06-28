# 01 — Project Overview

## Application Name

**TaskMatrix** — A full-stack Project Management Dashboard.

---

## Purpose

TaskMatrix is a comprehensive project management platform that enables teams to:

- Create and manage projects with start/end dates and ownership
- Organize tasks across multiple views (Board, List, Table, Timeline/Gantt)
- Assign tasks to team members with priority levels and story points
- Collaborate via comments and file attachments
- Track activity streams across projects and tasks
- Search across tasks, projects, and users
- Upload files (profile pictures, task attachments, project documents) to AWS S3
- Use AI (Google Gemini 2.5 Flash) to intelligently break down tasks into subtasks

---

## Architecture Style

**Monorepo** with two distinct workspaces:

| Workspace | Technology |
|-----------|-----------|
| `client/` | Next.js 14 (App Router), TypeScript, Redux Toolkit, RTK Query, TailwindCSS, MUI |
| `server/` | Node.js, Express 4, TypeScript, Prisma ORM, PostgreSQL |

Communication is via a **REST API**. Authentication is handled by **AWS Cognito** (frontend via Amplify, backend via JWT decode + Prisma lookup).

---

## Technology Stack Summary

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.5 (App Router) |
| Language | TypeScript 5 |
| Styling | TailwindCSS 3.4 + custom design tokens |
| UI Components | MUI v5 (DataGrid), Lucide-React icons |
| State Management | Redux Toolkit 2.2 + Redux Persist |
| API Layer | RTK Query (`@reduxjs/toolkit/query/react`) |
| Authentication | AWS Amplify v6 + AWS Cognito |
| Charts | Recharts 2 |
| Gantt Chart | `gantt-task-react` |
| Drag & Drop | `react-dnd` v16 |
| File Upload | Custom `useS3Upload` hook (presigned S3 URLs) |
| Font | Inter (Google Fonts) |

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express 4 |
| Language | TypeScript 5 |
| ORM | Prisma 5.22 |
| Database | PostgreSQL (AWS RDS) |
| Authentication | JWT decode + Prisma user lookup |
| File Storage | AWS S3 (`@aws-sdk/client-s3` + presigned URLs) |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
| Logging | Morgan |
| Security | Helmet |
| Process Manager | PM2 |

### Cloud Infrastructure
| Service | Purpose |
|---------|---------|
| AWS Cognito | User authentication (sign-up / sign-in / JWT tokens) |
| AWS S3 | File storage (profile pictures, task attachments, project documents) |
| AWS EC2 | Backend server hosting |
| AWS RDS | PostgreSQL database hosting |
| AWS Amplify | Frontend hosting (optional) |

---

## High-Level Data Flow

```
Browser (Next.js)
    |
    +-- AWS Cognito ------------ (Authenticator UI -> JWT Access Token)
    |
    +-- RTK Query (API calls) -- Bearer Token --> Express API (EC2 :8000)
    |                                                |
    |                                          Auth Middleware
    |                                          (JWT decode -> Prisma user lookup)
    |                                                |
    |                                         Controllers
    |                                                |
    |                                        Prisma ORM --> PostgreSQL (RDS)
    |                                                |
    |                                        S3 Service --> AWS S3 Bucket
    |                                                |
    |                                        Gemini AI --> Google AI API
    |
    +-- AWS S3 (direct PUT via presigned URL) -- File Upload
```

---

## Key Roles

| Role | Capabilities |
|------|-------------|
| `ADMIN` | Full access - sees all projects, tasks, users, activities |
| `MANAGER` | Defined in schema, not fully enforced at route level |
| `MEMBER` | Default role - sees own projects + assigned tasks only |

---

## Environment Variables (Summary)

### Server (`server/.env`)
| Variable | Purpose |
|----------|---------|
| `PORT` | Express server port (default 3000 / 8000 on EC2) |
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `AWS_REGION` | S3 region (default `us-east-1`) |
| `AWS_S3_BUCKET` | S3 bucket name (default `pm-s3-images`) |
| `AWS_S3_BASE_URL` | Public base URL for S3 assets |
| `AWS_ACCESS_KEY_ID` | (Optional) AWS credentials - falls back to EC2 instance role |
| `AWS_SECRET_ACCESS_KEY` | (Optional) AWS credentials |

### Client (`client/.env.local`)
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | AWS Cognito User Pool ID |
| `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID` | AWS Cognito App Client ID |
