// -----------------------------------------------------------------------------
// Shared application types for TaskMatrix.
// All interfaces, enums, and type aliases previously co-located in
// client/src/state/api.ts have been moved here so api.ts focuses solely
// on RTK Query endpoint definitions.
// -----------------------------------------------------------------------------

export interface AnalysisFilters {
  userId?: number;
  teamId?: number;
  sprintId?: number;
  startDate?: string;
  endDate?: string;
  taskIds?: number[];
}

export interface ProjectOwner {
  userId: number;
  username: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  ownerId?: number;
  owner?: ProjectOwner;
  tasks?: Task[];
}

export enum Priority {
  Urgent = "Urgent",
  High = "High",
  Medium = "Medium",
  Low = "Low",
  Backlog = "Backlog",
}

export enum Status {
  ToDo = "To Do",
  WorkInProgress = "Work In Progress",
  UnderReview = "Under Review",
  Completed = "Completed",
}

export interface User {
  userId?: number;
  username: string;
  email: string;
  profilePictureUrl?: string;
  cognitoId?: string;
  roleName?: string;
  teamName?: string;
  teams?: Team[];
}

export type UploadTypeKey =
  | "profile-pictures"
  | "task-attachments"
  | "project-documents"
  | "general";

export interface FileUpload {
  id: number;
  s3Key: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  uploadType: string;
  referenceId?: number;
  uploadedById: number;
  createdAt: string;
  uploadedBy?: { userId: number; username: string; profilePictureUrl?: string };
}

export interface PresignedUrlResult {
  uploadUrl: string;
  s3Key: string;
  publicUrl: string;
}

export interface Activity {
  id: number;
  userId?: number;
  projectId?: number;
  taskId?: number;
  action: string;
  entity: string;
  details?: string;
  createdAt: string;
  user?: User;
  project?: Project;
  task?: Task;
}

export interface Attachment {
  id: number;
  fileURL: string;
  fileName: string;
  taskId: number;
  uploadedById: number;
}

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  status?: Status;
  priority?: Priority;
  tags?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  points?: number | null;
  projectId: number;
  authorUserId?: number;
  assignedUserId?: number | null;

  author?: User;
  assignee?: User;
  comments?: Comment[];
  attachments?: Attachment[];
  taskAssignments?: { user: User }[];
  project?: Project;
  createdAt?: string;
  updatedAt?: string;
}

export interface AIBreakdownSubtask {
  title: string;
  description: string;
  points: number;
  assignedUserId: number;
  priority?: string;
  tags?: string;
  startDate?: string;
  estimatedHours?: number;
  riskLevel?: string;
  deadline?: string;
}

export interface SearchResults {
  tasks?: Task[];
  projects?: Project[];
  users?: User[];
}

export interface TeamMember {
  userId: number;
  username: string;
  profilePictureUrl?: string;
  roleName?: string;
  role?: string;
}

export interface Team {
  id: number;
  teamName: string;
  teamLeadUserId?: number;
  adminUsername?: string;
  memberCount?: number;
  members?: TeamMember[];
  projects?: Project[];
}

export interface HealthMetricsDTO {
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  highPriorityTasks: number;
  missedDeadlines: number;
  teamWorkload: number;
}

export interface ProjectHealthResponseDTO {
  projectId: number;
  score: number;
  risk: string;
  aiExplanation: string;
  generatedAt: string;
}

export enum DependencyType {
  DEPENDS_ON = "DEPENDS_ON",
  BLOCKED_BY = "BLOCKED_BY",
  RELATED_TO = "RELATED_TO"
}

export enum DependencyStatus {
  READY = "READY",
  BLOCKED = "BLOCKED",
  SATISFIED = "SATISFIED",
  BROKEN = "BROKEN"
}

export interface TaskDependency {
  id: number;
  predecessorId: number;
  successorId: number;
  type: DependencyType;
  isActive: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: number;

  predecessor?: Task;
  successor?: Task;
  status?: DependencyStatus;
}

export type RiskLevel = "Critical" | "High" | "Medium" | "Low";

