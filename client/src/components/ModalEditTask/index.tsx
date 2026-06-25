import Modal from "@/components/Modal";
import { Priority, Status, Task, useUpdateTaskMutation } from "@/state/api";
import React, { useState, useEffect } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
};

const ModalEditTask = ({ isOpen, onClose, task }: Props) => {
  const [updateTask, { isLoading }] = useUpdateTaskMutation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>(Status.ToDo);
  const [priority, setPriority] = useState<Priority>(Priority.Backlog);
  const [tags, setTags] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [points, setPoints] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || Status.ToDo);
      setPriority(task.priority || Priority.Backlog);
      setTags(task.tags || "");
      setStartDate(task.startDate ? task.startDate.substring(0, 10) : "");
      setDueDate(task.dueDate ? task.dueDate.substring(0, 10) : "");
      setPoints(task.points !== undefined && task.points !== null ? task.points.toString() : "");
      setAssignedUserId(task.assignedUserId !== undefined && task.assignedUserId !== null ? task.assignedUserId.toString() : "");
    }
  }, [task, isOpen]);

  if (!task) return null;

  const handleSubmit = async () => {
    if (!title) return;

    await updateTask({
      id: task.id,
      title,
      description: description || null,
      status,
      priority,
      tags: tags || null,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      points: points ? parseInt(points) : null,
      assignedUserId: assignedUserId ? parseInt(assignedUserId) : null,
    });
    onClose();
  };

  const isFormValid = () => {
    return title;
  };

  const selectStyles =
    "mb-4 block w-full rounded border border-gray-300 px-3 py-2 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Edit Task">
      <form
        className="mt-4 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          className={inputStyles}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className={inputStyles}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Status</label>
            <select
              className={selectStyles}
              value={status}
              onChange={(e) =>
                setStatus(Status[e.target.value as keyof typeof Status])
              }
            >
              <option value={Status.ToDo}>To Do</option>
              <option value={Status.WorkInProgress}>Work In Progress</option>
              <option value={Status.UnderReview}>Under Review</option>
              <option value={Status.Completed}>Completed</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Priority</label>
            <select
              className={selectStyles}
              value={priority}
              onChange={(e) =>
                setPriority(Priority[e.target.value as keyof typeof Priority])
              }
            >
              <option value={Priority.Urgent}>Urgent</option>
              <option value={Priority.High}>High</option>
              <option value={Priority.Medium}>Medium</option>
              <option value={Priority.Low}>Low</option>
              <option value={Priority.Backlog}>Backlog</option>
            </select>
          </div>
        </div>
        <input
          type="text"
          className={inputStyles}
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Start Date
            </label>
            <input
              type="date"
              className={inputStyles}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              End Date (Due Date)
            </label>
            <input
              type="date"
              className={inputStyles}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-2">
          <input
            type="number"
            className={inputStyles}
            placeholder="Points"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
          <input
            type="text"
            className={inputStyles}
            placeholder="Assigned User ID"
            value={assignedUserId}
            onChange={(e) => setAssignedUserId(e.target.value)}
          />
        </div>
        
        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-blue-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
            !isFormValid() || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!isFormValid() || isLoading}
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalEditTask;
