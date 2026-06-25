import Modal from "@/components/Modal";
import { Task, useUpdateTaskMutation, useGetUsersQuery } from "@/state/api";
import React, { useState, useEffect } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
};

const ModalAssignTask = ({ isOpen, onClose, task }: Props) => {
  const [updateTask, { isLoading }] = useUpdateTaskMutation();
  const { data: users, isLoading: usersLoading } = useGetUsersQuery();
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    if (task) {
      setSelectedUserId(
        task.assignedUserId !== undefined && task.assignedUserId !== null
          ? task.assignedUserId.toString()
          : ""
      );
    }
  }, [task, isOpen]);

  if (!task) return null;

  const handleSubmit = async () => {
    await updateTask({
      id: task.id,
      assignedUserId: selectedUserId ? parseInt(selectedUserId) : null,
    });
    onClose();
  };

  const selectStyles =
    "mb-4 block w-full rounded border border-gray-300 px-3 py-2 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Assign Task">
      <form
        className="mt-4 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Assignee
          </label>
          {usersLoading ? (
            <div className="text-sm text-gray-500">Loading users...</div>
          ) : (
            <select
              className={selectStyles}
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users?.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.username} ({user.email})
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="submit"
          className="focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-blue-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
          disabled={isLoading || usersLoading}
        >
          {isLoading ? "Saving..." : "Assign User"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalAssignTask;
