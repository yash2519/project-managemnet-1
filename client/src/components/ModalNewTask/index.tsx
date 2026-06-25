import Modal from "@/components/Modal";
import { Priority, Status, useCreateTaskMutation, useGetAuthUserQuery, useGenerateAIBreakdownMutation, AIBreakdownSubtask } from "@/state/api";
import React, { useState } from "react";
import { formatISO } from "date-fns";
import { Sparkles } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  id?: string | null;
};

const ModalNewTask = ({ isOpen, onClose, id = null }: Props) => {
  const [createTask, { isLoading }] = useCreateTaskMutation();
  const [generateAIBreakdown, { isLoading: isAILoading }] = useGenerateAIBreakdownMutation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>(Status.ToDo);
  const [priority, setPriority] = useState<Priority>(Priority.Backlog);
  const [tags, setTags] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const { data: currentUser } = useGetAuthUserQuery({});
  const authorUserId = (currentUser?.userId || currentUser?.userDetails?.userId)?.toString() || "";
  const [assignedUserId, setAssignedUserId] = useState("");
  const [projectId, setProjectId] = useState("");

  const [aiSubtasks, setAiSubtasks] = useState<AIBreakdownSubtask[] | null>(null);
  const [aiError, setAiError] = useState("");

  const handleSubmit = async () => {
    if (!title || !authorUserId || !(id !== null || projectId)) return;

    const formattedStartDate = startDate ? formatISO(new Date(startDate), {
      representation: "complete",
    }) : undefined;
    const formattedDueDate = dueDate ? formatISO(new Date(dueDate), {
      representation: "complete",
    }) : undefined;

    const targetProjectId = id !== null ? Number(id) : Number(projectId);

    if (aiSubtasks && aiSubtasks.length > 0) {
       // 1. Create the parent task first
       const parentTask = await createTask({
            title,
            description,
            status: Status.ToDo,
            priority: Priority.Medium,
            tags: "AI-Parent",
            startDate: formattedStartDate,
            dueDate: formattedDueDate,
            authorUserId: parseInt(authorUserId),
            assignedUserId: parseInt(authorUserId), // Assign parent to creator
            projectId: targetProjectId,
       }).unwrap();

       // 2. Create the generated subtasks (we can link them to parentTask.id if the schema adds parentTaskId later)
       for (const subtask of aiSubtasks) {
          await createTask({
            title: subtask.title,
            description: subtask.description,
            status: Status.ToDo,
            priority: subtask.priority ? Priority[subtask.priority as keyof typeof Priority] || Priority.Medium : Priority.Medium,
            tags: "AI-Generated",
            startDate: formattedStartDate,
            dueDate: subtask.deadline ? formatISO(new Date(subtask.deadline), { representation: "complete" }) : formattedDueDate,
            points: subtask.points,
            authorUserId: parseInt(authorUserId),
            assignedUserId: subtask.assignedUserId,
            projectId: targetProjectId,
          });
       }
       onClose();
       return;
    }

    // Standard single task creation
    await createTask({
      title,
      description,
      status,
      priority,
      tags,
      startDate: formattedStartDate,
      dueDate: formattedDueDate,
      authorUserId: parseInt(authorUserId),
      assignedUserId: parseInt(assignedUserId),
      projectId: targetProjectId,
    });
    onClose();
  };

  const handleAIBreakdown = async () => {
    setAiError("");
    const targetProjectId = id !== null ? Number(id) : Number(projectId);
    
    if (!title && !targetProjectId) {
        setAiError("Task title and Project ID are required for AI Breakdown.");
        return;
    } else if (!title) {
        setAiError("Task title is required for AI Breakdown.");
        return;
    } else if (!targetProjectId) {
        setAiError("Project ID is required for AI Breakdown.");
        return;
    }

    try {
        const result = await generateAIBreakdown({
            title,
            description,
            projectId: targetProjectId
        }).unwrap();
        setAiSubtasks(result);
    } catch (err: any) {
        console.error("Failed to generate AI breakdown", err);
        setAiError(`Failed to generate AI breakdown: ${err.data?.message || err.message || "Unknown error"}`);
    }
  };

  const isFormValid = () => {
    return title && authorUserId && (id !== null || projectId);
  };

  const selectStyles =
    "mb-4 block w-full rounded border border-gray-300 px-3 py-2 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Create New Task">
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
          placeholder="Title (e.g. Build Auth System)"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setAiError(""); }}
        />
        <textarea
          className={inputStyles}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        
        {id === null && (
          <input
            type="text"
            className={inputStyles}
            placeholder="ProjectId"
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setAiError(""); }}
          />
        )}

        {/* AI Breakdown Section */}
        <div className="flex flex-col items-end gap-2">
            {aiError && <span className="text-sm text-red-500">{aiError}</span>}
            <button
                type="button"
                onClick={handleAIBreakdown}
                disabled={isAILoading}
                className="flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
                <Sparkles size={16} />
                {isAILoading ? "AI is thinking..." : "AI Breakdown"}
            </button>
        </div>

        {aiSubtasks && aiSubtasks.length > 0 ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-dark-secondary">
                <h4 className="mb-2 font-semibold text-gray-800 dark:text-gray-200">AI Generated Subtasks:</h4>
                <div className="max-h-60 space-y-3 overflow-y-auto pr-2">
                    {aiSubtasks.map((task, idx) => (
                        <div key={idx} className="rounded bg-white p-3 shadow-sm dark:bg-dark-tertiary">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900 dark:text-white">{task.title}</span>
                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{task.points} pts</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Assigned to User ID: {task.assignedUserId}
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    className="mt-4 text-sm text-red-500 hover:underline"
                    onClick={() => setAiSubtasks(null)}
                >
                    Discard AI Suggestions
                </button>
            </div>
        ) : (
            <>
                {/* Standard Form fields when AI is not used */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-2">
                <select
                    className={selectStyles}
                    value={status}
                    onChange={(e) =>
                    setStatus(Status[e.target.value as keyof typeof Status])
                    }
                >
                    <option value="">Select Status</option>
                    <option value={Status.ToDo}>To Do</option>
                    <option value={Status.WorkInProgress}>Work In Progress</option>
                    <option value={Status.UnderReview}>Under Review</option>
                    <option value={Status.Completed}>Completed</option>
                </select>
                <select
                    className={selectStyles}
                    value={priority}
                    onChange={(e) =>
                    setPriority(Priority[e.target.value as keyof typeof Priority])
                    }
                >
                    <option value="">Select Priority</option>
                    <option value={Priority.Urgent}>Urgent</option>
                    <option value={Priority.High}>High</option>
                    <option value={Priority.Medium}>Medium</option>
                    <option value={Priority.Low}>Low</option>
                    <option value={Priority.Backlog}>Backlog</option>
                </select>
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

                <input
                type="text"
                className={inputStyles}
                placeholder="Assigned User ID"
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                />
            </>
        )}

        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-blue-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
            !isFormValid() || isLoading || isAILoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!isFormValid() || isLoading || isAILoading}
        >
          {isLoading ? "Saving..." : (aiSubtasks ? "Approve & Create All Subtasks" : "Create Task")}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewTask;
