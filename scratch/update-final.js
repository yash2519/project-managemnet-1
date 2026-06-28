const fs = require('fs');

const finalDocPath = 'e:/Gravity/project-management_14/docs/FINAL_PROJECT_DOCUMENTATION.md';
let finalDoc = fs.readFileSync(finalDocPath, 'utf8');

// Section additions to Final_Project_Documentation.md
const featureList = `
# 03 — Complete Feature List

**Core Features:**
- Project creation, updating, and deletion
- Task management (Board, List, Table, Timeline views)
- Task assignment and prioritization
- Global Search across all entities
- User Teams and Role-based Access Control
- Activity Feed and Audit Logging
- AWS S3 Integration for direct file uploads (Profile pics, Task attachments)
- Dashboard KPIs and Chart visualizations

**AI Features:**
- **AI Task Breakdown**: Intelligent subtask generation based on team workload
- **AI Dependency Prediction**: Predicts missing dependencies between tasks
- **AI Project Health**: Holistic health score evaluating progress, blockers, and overdue tasks
- **AI Standup Generation**: Automated daily standup synthesis and historical analysis
`;

const aiFeatures = `
# 04 — AI Features

### Currently Implemented
1. **AI Task Breakdown**: Invokes Google Gemini to decompose a complex task into manageable subtasks assigned appropriately based on team workloads.
2. **AI Dependency Prediction**: Scans all tasks in a project and identifies potential logical dependencies (e.g., Task B needs Task A) that users missed.
3. **AI Project Health**: Analyzes velocity, overdue tasks, and workload distribution to calculate a dynamic project health score and summary.
4. **AI Standup**: Automatically generates daily standup reports per project by analyzing yesterday's closed tasks, today's open tasks, and any logged activity or blockers. Includes historical comparison and export capabilities.

### Future Scope
- AI-driven capacity planning and automatic resource reallocation.
- Real-time automated risk mitigation suggestions.
- Chat-based AI project assistant for ad-hoc querying.
`;

const componentMap = `
# 10 — Complete Component Map

- **Layouts**: \`DashboardWrapper\`, \`Sidebar\`, \`Navbar\`
- **Views**: \`BoardView\`, \`ListView\`, \`TableView\`, \`TimelineView\` (Gantt)
- **Cards**: \`TaskCard\`, \`ProjectCard\`, \`UserCard\`
- **Modals**: \`ModalNewTask\`, \`ModalEditTask\`, \`ModalAssignTask\`, \`ModalNewProject\`, \`TaskDetailsModal\`
- **Utilities**: \`FileUploader\`, \`EmptyState\`
`;

const apiMap = `
# 11 — API Map

**Projects**
- \`GET /projects\`: Get projects
- \`POST /projects\`: Create project
- \`GET /projects/:projectId\`: Get project details
- \`PATCH /projects/:projectId\`: Update project
- \`DELETE /projects/:projectId\`: Delete project

**Tasks**
- \`GET /tasks?projectId=\`: Get tasks
- \`POST /tasks\`: Create task
- \`PATCH /tasks/:taskId\`: Update task
- \`PATCH /tasks/:taskId/status\`: Update status

**AI & Analytics (New)**
- \`POST /ai/breakdown\`: AI Task Breakdown
- \`GET /projects/:projectId/health\`: AI Project Health
- \`GET /projects/:projectId/dependencies\`: Predict Dependencies
- \`GET /projects/:projectId/activity-timeline\`: Project Activity Timeline
- \`GET /projects/:projectId/daily-timeline\`: Project Daily Timeline
- \`GET /projects/:projectId/standup-analysis\`: AI Standup Analysis
- \`GET /projects/:projectId/team-workload\`: Team Workload Metrics
- \`POST /projects/:projectId/standup\`: Generate Standup
- \`GET /projects/:projectId/standup/today\`: Get Today's Standup

**Other**
- \`GET /search\`: Global search
- \`GET /users\`: Get users
- \`GET /teams\`: Get teams
- \`POST /uploads/presign\`: S3 Upload presign
`;

const dbSchema = `
# 12 — Database Schema Summary

- **User**: \`userId\`, \`cognitoId\`, \`role\`, \`profilePictureUrl\`
- **Team**: \`id\`, \`teamName\`
- **Project**: \`id\`, \`name\`, \`description\`, \`startDate\`, \`endDate\`, \`ownerId\`
- **Task**: \`id\`, \`title\`, \`status\`, \`priority\`, \`points\`, \`projectId\`, \`authorUserId\`, \`assignedUserId\`
- **Activity**: Audit trail table
- **FileUpload**: S3 File attachments references
- **Join Tables**: \`UserTeam\`, \`ProjectTeam\`
`;

const futureScope = `
# 30 — Future Development

- Transition AI models from Google Gemini 2.5 Flash to specialized smaller on-prem LLMs for data privacy.
- Implement real-time WebSocket updates for collaborative board edits.
- Support multi-tenant isolated organizational workspaces.
`;

// Now we insert these missing sections before # 13
const insertionPoint = '# 13 — Deployment Notes';
if (finalDoc.includes(insertionPoint)) {
    finalDoc = finalDoc.replace(insertionPoint, featureList + '\n' + aiFeatures + '\n' + componentMap + '\n' + apiMap + '\n' + dbSchema + '\n' + futureScope + '\n\n' + insertionPoint);
}

// Modify Architecture flow section
finalDoc = finalDoc.replace('8 Route groups', '14 Route groups (projects, tasks, search, users, teams, activities, uploads, ai, health, dependencies, standup, standup-analysis, timelines, workload)');
finalDoc = finalDoc.replace('8 route groups', '14 route groups');

fs.writeFileSync(finalDocPath, finalDoc);
console.log('Final_Project_Documentation.md updated.');
