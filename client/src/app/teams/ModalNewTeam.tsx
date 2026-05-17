import Modal from "@/components/Modal";
import { useCreateTeamMutation, useGetAuthUserQuery } from "@/state/api";
import React, { useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ModalNewTeam = ({ isOpen, onClose }: Props) => {
  const [createTeam, { isLoading }] = useCreateTeamMutation();
  const { data: currentUser } = useGetAuthUserQuery({});
  const userId = currentUser?.userId || currentUser?.userDetails?.userId || null;
  
  const [teamName, setTeamName] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [leadUserId, setLeadUserId] = useState("");

  const handleSubmit = async () => {
    if (!teamName || !scopeOfWork || !leadUserId) return;

    await createTeam({
      teamName,
      scopeOfWork,
      productOwnerUserId: parseInt(leadUserId),
    });
    
    // reset form
    setTeamName("");
    setScopeOfWork("");
    setLeadUserId("");
    onClose();
  };

  const isFormValid = () => {
    return teamName && scopeOfWork && leadUserId;
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Create New Team">
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
          placeholder="Team Name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
        <textarea
          className={inputStyles}
          placeholder="Scope of Work"
          value={scopeOfWork}
          onChange={(e) => setScopeOfWork(e.target.value)}
        />
        <input
          type="number"
          className={inputStyles}
          placeholder="Lead User ID"
          value={leadUserId}
          onChange={(e) => setLeadUserId(e.target.value)}
        />
        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-blue-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
            !isFormValid() || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!isFormValid() || isLoading}
        >
          {isLoading ? "Creating..." : "Create Team"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewTeam;
