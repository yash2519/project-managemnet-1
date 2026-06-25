"use client";

import React, { useState } from "react";
import ProjectHeader from "@/app/projects/ProjectHeader";
import Board from "../BoardView";
import List from "../ListView";
import Timeline from "../TimelineView";
import Table from "../TableView";
import ModalNewTask from "@/components/ModalNewTask";
import {
  useGetProjectByIdQuery,
  useDeleteProjectMutation,
  useGetAuthUserQuery,
} from "@/state/api";
import { useRouter } from "next/navigation";
import {
  Trash2,
  User,
  FileText,
  Hash,
  Tag,
  CalendarRange,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type Props = {
  params: { id: string };
};

const Project = ({ params }: Props) => {
  const { id } = params;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Board");
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: project, isLoading: projectLoading } = useGetProjectByIdQuery(
    Number(id)
  );
  const { data: currentUser } = useGetAuthUserQuery({});
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  const currentUserId =
    currentUser?.userDetails?.userId ?? currentUser?.userId ?? null;
  const isOwner =
    project?.ownerId !== undefined && currentUserId === project.ownerId;

  const handleDelete = async () => {
    try {
      await deleteProject(Number(id)).unwrap();
      router.push("/projects");
    } catch (e) {
      console.error("Failed to delete project:", e);
    }
  };



  return (
    <div>
      <ModalNewTask
        isOpen={isModalNewTaskOpen}
        onClose={() => setIsModalNewTaskOpen(false)}
        id={id}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-dark-secondary">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Delete Project?
            </h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              This will permanently delete <span className="font-medium text-gray-800 dark:text-gray-200">&quot;{project?.name}&quot;</span> and all its tasks. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-dark-tertiary dark:text-gray-300 dark:hover:bg-dark-tertiary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ProjectHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSearchTerm={setSearchTerm}
      />

      {/* Project Metadata Panel */}
      {!projectLoading && project && (
        <div className="mx-4 mb-2 mt-4 rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm dark:border-dark-secondary dark:bg-dark-secondary xl:mx-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">
              Project Details
            </h2>
            {isOwner && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
              >
                <Trash2 className="h-4 w-4" />
                Delete Project
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Project ID */}
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-dark-tertiary">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-neutral-500">
                  Project ID
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-gray-800 dark:text-white">
                  #{project.id}
                </p>
              </div>
            </div>

            {/* Project Name */}
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-dark-tertiary">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Tag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-neutral-500">
                  Project Name
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-gray-800 dark:text-white">
                  {project.name}
                </p>
              </div>
            </div>

            {/* Owner */}
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-dark-tertiary">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-neutral-500">
                  Admin / Owner
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-gray-800 dark:text-white">
                  {project.owner?.username ?? "—"}
                  {isOwner && (
                    <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      You
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-dark-tertiary">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <CalendarRange className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-neutral-500">
                  Duration
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-white">
                  {formatDate(project.startDate)} → {formatDate(project.endDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Description — full width */}
          {project.description && (
            <div className="mt-4 flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-dark-tertiary">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
                <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-neutral-500">
                  Description
                </p>
                <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                  {project.description}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "Board" && (
        <Board id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen} searchTerm={searchTerm} />
      )}
      {activeTab === "List" && (
        <List id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen} searchTerm={searchTerm} />
      )}
      {activeTab === "Timeline" && (
        <Timeline id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen} searchTerm={searchTerm} />
      )}
      {activeTab === "Table" && (
        <Table id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen} searchTerm={searchTerm} />
      )}
    </div>
  );
};

export default Project;

