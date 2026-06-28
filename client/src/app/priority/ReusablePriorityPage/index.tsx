"use client";

import { useAppSelector } from "@/app/redux";
import Header from "@/components/Header";
import ModalNewTask from "@/components/ModalNewTask";
import TaskCard from "@/components/TaskCard";
import { dataGridClassNames, dataGridSxStyles, formatDate } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import {
  Priority,
  Task,
  useGetAuthUserQuery,
  useGetTasksByUserQuery,
} from "@/state/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import React, { useState, Suspense } from "react";
import { List, Table } from "lucide-react";

type Props = {
  priority: Priority;
};

const columns: GridColDef[] = [
  {
    field: "title",
    headerName: "Title",
    width: 100,
  },
  {
    field: "description",
    headerName: "Description",
    width: 200,
  },
  {
    field: "status",
    headerName: "Status",
    width: 130,
    renderCell: (params) => (
      <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
        {params.value}
      </span>
    ),
  },
  {
    field: "priority",
    headerName: "Priority",
    width: 75,
  },
  {
    field: "tags",
    headerName: "Tags",
    width: 130,
  },
  {
    field: "startDate",
    headerName: "Start Date",
    width: 130,
    renderCell: (params) => formatDate(params.value),
  },
  {
    field: "dueDate",
    headerName: "Due Date",
    width: 130,
    renderCell: (params) => formatDate(params.value),
  },
  {
    field: "author",
    headerName: "Author",
    width: 150,
    renderCell: (params) => params.value?.username || "Unknown",
  },
  {
    field: "assignee",
    headerName: "Assignee",
    width: 150,
    renderCell: (params) => params.value?.username || "Unassigned",
  },
];

/** Skeleton card shown while tasks are loading */
const TaskCardSkeleton = () => (
  <div className="mb-3 animate-pulse rounded bg-white shadow dark:bg-dark-secondary">
    <div className="p-4 md:p-6">
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  </div>
);

const priorityLabels: Record<Priority, string> = {
  [Priority.Urgent]: "Urgent",
  [Priority.High]: "High",
  [Priority.Medium]: "Medium",
  [Priority.Low]: "Low",
  [Priority.Backlog]: "Backlog",
};

const ReusablePriorityPage = ({ priority }: Props) => {
  const [view, setView] = useState("list");
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);

  const { data: currentUser, isLoading: isAuthLoading } = useGetAuthUserQuery({});
  const userId = currentUser?.userId || currentUser?.userDetails?.userId || null;

  const {
    data: tasks,
    isLoading: isTasksLoading,
    isError: isTasksError,
  } = useGetTasksByUserQuery(userId ?? 0, {
    skip: userId === null,
  });

  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const filteredTasks = tasks?.filter(
    (task: Task) => task.priority === priority
  );

  const priorityLabel = priorityLabels[priority];
  const isLoading = isAuthLoading || isTasksLoading;

  return (
    <div className="m-5 p-4">
      <ModalNewTask
        isOpen={isModalNewTaskOpen}
        onClose={() => setIsModalNewTaskOpen(false)}
      />
      <Header
        name={`${priorityLabel} Priority`}
        buttonComponent={
          <button
            className="mr-3 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
            onClick={() => setIsModalNewTaskOpen(true)}
          >
            Add Task
          </button>
        }
      />

      {/* View toggle */}
      <div className="mb-4 flex justify-start">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 shadow-inner dark:border-gray-700 dark:bg-gray-900">
          <button
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              view === "list"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200 dark:bg-gray-700 dark:text-white dark:ring-gray-600"
                : "text-gray-500 hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            }`}
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
            List
          </button>
          <button
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              view === "table"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200 dark:bg-gray-700 dark:text-white dark:ring-gray-600"
                : "text-gray-500 hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            }`}
            onClick={() => setView("table")}
          >
            <Table className="h-4 w-4" />
            Table
          </button>
        </div>
      </div>

      {/* Error state */}
      {isTasksError && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/30 dark:bg-red-900/10">
          <p className="font-medium text-red-600 dark:text-red-400">
            Failed to load tasks. Please try again later.
          </p>
        </div>
      )}

      {/* Loading skeletons */}
      {!isTasksError && isLoading && view === "list" && (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Loading spinner for table view */}
      {!isTasksError && isLoading && view === "table" && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400" />
        </div>
      )}

      {/* Content: only show when NOT loading and NOT error */}
      {!isTasksError && !isLoading && (
        <>
          {/* Empty state */}
          {(!filteredTasks || filteredTasks.length === 0) && (
            <div className="mt-8">
              <EmptyState
                title="No tasks assigned"
                description={`There are currently no tasks assigned under ${priorityLabel} priority.`}
                ctaLabel="Add Task"
                onCta={() => setIsModalNewTaskOpen(true)}
              />
            </div>
          )}

          {/* List view — wrap in Suspense because TaskCard uses useSearchParams() */}
          {filteredTasks && filteredTasks.length > 0 && view === "list" && (
            <Suspense
              fallback={
                <div className="grid grid-cols-1 gap-4">
                  {filteredTasks.map((_, i) => (
                    <TaskCardSkeleton key={i} />
                  ))}
                </div>
              }
            >
              <div className="grid grid-cols-1 gap-4">
                {filteredTasks.map((task: Task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </Suspense>
          )}

          {/* Table view */}
          {filteredTasks && filteredTasks.length > 0 && view === "table" && (
            <div className="z-0 w-full">
              <DataGrid
                rows={filteredTasks}
                columns={columns}
                checkboxSelection
                getRowId={(row) => row.id}
                className={dataGridClassNames}
                sx={dataGridSxStyles(isDarkMode)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReusablePriorityPage;