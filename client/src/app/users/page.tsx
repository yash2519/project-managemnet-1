"use client";
import { useGetUsersQuery } from "@/state/api";
import React from "react";
import { useAppSelector } from "../redux";
import Header from "@/components/Header";
import {
  DataGrid,
  GridColDef,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import Image from "next/image";
import { User as UserIcon } from "lucide-react";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";

const CustomToolbar = () => (
  <GridToolbarContainer className="toolbar flex gap-2">
    <GridToolbarFilterButton />
    <GridToolbarExport />
  </GridToolbarContainer>
);

const columns: GridColDef[] = [
  { field: "userId", headerName: "ID", width: 100 },
  { field: "username", headerName: "Username", width: 150 },
  {
    field: "profilePictureUrl",
    headerName: "Profile Picture",
    width: 100,
    renderCell: (params) => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-9 w-9 flex items-center justify-center">
          {params.value ? (
            <Image
              src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${params.value}`}
              alt={params.row.username}
              width={100}
              height={50}
              className="h-full rounded-full object-cover"
              onError={(e) => {
                if (e.currentTarget.src.includes("ui-avatars.com")) return;
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${params.row.username}`;
                e.currentTarget.srcset = "";
              }}
            />
          ) : (
            <UserIcon className="h-6 w-6 text-gray-500 dark:text-gray-300" />
          )}
        </div>
      </div>
    ),
  },
];

const Users = () => {
  const { data: users, isLoading, isError } = useGetUsersQuery();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  if (isLoading) return <div>Loading...</div>;
  if (isError || !users) return <div>Error fetching users</div>;

  return (
    <div className="flex w-full flex-col p-8">
      <Header name="Users" />
      {users && users.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No users found"
            description="There are currently no users registered in the system."
          />
        </div>
      ) : (
        <div style={{ height: 650, width: "100%" }}>
          <DataGrid
            rows={users || []}
            columns={columns}
            getRowId={(row) => row.userId}
            pagination
            slots={{
              toolbar: CustomToolbar,
            }}
            className={dataGridClassNames}
            sx={dataGridSxStyles(isDarkMode)}
          />
        </div>
      )}
    </div>
  );
};

export default Users;
