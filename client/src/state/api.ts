import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";

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
  updatedAt?: string;
}

export interface AIBreakdownSubtask {
  title: string;
  description: string;
  points: number;
  assignedUserId: number;
  priority?: string;
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
      providesTags: (result) =>
        result
          ? result.map(({ id }) => ({ type: "Tasks" as const, id }))
          : [{ type: "Tasks" as const }],
    }),
    getTasksByUser: build.query<Task[], number>({
      query: (userId) => `tasks/user/${userId}`,
      providesTags: (result, error, userId) =>
        result
          ? result.map(({ id }) => ({ type: "Tasks", id }))
          : [{ type: "Tasks", id: userId }],
    }),
    createTask: build.mutation<Task, Partial<Task>>({
      query: (task) => ({
        url: "tasks",
        method: "POST",
        body: task,
      }),
      invalidatesTags: ["Tasks"],
    }),
    updateTaskStatus: build.mutation<Task, { taskId: number; status: string }>({
      query: ({ taskId, status }) => ({
        url: `tasks/${taskId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Tasks"],
    }),
    updateTask: build.mutation<Task, Partial<Task> & { id: number }>({
      query: ({ id, ...body }) => ({
        url: `tasks/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Tasks"],
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
      invalidatesTags: ["Teams", "Users", "AuthUser"],
    }),
    addTeamMember: build.mutation<void, { teamId: number; userId: number; role?: string }>({
      query: ({ teamId, ...body }) => ({
        url: `teams/${teamId}/members`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Teams", "Users", "AuthUser"],
    }),
    removeTeamMember: build.mutation<void, { teamId: number; userId: number }>({
      query: ({ teamId, userId }) => ({
        url: `teams/${teamId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teams", "Users", "AuthUser"],
    }),
    search: build.query<SearchResults, { query: string; userId?: number }>({
      query: ({ query, userId }) => `search?query=${query}${userId ? `&userId=${userId}` : ""}`,
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
    generateAIBreakdown: build.mutation<AIBreakdownSubtask[], { title: string; description?: string; projectId: number }>({
      query: (body) => ({
        url: "ai/breakdown",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useUpdateTaskMutation,
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
} = api;