import Modal from "@/components/Modal";
import { Task } from "@/state/api";
import { formatDate } from "@/lib/utils";
import Image from "next/image";
import React from "react";
import DependencySection from "./DependencySection";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
};

const TaskDetailsModal = ({ isOpen, onClose, task }: Props) => {
  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Task Details">
      <div className="mt-4 space-y-5 text-gray-800 dark:text-gray-200">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {task.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {task.description || "No description provided."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Status
            </span>
            <span className="mt-0.5 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              {task.status || "—"}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Priority
            </span>
            <span className="mt-0.5 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              {task.priority || "—"}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Created By
            </span>
            <span className="mt-0.5 text-sm font-medium">
              {task.author?.username || "Unknown"}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Primary Assignee
            </span>
            <span className="mt-0.5 text-sm font-medium">
              {task.assignee?.username || "Unassigned"}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Start Date
            </span>
            <span className="mt-0.5 text-sm font-medium">
              {formatDate(task.startDate)}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Due Date
            </span>
            <span className="mt-0.5 text-sm font-medium">
              {formatDate(task.dueDate)}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Created Date
            </span>
            <span className="mt-0.5 text-sm font-medium">
              {formatDate(task.createdAt)}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Updated Date
            </span>
            <span className="mt-0.5 text-sm font-medium">
              {formatDate(task.updatedAt)}
            </span>
          </div>
        </div>

        {/* Other Assignees */}
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Other Assignees
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {task.taskAssignments && task.taskAssignments.length > 0 ? (
              task.taskAssignments.map((ta: any) => (
                <span
                  key={ta.user.userId}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium dark:bg-gray-800"
                >
                  {ta.user.username}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500">No other assignees.</span>
            )}
          </div>
        </div>

        {/* Dependencies */}
        <DependencySection task={task} />

        {/* Attachments */}
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Attachments
          </span>
          {task.attachments && task.attachments.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {task.attachments.map((att) => (
                <div
                  key={att.id}
                  className="overflow-hidden rounded border border-gray-200 dark:border-gray-700"
                >
                  <Image
                    src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${att.fileURL}`}
                    alt={att.fileName || "attachment"}
                    width={200}
                    height={100}
                    className="h-auto w-full object-cover"
                    unoptimized
                  />
                  {att.fileName && (
                    <div className="bg-gray-50 p-1 text-center text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400 truncate">
                      {att.fileName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-500">No attachments.</span>
          )}
        </div>

        {/* Comments */}
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
            Comments
          </span>
          {task.comments && task.comments.length > 0 ? (
            <div className="mt-2 max-h-40 overflow-y-auto space-y-2 rounded border border-gray-100 p-2 dark:border-gray-800">
              {task.comments.map((comment: any) => (
                <div
                  key={comment.id}
                  className="rounded bg-gray-50 p-2 text-xs dark:bg-gray-800/50"
                >
                  <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                    <span>{comment.user?.username || "Anonymous"}</span>
                  </div>
                  <p className="mt-0.5 text-gray-700 dark:text-gray-300">
                    {comment.text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-500">No comments yet.</span>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TaskDetailsModal;
