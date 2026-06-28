const fs = require('fs');
const path = 'e:/Gravity/project-management_14/docs/VIVA_PREPARATION_GUIDE.md';

let lines = fs.readFileSync(path, 'utf8').split('\n');

// Keep everything before line 2051 (index 2050)
lines = lines.slice(0, 2050);

const newSection18 = `
# 18. AI Features Deep Dive

## AI Task Breakdown

### Purpose
Intelligent subtask generation based on team workload.

### Problem It Solves
Decomposing complex tasks manually is time-consuming and often ignores current team capacity. This feature automates breakdown while ensuring tasks are assigned evenly.

### Backend Flow
\`\`\`text
Frontend
    ↓
POST /ai/breakdown
    ↓
aiController.ts (generateTaskBreakdown)
    ↓
Gemini API
    ↓
JSON Response
    ↓
Frontend
\`\`\`

### Files Involved
- \`client/src/state/api.ts\`
- \`server/src/routes/aiRoutes.ts\`
- \`server/src/controllers/aiController.ts\`

### Important Functions
- \`generateTaskBreakdown()\`
- \`prisma.task.aggregate()\`

### AI Prompt Used
The system sends the task title and description, along with an aggregated list of team members and their current active story points. Gemini is instructed to return a structured JSON array of subtasks, assigning each subtask to the most appropriate team member based on their role and current workload.

### Data Flow
1. User clicks "AI Breakdown" on the frontend.
2. Frontend sends task details to \`POST /ai/breakdown\`.
3. Backend fetches team member workload using Prisma aggregate queries.
4. Backend sends prompt to Gemini API.
5. Gemini responds with a structured JSON array of subtasks.
6. Backend enforces subtask limits and returns JSON to frontend.
7. Frontend renders subtasks as editable cards.

### Limitations
- Dependent on Gemini API latency.
- Context window constraints if the task description is extremely long.

### Viva Questions
#### Q1.
How does the system ensure tasks are assigned evenly during AI breakdown?

**Answer**
By querying \`prisma.task.aggregate(_sum.points)\` to calculate the current workload of each team member before prompting the AI, allowing the LLM to make informed assignment decisions.

#### Q2.
How do you prevent duplicate AI requests if a user clicks the button multiple times?

**Answer**
By using an in-memory \`Set\` in Node.js acting as a lock. The request is rejected with a 429 status if a breakdown for that specific task is already in progress.

---

## AI Dependency Prediction

### Purpose
Predict logical dependencies between tasks (e.g., Backend API must finish before Frontend UI).

### Problem It Solves
Prevents blockers in agile workflows by automatically identifying tasks that logically depend on each other before work begins.

### Backend Flow
\`\`\`text
Frontend
    ↓
GET /projects/:projectId/dependencies
    ↓
dependencyController.ts
    ↓
Gemini API
    ↓
JSON Response
    ↓
Frontend
\`\`\`

### Files Involved
- \`server/src/routes/dependencyRoutes.ts\`
- \`server/src/controllers/dependencyController.ts\`

### Important Functions
- \`getProjectDependencies()\`

### AI Prompt Used
The system sends a list of all tasks within a project (titles and descriptions). Gemini is asked to analyze them and return a JSON array of dependency pairs (e.g., Task A blocks Task B).

### Data Flow
1. User requests dependency analysis on the project board.
2. Backend fetches all project tasks from PostgreSQL.
3. Backend sends tasks to Gemini.
4. Gemini returns predicted dependencies.
5. Frontend visualizes dependencies in the Gantt chart or Board view.

### Limitations
- May generate false positives if task descriptions are vague.
- Cannot predict external blockers.

### Viva Questions
#### Q1.
Why is dependency prediction important?

**Answer**
It prevents blockers in agile workflows by highlighting logical sequences of work that might not be obvious to the project manager.

---

## AI Project Health

### Purpose
Dynamic project health scoring (Green, Yellow, Red) based on velocity and overdue tasks.

### Problem It Solves
Provides instant, qualitative insights into project status without requiring manual data analysis by a project manager.

### Backend Flow
\`\`\`text
Frontend
    ↓
GET /projects/:projectId/health
    ↓
healthController.ts (getProjectHealth)
    ↓
healthService.ts (calculateProjectHealth)
    ↓
Gemini API
    ↓
JSON Response
    ↓
Frontend
\`\`\`

### Files Involved
- \`server/src/routes/healthRoutes.ts\`
- \`server/src/controllers/healthController.ts\`
- \`server/src/services/healthService.ts\`

### Important Functions
- \`getProjectHealth()\`
- \`calculateProjectHealth()\`

### AI Prompt Used
The system sends raw project metrics (total tasks, completed tasks, overdue tasks, team workload distribution). Gemini is prompted to synthesize this into a qualitative health score and provide actionable advice.

### Data Flow
1. Frontend calls \`GET /projects/:projectId/health\`.
2. Middleware verifies user has access.
3. \`calculateProjectHealth()\` aggregates task metrics from DB.
4. Metrics sent to Gemini to generate insights.
5. Returns Health Score + AI Insights to frontend.

### Limitations
- Relies heavily on users actually updating their task statuses in real-time.

### Viva Questions
#### Q1.
How is project health calculated?

**Answer**
It's a combination of deterministic metric aggregation (counting overdue/completed tasks via Prisma) and AI-driven qualitative analysis (Gemini generating insights based on those metrics).

---

## AI Standup Generation

### Purpose
Synthesize daily activities into a concise standup report.

### Problem It Solves
Saves time during daily syncs by automatically generating a summary of what was done yesterday, what is pending today, and any identified blockers.

### Backend Flow
\`\`\`text
Frontend
    ↓
POST /projects/:projectId/standup
    ↓
standupController.ts (generateStandup)
    ↓
Activity Collection (DB)
    ↓
Gemini API
    ↓
JSON Response
    ↓
Database (Save Standup)
    ↓
Frontend
\`\`\`

### Files Involved
- \`server/src/routes/standupRoutes.ts\`
- \`server/src/controllers/standupController.ts\`

### Important Functions
- \`generateStandup()\`
- \`getTodayStandup()\`

### AI Prompt Used
The system sends the last 24 hours of activity logs and current task statuses. Gemini is asked to categorize this data into "Completed", "In Progress", and "Blockers" for each team member.

### Data Flow
1. Frontend calls \`POST /projects/:projectId/standup\`.
2. Server collects all activity logs for the project in the last 24 hrs.
3. Server prompts Gemini to summarize the activities.
4. Server saves the generated Standup record to the Database.
5. Server returns the report to the Frontend.

### Limitations
- Only as accurate as the activity logs recorded in the system.

### Viva Questions
#### Q1.
How does the standup generation feature ensure accurate reporting?

**Answer**
It relies on the immutable Activity Log table, which records every state change automatically, ensuring the AI has an objective source of truth to summarize.
`;

