import { Task } from "@/state/api";
import { format } from "date-fns";
import Image from "next/image";
import React, { useState } from "react";

type Props = {
  task: Task;
};

const TaskCard = ({ task }: Props) => {
  const [showAssignees, setShowAssignees] = useState(false);

  return (
    <div className="mb-3 rounded bg-white p-4 shadow dark:bg-dark-secondary dark:text-white">
      {task.attachments && task.attachments.length > 0 && (
        <div>
          <strong>Attachments:</strong>
          <div className="flex flex-wrap">
            {task.attachments && task.attachments.length > 0 && (
              <Image
                src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${task.attachments[0].fileURL}`}
                alt={task.attachments[0].fileName}
                width={400}
                height={200}
                className="rounded-md"
              />
            )}
          </div>
        </div>
      )}
      <p>
        <strong>ID:</strong> {task.id}
      </p>
      <p>
        <strong>Title:</strong> {task.title}
      </p>
      <p>
        <strong>Description:</strong>{" "}
        {task.description || "No description provided"}
      </p>
      <p>
        <strong>Status:</strong> {task.status}
      </p>
      <p>
        <strong>Priority:</strong> {task.priority}
      </p>
      <p>
        <strong>Tags:</strong> {task.tags || "No tags"}
      </p>
      <p>
        <strong>Start Date:</strong>{" "}
        {task.startDate ? format(new Date(task.startDate), "P") : "Not set"}
      </p>
      <p>
        <strong>Due Date:</strong>{" "}
        {task.dueDate ? format(new Date(task.dueDate), "P") : "Not set"}
      </p>
      <p>
        <strong>Author:</strong>{" "}
        {task.author ? task.author.username : "Unknown"}
      </p>
      
      <div className="mt-2 flex flex-col items-start gap-1">
        <button 
          onClick={() => setShowAssignees(!showAssignees)} 
          className="text-sm text-blue-500 hover:underline dark:text-blue-400"
        >
          {showAssignees ? "Hide Assignees" : "View Assignees"}
        </button>
        
        {showAssignees && (
          <div className="mt-2 w-full rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-dark-tertiary dark:bg-dark-tertiary">
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
