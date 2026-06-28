import React, { useState, useRef, useEffect } from "react";
import { MoreVertical, Eye, Edit3, UserPlus, CheckSquare } from "lucide-react";
import type { Task, Project } from "@/types";

interface ActionMenuProps {
  task: Task;
  currentUser: any;
  projects: Project[];
  onViewDetails: (task: Task) => void;
  onEdit: (task: Task) => void;
  onAssign: (task: Task) => void;
  onMarkComplete: (taskId: number) => void;
}

const ActionMenu = ({
  task, currentUser, projects,
  onViewDetails, onEdit, onAssign, onMarkComplete,
}: ActionMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const project = projects.find((p) => p.id === task.projectId);
  const isOwner = project !== undefined && project.ownerId === currentUser?.userId;
  const isAdmin = currentUser?.role === "ADMIN";
  const isAssigned = task.assignedUserId === currentUser?.userId;

  const canEditOrAssign = isOwner || isAdmin;
  const canChangeStatus = isOwner || isAssigned;

  return (
    <div className="action-menu-container" ref={ref}>
      <button className="action-menu-trigger" onClick={() => setOpen(!open)}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="action-menu-dropdown">
          <button
            className="action-menu-item"
            onClick={() => { onViewDetails(task); setOpen(false); }}
          >
            <Eye size={14} /> View Details
          </button>
          {canEditOrAssign && (
            <button
              className="action-menu-item"
              onClick={() => { onEdit(task); setOpen(false); }}
            >
              <Edit3 size={14} /> Edit
            </button>
          )}
          {canEditOrAssign && (
            <button
              className="action-menu-item"
              onClick={() => { onAssign(task); setOpen(false); }}
            >
              <UserPlus size={14} /> Assign
            </button>
          )}
          {canChangeStatus && task.status !== "Completed" && (
            <button
              className="action-menu-item"
              onClick={() => { onMarkComplete(task.id); setOpen(false); }}
            >
              <CheckSquare size={14} /> Mark Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
