"use client";

import React from "react";
import { useGetProjectsQuery, useGetAuthUserQuery } from "@/state/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useAppSelector } from "@/app/redux";
import Header from "@/components/Header";
import { dataGridClassNames, dataGridSxStyles, formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ModalNewProject from "@/app/projects/ModalNewProject";
import EmptyState from "@/components/EmptyState";

const columns: GridColDef[] = [
  { field: "name", headerName: "Project Name", flex: 1, minWidth: 200 },
  { field: "description", headerName: "Description", flex: 2, minWidth: 300 },
  { 
    field: "ownerUsername", 
    headerName: "Project Manager", 
    width: 150,
    valueGetter: (value, row) => row?.owner?.username || "Unknown"
  },
  { 
    field: "startDate", 
    headerName: "Start Date", 
    width: 150,
    renderCell: (params) => formatDate(params.value)
  },
  { 
    field: "endDate", 
    headerName: "End Date", 
    width: 150,
    renderCell: (params) => formatDate(params.value)
  },
];

const ProjectsPage = () => {
  const router = useRouter();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  
  const { data: currentUser } = useGetAuthUserQuery({});
  const userId = currentUser?.userDetails?.userId || currentUser?.userId || null;
  
  const { data: projects, isLoading, isError } = useGetProjectsQuery(
    { userId: userId || 0 },
    { skip: userId === null }
  );

  const [isModalNewProjectOpen, setIsModalNewProjectOpen] = React.useState(false);

  if (isLoading || userId === null) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-dark-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-red-500">
        An error occurred while fetching your projects.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col p-8">
      <Header 
        name="Your Projects" 
        buttonComponent={
          <button
            className="flex items-center rounded-md bg-blue-primary px-3 py-2 text-white hover:bg-blue-600"
            onClick={() => setIsModalNewProjectOpen(true)}
          >
            New Project
          </button>
        }
      />
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        A comprehensive list of all projects you are involved in.
      </p>

      <ModalNewProject isOpen={isModalNewProjectOpen} onClose={() => setIsModalNewProjectOpen(false)} />

      {projects && projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No projects found"
            description="You are not involved in any projects yet. Create a new project to get started!"
            ctaLabel="New Project"
            onCta={() => setIsModalNewProjectOpen(true)}
          />
        </div>
      ) : (
        <div style={{ height: 600, width: "100%" }} className="mt-4">
          <DataGrid
            rows={projects || []}
            columns={columns}
            className={dataGridClassNames}
            sx={dataGridSxStyles(isDarkMode)}
            onRowClick={(params) => {
              router.push(`/projects/${params.row.id}`);
            }}
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

export default ProjectsPage;
