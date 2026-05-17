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
  teams?: Team[];
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
  description?: string;
  status?: Status;
  priority?: Priority;
  tags?: string;
  startDate?: string;
  dueDate?: string;
  points?: number;
  projectId: number;
  authorUserId?: number;
  assignedUserId?: number;

  author?: User;
  assignee?: User;
  comments?: Comment[];
  attachments?: Attachment[];
  taskAssignments?: { user: User }[];
}

export interface SearchResults {
  tasks?: Task[];
  projects?: Project[];
  users?: User[];
}

export interface Team {
  teamId: number;
  teamName: string;
  scopeOfWork?: string;
  productOwnerUserId?: number;
  projectManagerUserId?: number;
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
  tagTypes: ["Projects", "Tasks", "Users", "Teams", "AuthUser"],
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
      invalidatesTags: ["Projects"],
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
      invalidatesTags: (result, error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),
    updateUser: build.mutation<User, Partial<User> & { cognitoId: string, teamIds?: number[] }>({
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
    createTeam: build.mutation<Team, Partial<Team>>({
      query: (team) => ({
        url: "teams",
        method: "POST",
        body: team,
      }),
      invalidatesTags: ["Teams"],
    }),
    search: build.query<SearchResults, { query: string; userId?: number }>({
      query: ({ query, userId }) => `search?query=${query}${userId ? `&userId=${userId}` : ""}`,
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
  useSearchQuery,
  useGetUsersQuery,
  useGetTeamsQuery,
  useGetTasksByUserQuery,
  useGetAuthUserQuery,
  useUpdateUserMutation,
  useCreateTeamMutation,
} = api;