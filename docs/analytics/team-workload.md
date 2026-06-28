# Team Workload Analysis Engine

## Overview

The Team Workload Analysis Engine provides a deterministic, aggregated view of resource allocation and output across a project. It identifies potential bottlenecks, overloaded members, and under-utilized (idle) team members by correlating task statuses with the assigned user.

## Engine Strategy

File: `server/src/engine/TeamWorkloadEngine.ts`

The engine operates by:
1. **Fetching Team Membership**: It collects a unique set of all members associated with the project via direct `Task` assignments and nested `Team` / `ProjectTeam` relationships.
2. **Aggregating Task States**: It fetches all tasks for the given project, tracking `active`, `completed`, and `blocked` counts.
3. **Calculating Workload per Member**: 
   - `activeTasks`
   - `completedTasks`
   - `blockedTasks`
   - `totalPoints`
4. **Identifying Edge Cases**:
   - **Overloaded Member**: A member with strictly more than 5 active tasks, **OR** strictly more than 21 active points.
   - **Idle Member**: A member with 0 active tasks.

## API Integration

**Endpoint**: `GET /projects/:projectId/team-workload`
**Controller**: `teamWorkloadController.ts`

### Request & Authorization
- **Requires**: The requesting user must be the Project Owner, an `ADMIN`, or currently assigned to at least one task in the target project.

### Response Structure (`TeamWorkloadResult` DTO)

The JSON response comprises three main sections:
1. **`teamSummary`**: High-level totals (total members, active tasks, completed tasks, blocked tasks).
2. **`memberSummary`**: Detailed breakdown of every member's metrics.
3. **`workloadStatistics`**:
   - `overloadedMembers`: Filtered subset of members crossing the workload threshold.
   - `idleMembers`: Filtered subset of members with zero assigned active work.
   - `workloadDistribution`: A sorted array (descending) of points allocated per member.

## Note on Architecture
This feature is built dynamically inside an in-memory execution loop over the Prisma data layer. It is fully deterministic and does **not** rely on AI generation. It provides clean analytical slices to the frontend dashboard.
