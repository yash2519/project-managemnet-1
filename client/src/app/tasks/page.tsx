"use client";

import React from "react";
import { useGetTasksByUserQuery, useGetAuthUserQuery } from "@/state/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useAppSelector } from "@/app/redux";
import Header from "@/components/Header";
import { dataGridClassNames, dataGridSxStyles, formatDate, getPriorityBadgeClass, getStatusBadgeClass } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { isPast } from "date-fns";
import EmptyState from "@/components/EmptyState";

const TasksPage = () => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  
  const { data: currentUser } = useGetAuthUserQuery({});
  const userId = currentUser?.userDetails?.userId || currentUser?.userId || null;
  
  const { data: tasks, isLoading, isError } = useGetTasksByUserQuery(userId || 0, {
    skip: userId === null,
  });


  const columns: GridColDef[] = [
    { 
      field: "title", 
      headerName: "Task Name", 
      flex: 1.5, 
      minWidth: 220,
      renderCell: (params) => (
        <div className="flex flex-col justify-center gap-0.5 py-2">
          <span className="font-semibold text-gray-900 dark:text-white" style={{ fontSize: 13 }}>{params.value}</span>
          {params.row.description && (
            <span className="truncate text-xs text-gray-400" style={{ maxWidth: 240 }}>
              {params.row.description}
            </span>
          )}
        </div>
      ),
    },
    { 
      field: "priority", 
      headerName: "Priority", 
      width: 130,
      renderCell: (params) => <span className={getPriorityBadgeClass(params.value)}>{params.value || "—"}</span>,
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 150,
      renderCell: (params) => <span className={getStatusBadgeClass(params.value)}>{params.value || "—"}</span>,
    },
    { 
      field: "dueDate", 
      headerName: "Due Date", 
      width: 150,
      renderCell: (params) => {
        if (!params.value) return <span className="text-gray-400">—</span>;
        const due = new Date(params.value);
        const overdue = isPast(due) && params.row.status !== "Completed";
        return (
          <span className={`text-xs ${overdue ? "font-semibold text-red-500" : "text-gray-700 dark:text-gray-300"}`}>
            {formatDate(params.value)}
          </span>
        );
      },
    },
    {
      field: "author",
      headerName: "Assigned By",
      width: 150,
      renderCell: (params) => params.value?.username || "Unknown",
    },
    {
      field: "projectId",
      headerName: "Project ID",
      width: 100,
    }
  ];

  if (isLoading || userId === null) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-dark-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-red-500">
        An error occurred while fetching your tasks.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col p-8">
      <Header name="My Assigned Tasks" />
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        A complete list of all tasks assigned to you across all projects.
      </p>

      {tasks && tasks.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No tasks assigned"
            description="You don't have any tasks assigned to you right now. Take a break or check back later!"
          />
        </div>
      ) : (
        <div style={{ height: 600, width: "100%" }} className="mt-4">
          <DataGrid
            rows={tasks || []}
            columns={columns}
            className={dataGridClassNames}
            sx={dataGridSxStyles(isDarkMode)}
            pagination
            pageSizeOptions={[10, 20, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TasksPage;
