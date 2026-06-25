import { Project } from "@/state/api";
import React from "react";
import { formatDate } from "@/lib/utils";

type Props = {
  project: Project;
};

const ProjectCard = ({ project }: Props) => {
  return (
    <div className="rounded border p-4 shadow">
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      <p>Start Date: {formatDate(project.startDate)}</p>
      <p>End Date: {formatDate(project.endDate)}</p>
    </div>
  );
};

export default ProjectCard;
