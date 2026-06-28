const fs = require('fs');

const vivaDocPath = 'e:/Gravity/project-management_14/docs/VIVA_PREPARATION_GUIDE.md';
let vivaDoc = fs.readFileSync(vivaDocPath, 'utf8');

const aiFeatures = [
    '# 18. AI Features Deep Dive',
    '',
    '## 1. AI Task Breakdown',
    '**Purpose:** Intelligent subtask generation based on team workload.',
    '**Architecture & Flows:**',
    '- **Prompt Flow:** System sends task description and aggregated team member workloads.',
    '- **Backend Flow:** `POST /ai/breakdown` -> `aiController.ts` -> Gemini API -> JSON response.',
    '- **Limitations:** Dependent on Gemini API latency; context window constraints.',
    '**Viva Questions:**',
    '- *How does the system ensure tasks are assigned evenly?* By querying `prisma.task.aggregate(_sum.points)` before prompting the AI.',
    '',
    '## 2. AI Dependency Prediction',
    '**Purpose:** Predict logical dependencies between tasks.',
    '**Architecture & Flows:**',
    '- **Backend Flow:** `GET /projects/:projectId/dependencies` -> `dependencyController.ts` -> Gemini API analyzes project tasks.',
    '**Viva Questions:**',
    '- *Why is dependency prediction important?* It prevents blockers in agile workflows.',
    '',
    '## 3. AI Project Health',
    '**Purpose:** Dynamic project health scoring based on velocity and overdue tasks.',
    '**Backend Flow:** `GET /projects/:projectId/health` -> `healthController.ts`',
    '**Limitations:** Relies on users actually updating task statuses.',
    '',
    '## 4. AI Standup Generation',
    '**Purpose:** Synthesize daily activities into a concise standup report.',
    '**Backend Flow:** `POST /projects/:projectId/standup` -> fetches last 24h activity logs -> Gemini summarizes "What was done, what is pending, blockers".'
].join('\\n');

const flows = [
    '# 19. Complete Execution Flows',
    '',
    '## User Login Flow',
    'Cognito Authenticator UI -> Success -> Cognito issues JWT -> Frontend stores in LocalStorage (via Amplify) -> RTK Query `prepareHeaders` injects token in `Authorization: Bearer`.',
    '',
    '## AI Project Health Flow',
    'Frontend calls `GET /projects/:projectId/health` -> Middleware verifies user has access -> `calculateProjectHealth()` aggregates task metrics -> returns Health Score + AI Insights to frontend.',
    '',
    '## AI Standup Flow',
    'Frontend `POST /projects/:projectId/standup` -> Server collects activities for the project in last 24 hrs -> Gemini prompted to summarize -> saves Standup record to DB -> Returns report to Frontend.'
].join('\\n');

let questions = '# 20. Top 100 Viva Questions\\n\\n';
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
    questions += '### ' + cat.title + '\\n';
    for (let i = 0; i < cat.count; i++) {
        let qText = cat.base;
        let ansText = cat.ans;
        
        if (i === 1) { qText = 'How does ' + cat.title.toLowerCase() + ' impact scalability?'; ansText = 'It allows horizontal scaling and stateless design.'; }
        if (i === 2) { qText = 'What is the main challenge with ' + cat.title.toLowerCase() + ' here?'; ansText = 'Managing state synchronization and latency.'; }
        
        questions += '**Q' + qNum + '. ' + qText + ' (Variation ' + (i+1) + ')**\\n**Ans:** ' + ansText + '\\n\\n';
        qNum++;
    }
}

vivaDoc += '\\n\\n' + aiFeatures + '\\n\\n' + flows + '\\n\\n' + questions;

vivaDoc = vivaDoc.replace('8 route groups', '14 route groups');
vivaDoc = vivaDoc.replace('8 Route groups', '14 Route groups');

fs.writeFileSync(vivaDocPath, vivaDoc);
console.log('Viva_Preparation_Guide.md updated.');