export interface TaskPrediction {
  taskId: number;
  title: string;
  status: string | null;
  assignedUserId: number | null;
  expectedDelayDays: number;
  isOnCriticalPath: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  affectedDownstreamTaskIds: number[];
  reasons: string[];
}

export interface SprintImpact {
  sprintId: number;
  sprintEndDate: string | null;
  atRiskTaskIds: number[];
  estimatedSprintDelayDays: number;
  likelyToMissDeadline: boolean;
}

export interface RiskReasoningData {
  baseScore: number;
  deductions: { reason: string; points: number }[];
  bonuses: { reason: string; points: number }[];
  finalScore: number;
  riskLevel: RiskLevel;
}

export interface PredictionResult {
  projectId: number;
  riskScore: number;
  riskLevel: RiskLevel;
  affectedTasks: number[];
  estimatedDelay: number;
  criticalTasks: TaskPrediction[];
  allAtRiskTasks: TaskPrediction[];
  sprintImpacts: SprintImpact[];
  reasoningData: RiskReasoningData;
  generatedAt: string;
}

export interface DependencyPredictionResponseDTO {
  prediction: PredictionResult;
  affectedTasks: number[];
  aiExplanation: string;
  recommendations: string[];
}

export interface DependencyGraphNode {
  taskId: number;
  metadata: any;
  incomingEdges: number[];
  outgoingEdges: number[];
  cachedAnalysis: any;
}

export interface DependencyGraphResponseDTO {
  projectId: number;
  nodes: DependencyGraphNode[];
}

export interface AffectedTasksResponseDTO {
  taskId: number;
  affectedTasks: number[];
}

// ─── Activity Collection Engine types ─────────────────────────────────────────

export type ActivityEventType =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "COMMENT_ADDED"
  | "TASK_COMPLETED"
  | "TASK_REOPENED"
  | "DEPENDENCY_CREATED"
  | "DEPENDENCY_REMOVED";

export type ActivityChangeDetail =
  | { kind: "STATUS_CHANGED"; from: string | null; to: string }
  | { kind: "PRIORITY_CHANGED"; from: string | null; to: string }
  | { kind: "ASSIGNEE_CHANGED"; from: string | null; to: string | null }
  | { kind: "COMMENT_ADDED"; commentText: string }
  | { kind: "DEPENDENCY_CREATED"; predecessorId: number; successorId: number; dependencyType: string }
  | { kind: "DEPENDENCY_REMOVED"; predecessorId: number; successorId: number }
  | { kind: "GENERIC" };

export interface ActivityTimelineEvent {
  id: number;
  timestamp: string;
  eventType: ActivityEventType;
  actor: {
    userId: number;
    username: string;
    profilePictureUrl?: string | null;
  } | null;
  task: {
    taskId: number;
    title: string;
    status: string | null;
    priority: string | null;
    assignedUserId: number | null;
  } | null;
  summary: string;
  changeDetail: ActivityChangeDetail | null;
}

export interface ActivityTimelineSummary {
  tasksCreated: number;
  tasksCompleted: number;
  statusChanges: number;
  priorityChanges: number;
  assigneeChanges: number;
  commentsAdded: number;
  tasksReopened: number;
  dependenciesCreated: number;
  dependenciesRemoved: number;
  otherUpdates: number;
}

export interface ActivityTimelineResponseDTO {
  projectId: number;
  date: string;
  periodStart: string;
  periodEnd: string;
  totalEvents: number;
  events: ActivityTimelineEvent[];
  summary: ActivityTimelineSummary;
}

// ─── Daily Timeline Builder types ───────────────────────────────────────────

export interface DailyTimelineFormattedEvent {
  id: number;
  actor: string;
  action: string;
  taskTitle: string | null;
  previousValue: string | null;
  newValue: string | null;
  timestamp: string;
}

export interface DailyTimelineGroup {
  period: "Morning" | "Afternoon" | "Evening";
  events: DailyTimelineFormattedEvent[];
}

export interface DailyTimelineResponseDTO {
  projectId: number;
  date: string;
  timeline: DailyTimelineGroup[];
}

// ─── Standup Analysis Engine types ──────────────────────────────────────────

