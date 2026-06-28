import React from "react";
import { useGetAffectedDownstreamTasksQuery } from "@/state/api";
import { GitMerge } from "lucide-react";

type Props = {
  projectId: number;
  taskId: number;
};

const AffectedTasksCard = ({ projectId, taskId }: Props) => {
  const { data, isLoading } = useGetAffectedDownstreamTasksQuery({ projectId, taskId });

  if (isLoading) {
    return (
      <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm dark:border-dark-secondary dark:bg-dark-secondary">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
      </div>
    );
  }

  const affected = data?.affectedTasks || [];

  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm dark:border-dark-secondary dark:bg-dark-secondary">
      <div className="border-b border-gray-100 p-4 dark:border-dark-tertiary">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Affected Downstream Tasks</h3>
        <p className="text-xs text-gray-500 dark:text-neutral-400">If the selected task is delayed, these are impacted</p>
      </div>
      <div className="flex max-h-60 flex-col overflow-y-auto p-4">
        {affected.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-gray-400">
            <GitMerge className="mb-2 h-6 w-6 opacity-50" />
            <span className="text-xs">No downstream dependencies</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {affected.map(tId => (
              <div key={tId} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Task #{tId}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AffectedTasksCard;
