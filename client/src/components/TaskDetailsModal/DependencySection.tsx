import React, { useState } from "react";
import {
  Task,
  TaskDependency,
  DependencyType,
  DependencyStatus,
  useGetTaskDependenciesQuery,
  useAddTaskDependencyMutation,
  useRemoveTaskDependencyMutation,
  useGetTasksQuery,
} from "@/state/api";

type Props = {
  task: Task;
};

const DependencySection = ({ task }: Props) => {
  const { data: dependencies, isLoading } = useGetTaskDependenciesQuery({
    projectId: task.projectId,
    taskId: task.id,
  });

  const { data: allTasks } = useGetTasksQuery({ projectId: task.projectId });

  const [addTaskDependency] = useAddTaskDependencyMutation();
  const [removeTaskDependency] = useRemoveTaskDependencyMutation();

  const [isAdding, setIsAdding] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | "">("");
  const [selectedType, setSelectedType] = useState<DependencyType>(DependencyType.DEPENDS_ON);
  const [errorMsg, setErrorMsg] = useState("");

  if (isLoading) return <div className="text-xs text-gray-500">Loading dependencies...</div>;

  const handleAddDependency = async () => {
    if (!selectedTaskId) return;
    setErrorMsg("");

    try {
      await addTaskDependency({
        projectId: task.projectId,
        taskId: task.id,
        type: selectedType,
        successorId: selectedType === DependencyType.BLOCKED_BY ? task.id : Number(selectedTaskId),
        predecessorId: selectedType === DependencyType.BLOCKED_BY ? Number(selectedTaskId) : task.id,
      }).unwrap();
      setIsAdding(false);
      setSelectedTaskId("");
    } catch (err: any) {
      setErrorMsg(err?.data?.message || "Failed to add dependency");
    }
  };

  const handleRemove = async (dependencyId: number) => {
    try {
      await removeTaskDependency({
        projectId: task.projectId,
        taskId: task.id,
        dependencyId,
      });
    } catch (err) {
      console.error("Failed to remove dependency", err);
    }
  };

  const availableTasks = allTasks?.filter((t) => t.id !== task.id) || [];

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
          Dependencies
        </span>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {isAdding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {errorMsg && <div className="text-xs text-red-500 mb-2">{errorMsg}</div>}

      {isAdding && (
        <div className="flex flex-col gap-2 mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="flex gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DependencyType)}
              className="text-xs rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 p-1"
            >
              <option value={DependencyType.DEPENDS_ON}>Blocks</option>
              <option value={DependencyType.BLOCKED_BY}>Is Blocked By</option>
              <option value={DependencyType.RELATED_TO}>Related To</option>
            </select>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(Number(e.target.value))}
              className="text-xs flex-1 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-900 p-1"
            >
              <option value="" disabled>Select Task</option>
              {availableTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddDependency}
            disabled={!selectedTaskId}
            className="self-end bg-blue-600 text-white text-xs px-2 py-1 rounded disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}

      <div className="space-y-2">
        {dependencies?.predecessors && dependencies.predecessors.length > 0 && (
          <div>
            <div className="text-[10px] uppercase text-gray-500 mb-1">Blocked By (Predecessors)</div>
            {dependencies.predecessors.map((dep) => (
              <div key={dep.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-2 rounded text-sm">
                <span className="truncate flex-1 text-gray-800 dark:text-gray-200">{dep.predecessor?.title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full mr-2 ${dep.status === DependencyStatus.READY ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {dep.status}
                </span>
                <button onClick={() => handleRemove(dep.id)} className="text-gray-400 hover:text-red-500">×</button>
              </div>
            ))}
          </div>
        )}

        {dependencies?.successors && dependencies.successors.length > 0 && (
          <div>
            <div className="text-[10px] uppercase text-gray-500 mb-1">Blocks (Successors)</div>
            {dependencies.successors.map((dep) => (
              <div key={dep.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-2 rounded text-sm">
                <span className="truncate flex-1 text-gray-800 dark:text-gray-200">{dep.successor?.title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full mr-2 ${dep.status === DependencyStatus.SATISFIED ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                  {dep.status}
                </span>
                <button onClick={() => handleRemove(dep.id)} className="text-gray-400 hover:text-red-500">×</button>
              </div>
            ))}
          </div>
        )}

        {(!dependencies?.predecessors?.length && !dependencies?.successors?.length) && (
           <span className="text-xs text-gray-500">No dependencies.</span>
        )}
      </div>
    </div>
  );
};

export default DependencySection;
