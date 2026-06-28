import Modal from "@/components/Modal";
import { Priority, Status } from "@/state/api";
import React from "react";
import { Sparkles } from "lucide-react";
import { useNewTaskForm } from "./useNewTaskForm";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  id?: string | null;
};

const ModalNewTask = ({ isOpen, onClose, id = null }: Props) => {
  const { state, setters, handlers } = useNewTaskForm(id, onClose);

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
          handlers.handleSubmit();
        }}
      >
        <input
          type="text"
          className={inputStyles}
          placeholder="Title (e.g. Build Auth System)"
          value={state.title}
          onChange={(e) => { setters.setTitle(e.target.value); setters.setAiError(""); }}
        />
        <textarea
          className={inputStyles}
          placeholder="Description"
          value={state.description}
          onChange={(e) => setters.setDescription(e.target.value)}
        />
        
        {id === null && (
          <input
            type="text"
            className={inputStyles}
            placeholder="ProjectId"
            value={state.projectId}
            onChange={(e) => { setters.setProjectId(e.target.value); setters.setAiError(""); }}
          />
        )}

        {/* AI Breakdown Section */}
        <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Min Subtasks</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="20" 
                        value={state.minTasks} 
                        onChange={(e) => setters.setMinTasks(parseInt(e.target.value) || 3)}
                        className="w-16 rounded border border-gray-300 p-1 text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Max Subtasks</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="20" 
                        value={state.maxTasks} 
                        onChange={(e) => setters.setMaxTasks(parseInt(e.target.value) || 7)}
                        className="w-16 rounded border border-gray-300 p-1 text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white"
                    />
                </div>
            </div>
            {state.aiError && <span className="text-sm text-red-500">{state.aiError}</span>}
            <button
                type="button"
                onClick={handlers.handleAIBreakdown}
                disabled={state.isAILoading}
                className="flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
                <Sparkles size={16} />
                {state.isAILoading ? "AI is thinking..." : "AI Breakdown"}
            </button>
        </div>

        {state.aiSubtasks && state.aiSubtasks.length > 0 ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-dark-secondary">
                <h4 className="mb-2 font-semibold text-gray-800 dark:text-gray-200">AI Generated Subtasks:</h4>
                <div className="max-h-60 space-y-3 overflow-y-auto pr-2">
                    {state.aiSubtasks.map((task, idx) => (
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
                    onClick={() => setters.setAiSubtasks(null)}
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
                    value={state.status}
                    onChange={(e) =>
                    setters.setStatus(Status[e.target.value as keyof typeof Status])
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
                    value={state.priority}
                    onChange={(e) =>
                    setters.setPriority(Priority[e.target.value as keyof typeof Priority])
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
                value={state.tags}
                onChange={(e) => setters.setTags(e.target.value)}
                />

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-2">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date
                    </label>
                    <input
                    type="date"
                    className={inputStyles}
                    value={state.startDate}
                    onChange={(e) => setters.setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Date (Due Date)
                    </label>
                    <input
                    type="date"
                    className={inputStyles}
                    value={state.dueDate}
                    onChange={(e) => setters.setDueDate(e.target.value)}
                    />
                </div>
                </div>

                <input
                type="text"
                className={inputStyles}
                placeholder="Assigned User ID"
                value={state.assignedUserId}
                onChange={(e) => setters.setAssignedUserId(e.target.value)}
                />
            </>
        )}

        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-blue-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
            !handlers.isFormValid() || state.isLoading || state.isAILoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!handlers.isFormValid() || state.isLoading || state.isAILoading}
        >
          {state.isLoading ? "Saving..." : (state.aiSubtasks ? "Approve & Create All Subtasks" : "Create Task")}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewTask;