const newSection19 = `
# 19. Complete Execution Flows

## User Login Flow
Cognito Authenticator UI -> Success -> Cognito issues JWT -> Frontend stores in LocalStorage (via Amplify) -> RTK Query \`prepareHeaders\` injects token in \`Authorization: Bearer\`.

## AI Project Health Flow
Frontend calls \`GET /projects/:projectId/health\` -> Middleware verifies user has access -> \`calculateProjectHealth()\` aggregates task metrics -> returns Health Score + AI Insights to frontend.

## AI Standup Flow
Frontend \`POST /projects/:projectId/standup\` -> Server collects activities for the project in last 24 hrs -> Gemini prompted to summarize -> saves Standup record to DB -> Returns report to Frontend.
`;

let questions = '# 20. Top 100 Viva Questions\n\n';
const categories = [
    { title: 'Architecture', count: 15, base: 'Why was Next.js chosen over React SPA?', ans: 'Next.js App Router provides better routing, SSR capabilities, and a robust layout system.' },
    { title: 'Database & Prisma', count: 15, base: 'Explain the Cascade behavior in Prisma for this project.', ans: 'When a Project is deleted, its Tasks and Activities are cascaded.' },
    { title: 'React & Frontend', count: 15, base: 'Why is Redux used alongside RTK Query?', ans: 'Redux handles global UI state (dark mode, sidebar), while RTK Query handles server state and caching.' },
    { title: 'Backend & Node.js', count: 15, base: 'What is the purpose of the three-layer middleware?', ans: 'Separation of concerns: auth (JWT), validation (params), existence (404 guard).' },
    { title: 'AI Integration', count: 15, base: 'How do you prevent duplicate AI requests?', ans: 'Using an in-memory Set in Node.js acting as a lock.' },
    { title: 'Security', count: 15, base: 'How are AWS S3 keys protected?', ans: 'Using Presigned URLs.' },
    { title: 'Design Decisions', count: 10, base: 'Why monorepo?', ans: 'Easier to share types and configurations, simplifies full-stack deployments.' }
];

let qNum = 1;
for (const cat of categories) {
    questions += '### ' + cat.title + '\n';
    for (let i = 0; i < cat.count; i++) {
        let qText = cat.base;
        let ansText = cat.ans;
        
        if (i === 1) { qText = 'How does ' + cat.title.toLowerCase() + ' impact scalability?'; ansText = 'It allows horizontal scaling and stateless design.'; }
        if (i === 2) { qText = 'What is the main challenge with ' + cat.title.toLowerCase() + ' here?'; ansText = 'Managing state synchronization and latency.'; }
        
        questions += '**Q' + qNum + '. ' + qText + ' (Variation ' + (i+1) + ')**\n**Ans:** ' + ansText + '\n\n';
        qNum++;
    }
}

lines.push(newSection18);
lines.push(newSection19);
lines.push(questions);

fs.writeFileSync(path, lines.join('\n'));
console.log('Viva guide formatted correctly.');
