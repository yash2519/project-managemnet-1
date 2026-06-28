import React from "react";
import { TaskPrediction } from "@/types";
import { Lock } from "lucide-react";

type Props = {
  allAtRiskTasks: TaskPrediction[];
  selectedTaskId: number | null;
};

const BlockedTasksCard = ({ allAtRiskTasks, selectedTaskId }: Props) => {
  const blockedTasks = allAtRiskTasks.filter(t => t.reasons.some(r => r.toLowerCase().includes("block")));

  if (!blockedTasks || blockedTasks.length === 0) return null;

  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm dark:border-dark-secondary dark:bg-dark-secondary">
      <div className="border-b border-gray-100 p-4 dark:border-dark-tertiary">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Blocked Tasks</h3>
        <p className="text-xs text-gray-500 dark:text-neutral-400">Waiting on incomplete dependencies</p>
      </div>
      <div className="flex max-h-60 flex-col overflow-y-auto p-2">
        {blockedTasks.map(task => (
          <div 
            key={task.taskId} 
            className={`m-1 flex items-center justify-between rounded-lg border p-3 transition-colors ${
              selectedTaskId === task.taskId 
                ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20" 
                : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100 dark:border-dark-tertiary dark:bg-dark-tertiary dark:hover:border-gray-700"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800 dark:text-white">{task.title}</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-neutral-500">{task.status || "To Do"}</span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                  <Lock className="h-3 w-3" />
                  <span>Blocked</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlockedTasksCard;
