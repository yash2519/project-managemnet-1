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
import React, { useState } from "react";
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
    renderCell: (params) => formatDate(params.value)
  },
  {
    field: "dueDate",
    headerName: "Due Date",
    width: 130,
    renderCell: (params) => formatDate(params.value)
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

const ReusablePriorityPage = ({ priority }: Props) => {
  const [view, setView] = useState("list");
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);

  const { data: currentUser, isLoading: isAuthLoading } = useGetAuthUserQuery({});
  const userId = currentUser?.userId || currentUser?.userDetails?.userId || null;
  const {
    data: tasks,
    isLoading,
    isError: isTasksError,
  } = useGetTasksByUserQuery(userId || 0, {
    skip: userId === null,
  });

  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const filteredTasks = tasks?.filter(
    (task: Task) => task.priority === priority,
  );

  if (isAuthLoading || isLoading) return <div>Loading tasks...</div>;
  if (isTasksError || (!tasks && userId !== null)) return <div>Error fetching tasks</div>;

  return (
    <div className="m-5 p-4">
      <ModalNewTask
        isOpen={isModalNewTaskOpen}
        onClose={() => setIsModalNewTaskOpen(false)}
      />
      <Header
        name="Priority Page"
        buttonComponent={
          <button
            className="mr-3 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
            onClick={() => setIsModalNewTaskOpen(true)}
          >
            Add Task
          </button>
        }
      />
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

    {isLoading ? (
  <div>Loading tasks...</div>
) : filteredTasks?.length === 0 ? (
  <div className="mt-8">
    <EmptyState
      title={`No tasks assigned`}
      description={`There are currently no tasks assigned under ${priority} priority.`}
      ctaLabel="Add Task"
      onCta={() => setIsModalNewTaskOpen(true)}
    />
  </div>
) : view === "list" ? (
  <div className="grid grid-cols-1 gap-4">
    {filteredTasks?.map((task: Task) => (
      <TaskCard key={task.id} task={task} />
    ))}
  </div>
) : (
  <div className="z-0 w-full">
    <DataGrid
      rows={filteredTasks || []}
      columns={columns}
      checkboxSelection
      getRowId={(row) => row.id}
      className={dataGridClassNames}
      sx={dataGridSxStyles(isDarkMode)}
    />
  </div>
)}

    </div>
  );
};

export default ReusablePriorityPage;