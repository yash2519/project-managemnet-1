import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";

import type {
  ProjectOwner,
  Project,
  User,
  FileUpload,
  PresignedUrlResult,
  Activity,
  Attachment,
  Task,
  AIBreakdownSubtask,
  SearchResults,
  TeamMember,
  Team,
  UploadTypeKey,
  ProjectHealthResponseDTO,
  TaskDependency,
  DependencyPredictionResponseDTO,
  DependencyGraphResponseDTO,
  AffectedTasksResponseDTO,
  ActivityTimelineResponseDTO,
  DailyTimelineResponseDTO,
  StandupAnalysisResult,
  TeamWorkloadResult,
  AIStandupResponse,
  AnalysisFilters,
  StandupHistoryItem,
  StandupHistoryResponse,
  StandupCompareResponse,
} from "@/types";
import { Priority, Status } from "@/types";

// Re-export all shared types so existing imports from "@/state/api" continue to work.
export type {
  ProjectOwner,
  Project,
  User,
  FileUpload,
  PresignedUrlResult,
  Activity,
  Attachment,
  Task,
  AIBreakdownSubtask,
  SearchResults,
  TeamMember,
  Team,
  UploadTypeKey,
  ProjectHealthResponseDTO,
  TaskDependency,
  DependencyPredictionResponseDTO,
  DependencyGraphResponseDTO,
  AffectedTasksResponseDTO,
  ActivityTimelineResponseDTO,
  DailyTimelineResponseDTO,
  StandupAnalysisResult,
  TeamWorkloadResult,
  AIStandupResponse,
  StandupHistoryItem,
  StandupHistoryResponse,
  StandupCompareResponse,
} from "@/types";
export { Priority, Status, DependencyType, DependencyStatus } from "@/types";

/**
 * Helper to generate cache tags for a list of items.
 * If the list exists, maps each item to an { type, id } tag.
 * If the list is undefined (e.g. empty/error), falls back to { type } or { type, id: fallbackId }.
 */
function providesList<R extends { id: string | number }[], T extends string>(
  resultsWithIds: R | undefined,
  tagType: T,
  fallbackId?: string | number
) {
  if (resultsWithIds && resultsWithIds.length > 0) {
    return resultsWithIds.map(({ id }) => ({ type: tagType, id } as const));
  }
  return fallbackId !== undefined
    ? [{ type: tagType, id: fallbackId } as const]
    : [{ type: tagType } as const];
}

const TEAM_MUTATION_TAGS = ["Teams", "Users", "AuthUser"] as const;
const TASK_MUTATION_TAGS = ["Tasks"] as const;

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const session = await fetchAuthSession();
      const { accessToken } = session.tokens ?? {};
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
      return headers;
    },
  }),
  reducerPath: "api",
  tagTypes: ["Projects", "Tasks", "Users", "Teams", "AuthUser", "Activities", "FileUploads"],

  endpoints: (build) => ({
    getAuthUser: build.query<any, any>({
      queryFn: async (_, _queryApi, _extraOptions, baseQuery) => {
        try {
          const userMeResult = await baseQuery("users/me");
          if (userMeResult.error) {
            return { error: userMeResult.error };
          }
          const userMe = userMeResult.data as any;

          let cognitoAttributes = {};
          try {
            cognitoAttributes = await fetchUserAttributes();
          } catch (err) {
            console.error("Failed to fetch Cognito user attributes:", err);
          }

          let cognitoUser = {};
          try {
            cognitoUser = await getCurrentUser();
          } catch (err) {
            console.error("Failed to get current Cognito user:", err);
          }

          const userDetails = {
            ...userMe,
            email: (cognitoAttributes as any).email || userMe.email || "",
            username: (cognitoUser as any).username || userMe.username || "",
          };

          return { data: { userDetails, ...userDetails } };
        } catch (error: any) {
          return { error: { status: 500, data: error.message } };
        }
      },
      providesTags: ["AuthUser"],
    }),
    getProjects: build.query<Project[], { userId?: number }>({
      query: ({ userId }) => (userId ? `projects?userId=${userId}` : "projects"),
      providesTags: ["Projects"],
    }),
    getProjectById: build.query<Project, number>({
      query: (projectId) => `projects/${projectId}`,
      providesTags: (result, error, projectId) => [{ type: "Projects", id: projectId }],
    }),
    getProjectHealth: build.query<ProjectHealthResponseDTO, number>({
      query: (projectId) => `projects/${projectId}/health`,
      providesTags: (result, error, projectId) => [{ type: "Projects", id: projectId }],
    }),
    getProjectDependenciesPrediction: build.query<DependencyPredictionResponseDTO, number>({
      query: (projectId) => `projects/${projectId}/dependencies`,
      providesTags: (result, error, projectId) => [{ type: "Projects", id: projectId }],
    }),
    getProjectDependencyGraph: build.query<DependencyGraphResponseDTO, number>({
      query: (projectId) => `projects/${projectId}/dependencies/graph`,
      providesTags: (result, error, projectId) => [{ type: "Projects", id: projectId }],
    }),
    getAffectedDownstreamTasks: build.query<AffectedTasksResponseDTO, { projectId: number, taskId: number }>({
      query: ({ projectId, taskId }) => `projects/${projectId}/dependencies/affected/${taskId}`,
    }),
    createProject: build.mutation<Project, Partial<Project>>({
      query: (project) => ({
        url: "projects",
        method: "POST",
        body: project,
      }),
      invalidatesTags: ["Projects"],
    }),
    deleteProject: build.mutation<{ message: string }, number>({
      query: (projectId) => ({
        url: `projects/${projectId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Projects", "Tasks"],
    }),
    getTasks: build.query<Task[], { projectId: number; userId?: number }>({
      query: ({ projectId, userId }) => `tasks?projectId=${projectId}${userId ? `&userId=${userId}` : ""}`,
      providesTags: (result) => providesList(result, "Tasks"),
    }),
    getTasksByUser: build.query<Task[], number>({
      query: (userId) => `tasks/user/${userId}`,
      providesTags: (result, error, userId) => providesList(result, "Tasks", userId),
    }),
    createTask: build.mutation<Task, Partial<Task>>({
      query: (task) => ({
        url: "tasks",
        method: "POST",
        body: task,
      }),
      invalidatesTags: TASK_MUTATION_TAGS,
    }),
    updateTaskStatus: build.mutation<Task, { taskId: number; status: string }>({
      query: ({ taskId, status }) => ({
        url: `tasks/${taskId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: TASK_MUTATION_TAGS,
    }),
    updateTask: build.mutation<Task, Partial<Task> & { id: number }>({
      query: ({ id, ...body }) => ({
        url: `tasks/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: TASK_MUTATION_TAGS,
    }),
    getTaskDependencies: build.query<{ predecessors: TaskDependency[], successors: TaskDependency[] }, { projectId: number, taskId: number }>({
      query: ({ projectId, taskId }) => `projects/${projectId}/dependencies/tasks/${taskId}`,
      providesTags: (result, error, { taskId }) => [{ type: "Tasks", id: taskId }],
    }),
    addTaskDependency: build.mutation<TaskDependency, { projectId: number, taskId: number, type: string, predecessorId?: number, successorId?: number, note?: string }>({
      query: ({ projectId, taskId, ...body }) => ({
        url: `projects/${projectId}/dependencies/tasks/${taskId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { taskId, predecessorId, successorId }) => [
        { type: "Tasks", id: taskId },
        { type: "Tasks", id: predecessorId || taskId },
        { type: "Tasks", id: successorId || taskId }
      ],
    }),
    updateTaskDependency: build.mutation<TaskDependency, { projectId: number, taskId: number, dependencyId: number, type?: string, isActive?: boolean, note?: string }>({
      query: ({ projectId, taskId, dependencyId, ...body }) => ({
        url: `projects/${projectId}/dependencies/tasks/${taskId}/${dependencyId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: "Tasks", id: taskId }],
    }),
    removeTaskDependency: build.mutation<void, { projectId: number, taskId: number, dependencyId: number }>({
      query: ({ projectId, taskId, dependencyId }) => ({
        url: `projects/${projectId}/dependencies/tasks/${taskId}/${dependencyId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: "Tasks", id: taskId }],
    }),
    updateUser: build.mutation<User, Partial<User> & { cognitoId: string, teamIds?: number[], teamName?: string, roleName?: string }>({
      query: ({ cognitoId, ...body }) => ({
        url: `users/${cognitoId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Users", "AuthUser"],
    }),
    getUsers: build.query<User[], void>({
      query: () => "users",
      providesTags: ["Users"],
    }),
    getTeams: build.query<Team[], void>({
      query: () => "teams",
      providesTags: ["Teams"],
    }),
    getTeamById: build.query<Team, number>({
      query: (teamId) => `teams/${teamId}`,
      providesTags: (result, error, teamId) => [{ type: "Teams", id: teamId }],
    }),
    createTeam: build.mutation<Team, { teamName: string; teamLeadUserId?: number; memberUserIds?: number[] }>({
      query: (team) => ({
        url: "teams",
        method: "POST",
        body: team,
      }),
      invalidatesTags: ["Teams"],
    }),
    updateTeam: build.mutation<Team, { teamId: number; teamName?: string; teamLeadUserId?: number; memberUserIds?: number[] }>({
      query: ({ teamId, ...body }) => ({
        url: `teams/${teamId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: TEAM_MUTATION_TAGS,
    }),
    addTeamMember: build.mutation<void, { teamId: number; userId: number; role?: string }>({
      query: ({ teamId, ...body }) => ({
        url: `teams/${teamId}/members`,
        method: "POST",
        body,
      }),
      invalidatesTags: TEAM_MUTATION_TAGS,
    }),
    removeTeamMember: build.mutation<void, { teamId: number; userId: number }>({
      query: ({ teamId, userId }) => ({
        url: `teams/${teamId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: TEAM_MUTATION_TAGS,
    }),
    search: build.query<SearchResults, { query: string }>({
      query: ({ query }) => `search?query=${encodeURIComponent(query)}`,
    }),
    getActivities: build.query<Activity[], void>({
      query: () => "activities",
      providesTags: ["Activities"],
    }),

    // -----------------------------------------------------------------------
    // Upload endpoints — shared by profile pictures, task attachments, etc.
    // -----------------------------------------------------------------------

    /** Step 1: Get a presigned S3 PUT URL for any upload type */
    getPresignedUrl: build.mutation<
      PresignedUrlResult,
      {
        uploadType: UploadTypeKey;
        referenceId?: number;
        fileName: string;
        contentType: string;
        fileSize?: number;
      }
    >({
      query: (body) => ({
        url: "uploads/presign",
        method: "POST",
        body,
      }),
    }),

    /** Step 2: Confirm the upload and persist the record in the DB */
    confirmUpload: build.mutation<
      FileUpload,
      {
        uploadType: UploadTypeKey;
        referenceId?: number;
        s3Key: string;
        publicUrl: string;
        fileName: string;
        mimeType: string;
        fileSize?: number;
      }
    >({
      query: (body) => ({
        url: "uploads/confirm",
        method: "POST",
        body,
      }),
      invalidatesTags: ["FileUploads"],
    }),

    /** List uploads for a given type and optional resource */
    getFileUploads: build.query<
      FileUpload[],
      { uploadType: UploadTypeKey; referenceId?: number }
    >({
      query: ({ uploadType, referenceId }) =>
        `uploads?uploadType=${uploadType}${referenceId != null ? `&referenceId=${referenceId}` : ""}`,
      providesTags: ["FileUploads"],
    }),

    /** Profile-picture-specific: update User.profilePictureUrl after upload confirm */
    updateProfilePicture: build.mutation<User, { s3Key: string; publicUrl: string }>({
      query: (body) => ({
        url: "users/me/profile-picture",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AuthUser", "Users"],
    }),
    generateAIBreakdown: build.mutation<AIBreakdownSubtask[], { title: string; description?: string; projectId: number; minTasks?: number; maxTasks?: number }>({
      query: (body) => ({
        url: "ai/breakdown",
        method: "POST",
        body,
      }),
    }),

    /** Activity Collection Engine: normalized activity timeline for a project on a date */
    getActivityTimeline: build.query<
      ActivityTimelineResponseDTO,
      { projectId: number; date?: string; from?: string; to?: string }
    >({
      query: ({ projectId, date, from, to }) => {
        const params = new URLSearchParams();
        if (date) params.set("date", date);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const qs = params.toString();
        return `projects/${projectId}/activity-timeline${qs ? `?${qs}` : ""}`;
      },
      providesTags: (_result, _err, { projectId }) => [
        { type: "Tasks", id: projectId },
        { type: "Projects", id: projectId },
      ],
    }),

    /** Daily Timeline Builder: structured and formatted daily timeline */
    getDailyTimeline: build.query<
      DailyTimelineResponseDTO,
      { projectId: number; date?: string }
    >({
      query: ({ projectId, date }) => {
        const qs = date ? `?date=${date}` : "";
        return `projects/${projectId}/daily-timeline${qs}`;
      },
      providesTags: (_result, _err, { projectId }) => [
        { type: "Tasks", id: projectId },
        { type: "Projects", id: projectId },
      ],
    }),

    /** Standup Analysis Engine: deterministic activity buckets (Yesterday, Today, Blockers, etc.) */
    getStandupAnalysis: build.query<
      StandupAnalysisResult,
      { projectId: number; date?: string }
    >({
      query: ({ projectId, date }) => {
        const qs = date ? `?date=${date}` : "";
        return `projects/${projectId}/standup-analysis${qs}`;
      },
      providesTags: (_result, _err, { projectId }) => [
        { type: "Tasks", id: projectId },
        { type: "Projects", id: projectId },
      ],
    }),

    /** Team Workload Analysis Engine: tasks per member, overloaded and idle members */
    getTeamWorkload: build.query<
      TeamWorkloadResult,
      { projectId: number }
    >({
      query: ({ projectId }) => `projects/${projectId}/team-workload`,
      providesTags: (_result, _err, { projectId }) => [
        { type: "Tasks", id: projectId },
        { type: "Users", id: "LIST" },
      ],
    }),

    /** AI Standup Generator: generates structured standup using Gemini */
    getTodayStandup: build.query<
      AIStandupResponse & { id: number; date: string; generatedAt: string; isRegenerated: boolean; summary: any; aiRecommendations: any },
      { projectId: number }
    >({
      query: ({ projectId }) => `projects/${projectId}/standup/today`,
      providesTags: (_result, _err, { projectId }) => [
        { type: "Tasks", id: projectId },
        { type: "Projects", id: projectId },
      ],
    }),

    /** Paginated standup history — lightweight cards (lazy-loads full record on click) */
    getStandupHistory: build.query<
      StandupHistoryResponse,
      { projectId: number; page?: number; limit?: number; startDate?: string; endDate?: string; sprintId?: number }
    >({
      query: ({ projectId, page = 1, limit = 10, startDate, endDate, sprintId }) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (startDate) params.append("startDate", startDate);
        if (endDate)   params.append("endDate",   endDate);
        if (sprintId)  params.append("sprintId",  String(sprintId));
        return `projects/${projectId}/standup/history?${params.toString()}`;
      },
      providesTags: (_result, _err, { projectId }) => [
        { type: "Tasks", id: projectId },
      ],
    }),

    /** Fetch the full StandupReport for a specific date (lazy-loads on card click) */
    getStandupByDate: build.query<
      AIStandupResponse & StandupHistoryItem,
      { projectId: number; date: string }
    >({
      query: ({ projectId, date }) => `projects/${projectId}/standup/date/${date}`,
      providesTags: (_result, _err, { projectId }) => [
        { type: "Tasks", id: projectId },
      ],
    }),

    /** Run the StandupComparisonEngine over any two dates */
    compareStandups: build.query<
      StandupCompareResponse,
      { projectId: number; dateA: string; dateB: string }
    >({
      query: ({ projectId, dateA, dateB }) =>
        `projects/${projectId}/standup/compare?dateA=${dateA}&dateB=${dateB}`,
      providesTags: (_result, _err, { projectId }) => [
        { type: "Tasks", id: projectId },
      ],
    }),

    generateStandup: build.mutation<
      AIStandupResponse,
      { projectId: number; date?: string; filters?: AnalysisFilters }
    >({
      query: ({ projectId, date, filters }) => ({
        url: `projects/${projectId}/standup`,
        method: "POST",
        body: { date, filters },
      }),
      invalidatesTags: (_result, _err, { projectId }) => [
        { type: "Tasks", id: projectId },
      ],
    }),

    regenerateStandup: build.mutation<
      AIStandupResponse,
      { projectId: number; date?: string; filters?: AnalysisFilters }
    >({
      query: ({ projectId, date, filters }) => ({
        url: `projects/${projectId}/standup/regenerate`,
        method: "POST",
        body: { date, filters },
      }),
      invalidatesTags: (_result, _err, { projectId }) => [
        { type: "Tasks", id: projectId },
      ],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useGetProjectHealthQuery,
  useGetProjectDependenciesPredictionQuery,
  useGetProjectDependencyGraphQuery,
  useGetAffectedDownstreamTasksQuery,
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useUpdateTaskMutation,
  useGetTaskDependenciesQuery,
  useAddTaskDependencyMutation,
  useUpdateTaskDependencyMutation,
  useRemoveTaskDependencyMutation,
  useSearchQuery,
  useGetUsersQuery,
  useGetTeamsQuery,
  useGetTeamByIdQuery,
  useGetTasksByUserQuery,
  useGetAuthUserQuery,
  useUpdateUserMutation,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useGetActivitiesQuery,
  useGetPresignedUrlMutation,
  useConfirmUploadMutation,
  useGetFileUploadsQuery,
  useUpdateProfilePictureMutation,
  useGenerateAIBreakdownMutation,
  useAddTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useGetActivityTimelineQuery,
  useGetDailyTimelineQuery,
  useGetStandupAnalysisQuery,
  useGetTeamWorkloadQuery,
  useGetTodayStandupQuery,
  useGetStandupHistoryQuery,
  useGetStandupByDateQuery,
  useCompareStandupsQuery,
  useGenerateStandupMutation,
  useRegenerateStandupMutation,
} = api;