# 05 — Database Architecture

The application uses **PostgreSQL** accessed via the **Prisma ORM**. The schema is defined in `server/prisma/schema.prisma`.

## Core Entities and Relationships

### 1. User
- Represents an authenticated user (linked to AWS Cognito via `cognitoId`).
- Belongs to teams via the `UserTeam` join table (`teams` relation).
- Can own projects (`ownedProjects`).
- Can author or be assigned to tasks.
- Tracks `roleName` (custom job title) and a system `Role` enum (ADMIN, MANAGER, MEMBER).

### 2. Team
- Represents a group of users.
- Connects to `User` via the `UserTeam` join table.
- Connects to `Project` via the `ProjectTeam` join table (a project can be shared with multiple teams).

### 3. Project
- The high-level container for work.
- Has an `ownerId` (User).
- Contains multiple `Task` records.
- Logs actions to the `Activity` table.

### 4. Task
- Represents a unit of work within a Project.
- Has status, priority, dates, points, tags.
- Has an `authorUserId` and an `assignedUserId`.
- Can have `Comment`s and `Attachment`s.
- Logs actions to the `Activity` table.

### 5. FileUpload
- Centralized tracking for files stored in S3.
- Tracks `s3Key`, `publicUrl`, `mimeType`, and `uploadType` (enum: PROFILE_PICTURE, TASK_ATTACHMENT, PROJECT_DOCUMENT, GENERAL).
- Links back to the uploading User.

### 6. Activity
- An audit log or activity stream.
- Records actions (e.g., "CREATED", "UPDATED") on entities ("Project", "Task").
- Links optionally to `User`, `Project`, and `Task` for filtering.

## Enums

- **Role**: `ADMIN`, `MANAGER`, `MEMBER`
- **UploadType**: `PROFILE_PICTURE`, `TASK_ATTACHMENT`, `PROJECT_DOCUMENT`, `GENERAL`

## Cascade Behaviors

The Prisma schema natively leverages database-level constraints for referential integrity:
- **Cascade Deletions**: Deleting a `Project` natively cascades to its `Task`s, `Activity` logs, and `ProjectTeam` relationships. Deleting a `Task` cascades to its `Comment`s, `Attachment`s, and `TaskAssignment`s. Deleting a `Team` or `User` cascades their membership in join tables (`UserTeam`, `ProjectTeam`, `TaskAssignment`).
- **Restricted Deletions**: By default, critical user-generated relations (e.g., `ownerId` on `Project`, `authorUserId` on `Task`) restrict `User` deletion. User deletion requires manual ownership transfer in business logic.
- **Nullified Deletions**: Deleting a `Team` removes it from associated projects by setting `teamId` to `null`. Deleting an assigned `User` sets `assignedUserId` on the task to `null`.

## Seeding

A seed script (`server/prisma/seed.ts`) reads JSON files from the `seedData/` directory and populates the database with initial teams, users, projects, and tasks for development and testing.
