# Prisma Delete Policy Review

This document reviews the business implications of adding native database cascade deletions (`onDelete`) to the Prisma schema. It analyzes whether entities should be automatically deleted, restricted, nullified, or have their ownership transferred when a parent entity is deleted.

## Overview of Relations and Policies

| Parent Entity | Relation (Child) | Current Behavior | Proposed Behavior | Business Impact | Risk Level | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Project** | `Task` | Manual cascade via `$transaction` in controller. | `Cascade` | Deleting a project permanently deletes all its tasks. This matches existing business logic perfectly. | Low | **Accept (Cascade)** |
| **Project** | `ProjectTeam` | Manual cascade via `$transaction`. | `Cascade` | Deleting a project cleans up team-sharing link records without affecting the teams themselves. | Low | **Accept (Cascade)** |
| **Project** | `Activity` | Manual cascade via `$transaction`. | `Cascade` | Deleting a project removes its history from the activity stream. | Low | **Accept (Cascade)** |
| **Team** | `UserTeam` | Relies on Prisma default (Restrict). | `Cascade` | Deleting a team automatically removes all membership records for that team. | Low | **Accept (Cascade)** |
| **Team** | `ProjectTeam` | Relies on Prisma default. | `Cascade` | Deleting a team revokes its shared access to projects by wiping the link records. | Low | **Accept (Cascade)** |
| **Team** | `Project` (`teamId`) | Relies on Prisma default. | `SetNull` | Deleting a team shouldn't delete its associated projects. Projects should simply lose their primary team association. (`teamId` is already optional). | Medium | **Accept (SetNull)** |
| **Task** | `TaskAssignment` | Manual cascade via `$transaction`. | `Cascade` | Deleting a task naturally invalidates any assignments to it. | Low | **Accept (Cascade)** |
| **Task** | `Comment` | Manual cascade via `$transaction`. | `Cascade` | Deleting a task removes all comments associated with it. | Low | **Accept (Cascade)** |
| **Task** | `Attachment` | Manual cascade via `$transaction`. | `Cascade` | Deleting a task removes file references linked to it. | Low | **Accept (Cascade)** |
| **Task** | `Activity` | Manual cascade via `$transaction`. | `Cascade` | Deleting a task removes its history from the activity stream. | Low | **Accept (Cascade)** |
| **User** | `UserTeam` | Relies on Prisma default. | `Cascade` | Deleting a user automatically removes them from all teams. | Low | **Accept (Cascade)** |
| **User** | `TaskAssignment`| Relies on Prisma default. | `Cascade` | Deleting a user automatically unassigns them from tasks (via the explicit assignment table). | Low | **Accept (Cascade)** |
| **User** | `Task` (`assignee`) | Relies on Prisma default. | `SetNull` | Deleting a user simply leaves their primary assigned tasks unassigned. (`assignedUserId` is already optional). | Low | **Accept (SetNull)** |
| **User** | `Project` (`owner`) | Relies on Prisma default. | **Restrict** | If a user leaves the company, their projects should *not* be deleted. Project ownership must be manually transferred to another user before the account can be deleted. | High | **Reject Cascade. Use `Restrict`.** |
| **User** | `Task` (`author`) | Relies on Prisma default. | **Restrict** | Tasks represent real work. If the author is deleted, cascading would wipe out valid tasks. Must transfer authorship before user deletion. | High | **Reject Cascade. Use `Restrict`.** |
| **User** | `Comment` | Relies on Prisma default. | **Restrict** | If a user is deleted and comments cascade, vital project discussion history is lost. Better to anonymize or restrict deletion. | High | **Reject Cascade. Use `Restrict`.** |
| **User** | `Attachment` | Relies on Prisma default. | **Restrict** | Cascading would delete the task's attachment metadata just because the uploader left. | High | **Reject Cascade. Use `Restrict`.** |

## Summary and Recommendations

### 1. Project and Task Hierarchies (Safe to Cascade)
The hierarchies flowing downward from **Project -> Task -> Comments/Attachments/Activities** are inherently strictly bound. The current implementation in `projectController.ts` already enforces this manually. Implementing `onDelete: Cascade` for these relations is completely safe and highly recommended to clean up the backend.

### 2. User Deletion (Extremely High Risk)
Deleting a `User` entity has massive architectural implications. Because Users own Projects, author Tasks, and leave Comments, using a blanket `Cascade` policy would result in catastrophic data loss (e.g., an employee leaves the company, their account is deleted, and suddenly entire client projects disappear).

**Recommendation for User Relations:**
- Do **not** use `Cascade` for any content-creation relations (`owner` on Project, `author` on Task, `uploadedBy` on Attachment, `userId` on Comment).
- Prisma's default behavior is `Restrict`. We should keep it that way. If the system ever needs a "Delete User" feature, the business logic must explicitly handle transferring ownership of Projects/Tasks and anonymizing comments.

### 3. Team Deletions (Moderate Risk)
Teams are organizational units. If a team is deleted, the `Project` entity has an optional `teamId` that can safely be `SetNull`. The join tables (`UserTeam` and `ProjectTeam`) can safely `Cascade`.

## Next Steps
Before making schema changes, the product owner must confirm that `Restrict` is the desired behavior for User deletions (requiring manual ownership transfer), and that `SetNull` is the desired behavior when a Team associated with a Project is deleted.
