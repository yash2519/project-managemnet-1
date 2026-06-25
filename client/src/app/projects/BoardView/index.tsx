import { useAppSelector } from "@/app/redux";
import { useGetAuthUserQuery, useGetTasksQuery, useUpdateTaskStatusMutation, useGetProjectByIdQuery } from "@/state/api";
import React, { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Task as TaskType } from "@/state/api";
import { EllipsisVertical, MessageSquareMore, Plus } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import { formatDate } from "@/lib/utils";

type BoardProps = {
  id: string;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  searchTerm?: string;
};

const taskStatus = ["To Do", "Work In Progress", "Under Review", "Completed"];

const BoardView = ({ id, setIsModalNewTaskOpen, searchTerm = "" }: BoardProps) => {
  const {
    data: tasks,
    isLoading,
    error,
  } = useGetTasksQuery({ projectId: Number(id) });
  const [updateTaskStatus] = useUpdateTaskStatusMutation();

  const moveTask = (taskId: number, toStatus: string) => {
    updateTaskStatus({ taskId, status: toStatus });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred while fetching tasks</div>;

  const filteredTasks = tasks?.filter((task) =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
        {taskStatus.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={filteredTasks || []}
            moveTask={moveTask}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
          />
        ))}
      </div>
    </DndProvider>
  );
};

type TaskColumnProps = {
  status: string;
  tasks: TaskType[];
  moveTask: (taskId: number, toStatus: string) => void;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
};

const TaskColumn = ({
  status,
  tasks,
  moveTask,
  setIsModalNewTaskOpen,
}: TaskColumnProps) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "task",
    drop: (item: { id: number }) => moveTask(item.id, status),
    collect: (monitor: any) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const tasksCount = tasks.filter((task) => task.status === status).length;

  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const statusColor: any = {
    "To Do": "#2563EB",
    "Work In Progress": "#059669",
    "Under Review": "#D97706",
    Completed: isDarkMode ? "#FFFFFF" : "#000000",
  };

  return (
    <div
      ref={(instance) => {
        drop(instance);
      }}
      className={`sl:py-4 rounded-lg py-2 xl:px-2 ${isOver ? "bg-blue-100 dark:bg-neutral-900/50" : ""}`}
    >
      <div className="mb-3 flex w-full">
        <div
          className={`w-2 !bg-[${statusColor[status]}] rounded-s-lg`}
          style={{ backgroundColor: statusColor[status] }}
        />
        <div className="flex w-full items-center justify-between rounded-e-lg bg-white px-5 py-4 dark:bg-dark-secondary">
          <h3 className="flex items-center text-lg font-semibold dark:text-white">
            {status}{" "}
            <span
              className="ml-2 inline-block rounded-full bg-gray-200 p-1 text-center text-sm leading-none dark:bg-dark-tertiary"
              style={{ width: "1.5rem", height: "1.5rem" }}
            >
              {tasksCount}
            </span>
          </h3>
          <div className="flex items-center gap-1">
            <button className="flex h-6 w-5 items-center justify-center dark:text-neutral-500">
              <EllipsisVertical size={26} />
            </button>
            <button
              className="flex h-6 w-6 items-center justify-center rounded bg-gray-200 dark:bg-dark-tertiary dark:text-white"
              onClick={() => setIsModalNewTaskOpen(true)}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {tasks
        .filter((task) => task.status === status)
        .map((task) => (
          <Task key={task.id} task={task} />
        ))}
    </div>
  );
};

type TaskProps = {
  task: TaskType;
};

const Task = ({ task }: TaskProps) => {
  const { data: currentUser } = useGetAuthUserQuery({});
  const currentUserId = currentUser?.userId ?? null;
  const { data: project } = useGetProjectByIdQuery(task.projectId);

  const isOwner = project?.ownerId === currentUserId;
  const isAssigned = task.assignedUserId === currentUserId;

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "task",
    item: { id: task.id },
    canDrag: () => {
      return isOwner || isAssigned;
    },
    collect: (monitor: any) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [isOwner, isAssigned]);

  const [showAssignees, setShowAssignees] = useState(false);

  const taskTagsSplit = task.tags ? task.tags.split(",") : [];

  const formattedStartDate = task.startDate
    ? formatDate(task.startDate)
    : "";
  const formattedDueDate = task.dueDate
    ? formatDate(task.dueDate)
    : "";

  const numberOfComments = (task.comments && task.comments.length) || 0;

  const PriorityTag = ({ priority }: { priority: TaskType["priority"] }) => (
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
    <div
      ref={(instance) => {
        drag(instance);
      }}
      className={`mb-4 rounded-md bg-white shadow dark:bg-dark-secondary ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
    >
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

export default BoardView;
