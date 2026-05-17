"use client";
import { useGetTeamsQuery } from "@/state/api";
import React, { useState } from "react";
import { useAppSelector } from "../redux";
import Header from "@/components/Header";
import ModalNewTeam from "./ModalNewTeam";
import {
  DataGrid,
  GridColDef,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";

const CustomToolbar = () => (
  <GridToolbarContainer className="toolbar flex gap-2">
    <GridToolbarFilterButton />
    <GridToolbarExport />
  </GridToolbarContainer>
);

const columns: GridColDef[] = [
  { field: "id", headerName: "Team ID", width: 100 },
  { field: "teamName", headerName: "Team Name", width: 200 },
  { field: "productOwnerUsername", headerName: "Product Owner", width: 200 },
  {
    field: "projectManagerUsername",
    headerName: "Project Manager",
    width: 200,
  },
];

const Teams = () => {
  const { data: teams, isLoading, isError } = useGetTeamsQuery();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const [isModalNewTeamOpen, setIsModalNewTeamOpen] = useState(false);

  if (isLoading) return <div>Loading...</div>;
  if (isError || !teams) return <div>Error fetching teams</div>;

  return (
    <div className="flex w-full flex-col p-8">
      <ModalNewTeam
        isOpen={isModalNewTeamOpen}
        onClose={() => setIsModalNewTeamOpen(false)}
      />
      <Header
        name="Teams"
        buttonComponent={
          <button
            className="flex items-center rounded bg-blue-primary px-3 py-2 text-white hover:bg-blue-600"
            onClick={() => setIsModalNewTeamOpen(true)}
          >
            New Team
          </button>
        }
      />
      {teams && teams.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No teams found"
            description="There are currently no teams created in the system."
          />
        </div>
      ) : (
        <div style={{ height: 650, width: "100%" }}>
          <DataGrid
            rows={teams || []}
            columns={columns}
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

export default Teams;
