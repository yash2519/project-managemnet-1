import React, { useState } from "react";
import { Filter, Users, Calendar, Hash } from "lucide-react";
import { AnalysisFilters } from "@/types";

type Props = {
  onApplyFilters: (filters: AnalysisFilters) => void;
  isGenerating: boolean;
};

const StandupFilterBar = ({ onApplyFilters, isGenerating }: Props) => {
  const [filters, setFilters] = useState<AnalysisFilters>({});
  
  // Local state for inputs to avoid immediate re-renders of the parent
  const [userId, setUserId] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [sprintId, setSprintId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [taskIds, setTaskIds] = useState<string>("");

  const handleApply = () => {
    const newFilters: AnalysisFilters = {};
    
    if (userId) newFilters.userId = Number(userId);
    if (teamId) newFilters.teamId = Number(teamId);
    if (sprintId) newFilters.sprintId = Number(sprintId);
    if (startDate) newFilters.startDate = startDate;
    if (endDate) newFilters.endDate = endDate;
    if (taskIds) {
      newFilters.taskIds = taskIds.split(",").map((id) => Number(id.trim())).filter((id) => !isNaN(id));
    }
    
    setFilters(newFilters);
    onApplyFilters(newFilters);
  };

  const handleClear = () => {
    setUserId("");
    setTeamId("");
    setSprintId("");
    setStartDate("");
    setEndDate("");
    setTaskIds("");
    setFilters({});
    onApplyFilters({});
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-secondary dark:bg-dark-secondary">
      <div className="mb-3 flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
        <Filter className="h-4 w-4" />
        <h3>Analysis Filters</h3>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {/* User Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400">User ID</label>
          <div className="relative">
            <Users className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              placeholder="e.g. 1"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-transparent py-1.5 pl-8 pr-2 text-sm focus:border-blue-500 focus:outline-none dark:border-dark-tertiary dark:text-white"
            />
          </div>
        </div>

        {/* Team Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400">Team ID</label>
          <div className="relative">
            <Users className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              placeholder="e.g. 1"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-transparent py-1.5 pl-8 pr-2 text-sm focus:border-blue-500 focus:outline-none dark:border-dark-tertiary dark:text-white"
            />
          </div>
        </div>

        {/* Sprint Filter */}
        <div className="flex flex-col gap-1 opacity-60">
          <label className="text-xs text-gray-500 dark:text-gray-400" title="Coming Soon: Sprint Management is not yet implemented.">
            Sprint ID (Disabled)
          </label>
          <div className="relative">
            <Hash className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              disabled
              placeholder="N/A"
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
              className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 py-1.5 pl-8 pr-2 text-sm dark:border-dark-tertiary dark:bg-gray-800 dark:text-gray-500"
            />
          </div>
        </div>

        {/* Task IDs */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400">Task IDs</label>
          <div className="relative">
            <Hash className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="e.g. 1, 2, 3"
              value={taskIds}
              onChange={(e) => setTaskIds(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-transparent py-1.5 pl-8 pr-2 text-sm focus:border-blue-500 focus:outline-none dark:border-dark-tertiary dark:text-white"
            />
          </div>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400">Start Date</label>
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-transparent py-1.5 pl-8 pr-2 text-sm focus:border-blue-500 focus:outline-none dark:border-dark-tertiary dark:text-white dark:[color-scheme:dark]"
            />
          </div>
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 dark:text-gray-400">End Date</label>
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-transparent py-1.5 pl-8 pr-2 text-sm focus:border-blue-500 focus:outline-none dark:border-dark-tertiary dark:text-white dark:[color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          onClick={handleClear}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-tertiary"
        >
          Clear Filters
        </button>
        <button
          onClick={handleApply}
          disabled={isGenerating}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Apply Filters & Generate"}
        </button>
      </div>
    </div>
  );
};

export default StandupFilterBar;