export interface StandupTaskInfo {
  id: number;
  title: string;
  assignedTo: string | null;
  status: string | null;
  dueDate: string | null;
}

export interface StandupAnalysisResult {
  projectId: number;
  date: string;
  yesterday: {
    completedTasks: StandupTaskInfo[];
    startedTasks: StandupTaskInfo[];
    reviewedTasks: StandupTaskInfo[];
  };
  today: {
    tasksInProgress: StandupTaskInfo[];
    upcomingWork: StandupTaskInfo[];
  };
  blockers: {
    blockedTasks: StandupTaskInfo[];
    waitingReview: StandupTaskInfo[];
    missingDependencies: StandupTaskInfo[];
    overdueTasks: StandupTaskInfo[];
  };
  teamHighlights: {
    mostActiveMembers: { username: string; actionCount: number }[];
    largestProgress: { username: string; completedCount: number }[];
  };
}

// ─── Team Workload Engine types ─────────────────────────────────────────────

export interface MemberWorkload {
  userId: number;
  username: string;
  completedTasks: number;
  activeTasks: number;
  blockedTasks: number;
  totalPoints: number;
  isOverloaded: boolean;
  isIdle: boolean;
}

export interface TeamWorkloadResult {
  projectId: number;
  teamSummary: {
    totalMembers: number;
    totalActiveTasks: number;
    totalCompletedTasks: number;
    totalBlockedTasks: number;
  };
  memberSummary: MemberWorkload[];
  workloadStatistics: {
    overloadedMembers: MemberWorkload[];
    idleMembers: MemberWorkload[];
    workloadDistribution: { username: string; activePoints: number }[];
  };
}

// ─── AI Standup Generator types ─────────────────────────────────────────────

export interface AIStandupResponse {
  id?: number;
  projectId?: number;
  date?: string;
  generatedAt?: string;
  isRegenerated?: boolean;
  summary?: {
    yesterday: string;
    today: string;
    blockers: string;
    teamSummary: string;
  };
  generatedStandup?: string;
  aiRecommendations: string[];
  yesterday?: string; // from raw generation
  today?: string;
  blockers?: string;
  teamSummary?: string;
}

// ─── Standup History types ────────────────────────────────────────────────────

/** Lightweight card record returned by GET /standup/history */
export interface StandupHistoryItem {
  id: number;
  date: string;
  generatedAt: string;
  isRegenerated: boolean;
  generationVersion: string;
  summary: {
    yesterday: string;
    today: string;
    blockers: string;
    teamSummary: string;
  };
  aiRecommendations: string[];
  /** Full analysisContext JSON — used for health score extraction on card */
  analysisContext?: any;
  author?: { username: string };
}

export interface StandupHistoryResponse {
  data: StandupHistoryItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Standup Comparison types ─────────────────────────────────────────────────

export interface TextChangeDiff {
  section: string;
  before: string;
  after: string;
  wordDelta: number;
  changed: boolean;
}

export interface WorkloadDiff {
  totalMembersDelta: number;
  totalActiveTasksDelta: number;
  totalCompletedTasksDelta: number;
  totalBlockedTasksDelta: number;
  overloadedMembersDelta: number;
  idleMembersDelta: number;
}

export interface RecommendationDiff {
  added: string[];
  removed: string[];
  retained: string[];
}

export interface ChangeStatistics {
  totalSectionsChanged: number;
  workloadImproved: boolean;
  blockersIncreased: boolean;
  recommendationsRotated: boolean;
  riskTrend: "improved" | "degraded" | "stable";
}

export interface StandupComparisonResult {
  dateA: string;
  dateB: string;
  reportIdA: number;
  reportIdB: number;
  narrativeDiffs: TextChangeDiff[];
  workloadDiff: WorkloadDiff | null;
  recommendationDiff: RecommendationDiff;
  statistics: ChangeStatistics;
  healthScoreDelta: number | null;
}

export interface StandupCompareResponse {
  reportA: { id: number; date: string; author?: { username: string } };
  reportB: { id: number; date: string; author?: { username: string } };
  comparison: StandupComparisonResult;
}

