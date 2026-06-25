import { Task } from "@/state/api";
import Image from "next/image";
import React, { useState } from "react";
import { formatDate } from "@/lib/utils";
import { EllipsisVertical, MessageSquareMore } from "lucide-react";

type Props = {
  task: Task;
};

const TaskCard = ({ task }: Props) => {
  const [showAssignees, setShowAssignees] = useState(false);

  const taskTagsSplit = task.tags ? task.tags.split(",") : [];

  const formattedStartDate = task.startDate ? formatDate(task.startDate) : "";
  const formattedDueDate = task.dueDate ? formatDate(task.dueDate) : "";
  const numberOfComments = (task.comments && task.comments.length) || 0;

  const PriorityTag = ({ priority }: { priority: Task["priority"] }) => (
    <div
      className={`rounded-full px-2 py-1 text-xs font-semibold ${
        priority === "Urgent"
          ? "bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : priority === "High"
            ? "bg-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            : priority === "Medium"
              ? "bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : priority === "Low"
                ? "bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
      }`}
    >
      {priority}
    </div>
  );

  return (
    <div className="mb-3 rounded bg-white shadow dark:bg-dark-secondary dark:text-white">
      {task.attachments && task.attachments.length > 0 && (
        <Image
          src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${task.attachments[0].fileURL}`}
          alt={task.attachments[0].fileName}
          width={400}
          height={200}
          className="h-auto w-full rounded-t-md"
        />
      )}
      <div className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {task.priority && <PriorityTag priority={task.priority} />}
            <div className="flex gap-2">
              {taskTagsSplit.map((tag) => (
                <div
                  key={tag}
                  className="rounded-full bg-blue-100 px-2 py-1 text-xs dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {" "}
                  {tag}
                </div>
              ))}
            </div>
          </div>
          <button className="flex h-6 w-4 flex-shrink-0 items-center justify-center dark:text-neutral-500">
            <EllipsisVertical size={26} />
          </button>
        </div>

        <div className="my-3 flex justify-between">
          <h4 className="text-md font-bold dark:text-white">{task.title}</h4>
          {typeof task.points === "number" && (
            <div className="text-xs font-semibold dark:text-white">
              {task.points} pts
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-neutral-400">
          {formattedStartDate && <span>{formattedStartDate} - </span>}
          {formattedDueDate && <span>{formattedDueDate}</span>}
        </div>
        <p className="text-sm text-gray-600 dark:text-neutral-400 mt-2">
          {task.description}
        </p>
        <div className="mt-4 border-t border-gray-200 dark:border-stroke-dark" />

        {/* Users */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex -space-x-[6px] overflow-hidden">
            {task.assignee && (
              <Image
                key={task.assignee.userId}
                src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${task.assignee.profilePictureUrl!}`}
                alt={task.assignee.username}
                width={30}
                height={30}
                className="h-8 w-8 rounded-full border-2 border-white object-cover dark:border-dark-secondary"
                onError={(e) => {
                  if (e.currentTarget.src.includes("ui-avatars.com")) return;
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${task.assignee?.username}`;
                  e.currentTarget.srcset = "";
                }}
              />
            )}
            {task.author && (
              <Image
                key={task.author.userId}
                src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${task.author.profilePictureUrl!}`}
                alt={task.author.username}
                width={30}
                height={30}
                className="h-8 w-8 rounded-full border-2 border-white object-cover dark:border-dark-secondary"
                onError={(e) => {
                  if (e.currentTarget.src.includes("ui-avatars.com")) return;
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${task.author?.username}`;
                  e.currentTarget.srcset = "";
                }}
              />
            )}
          </div>
          
          <button 
            onClick={() => setShowAssignees(!showAssignees)} 
            className="text-xs text-blue-500 hover:underline dark:text-blue-400"
          >
            {showAssignees ? "Hide Assignees" : "View Assignees"}
          </button>
          
          <div className="flex items-center text-gray-500 dark:text-neutral-500">
            <MessageSquareMore size={20} />
            <span className="ml-1 text-sm dark:text-neutral-400">
              {numberOfComments}
            </span>
          </div>
        </div>
        
        {showAssignees && (
          <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-dark-tertiary dark:bg-dark-tertiary">
            <h5 className="mb-2 text-xs font-semibold dark:text-white">All Assignees</h5>
            <div className="flex flex-col gap-2">
              {task.assignee && (
                <div className="flex items-center gap-2">
                  <Image
                    src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${task.assignee.profilePictureUrl!}`}
                    alt={task.assignee.username}
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-full object-cover"
                    onError={(e) => {
                      if (e.currentTarget.src.includes("ui-avatars.com")) return;
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${task.assignee?.username}`;
                      e.currentTarget.srcset = "";
                    }}
                  />
                  <span className="text-sm dark:text-white">{task.assignee.username} (Primary)</span>
                </div>
              )}
              {task.taskAssignments?.map((ta) => ta.user.userId !== task.assignee?.userId && (
                <div key={ta.user.userId} className="flex items-center gap-2">
                  <Image
                    src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${ta.user.profilePictureUrl!}`}
                    alt={ta.user.username}
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-full object-cover"
                    onError={(e) => {
                      if (e.currentTarget.src.includes("ui-avatars.com")) return;
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${ta.user.username}`;
                      e.currentTarget.srcset = "";
                    }}
                  />
                  <span className="text-sm dark:text-white">{ta.user.username}</span>
                </div>
              ))}
              {!task.assignee && (!task.taskAssignments || task.taskAssignments.length === 0) && (
                <span className="text-sm text-gray-500">No assignees</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
