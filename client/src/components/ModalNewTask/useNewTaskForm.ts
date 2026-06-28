import { useState } from "react";
import { Priority, Status, useCreateTaskMutation, useGetAuthUserQuery, useGenerateAIBreakdownMutation, AIBreakdownSubtask } from "@/state/api";
import { formatISO } from "date-fns";

export function useNewTaskForm(id: string | null, onClose: () => void) {
  const [createTask, { isLoading }] = useCreateTaskMutation();
  const [generateAIBreakdown, { isLoading: isAILoading }] = useGenerateAIBreakdownMutation();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>(Status.ToDo);
  const [priority, setPriority] = useState<Priority>(Priority.Backlog);
  const [tags, setTags] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [minTasks, setMinTasks] = useState<number>(3);
  const [maxTasks, setMaxTasks] = useState<number>(7);

  const [aiSubtasks, setAiSubtasks] = useState<AIBreakdownSubtask[] | null>(null);
  const [aiError, setAiError] = useState("");

  const { data: currentUser } = useGetAuthUserQuery({});
  const authorUserId = (currentUser?.userId || currentUser?.userDetails?.userId)?.toString() || "";

  const isFormValid = () => {
    return title && authorUserId && (id !== null || projectId);
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    const formattedStartDate = startDate ? formatISO(new Date(startDate), {
      representation: "complete",
    }) : undefined;
    const formattedDueDate = dueDate ? formatISO(new Date(dueDate), {
      representation: "complete",
    }) : undefined;

    const targetProjectId = id !== null ? Number(id) : Number(projectId);

    if (aiSubtasks && aiSubtasks.length > 0) {
       // 1. Create the parent task first
       await createTask({
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

       // 2. Create the generated subtasks
       for (const subtask of aiSubtasks) {
          await createTask({
            title: subtask.title,
            description: subtask.description,
            status: Status.ToDo,
            priority: subtask.priority ? Priority[subtask.priority as keyof typeof Priority] || Priority.Medium : Priority.Medium,
            tags: subtask.tags || "AI-Generated",
            startDate: subtask.startDate ? formatISO(new Date(subtask.startDate), { representation: "complete" }) : formattedStartDate,
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
            projectId: targetProjectId,
            minTasks,
            maxTasks
        }).unwrap();
        setAiSubtasks(result);
    } catch (err: any) {
        console.error("Failed to generate AI breakdown", err);
        setAiError(`Failed to generate AI breakdown: ${err.data?.message || err.message || "Unknown error"}`);
    }
  };

  return {
    state: {
      title, description, status, priority, tags, startDate, dueDate,
      assignedUserId, projectId, minTasks, maxTasks, aiSubtasks, aiError,
      isLoading, isAILoading
    },
    setters: {
      setTitle, setDescription, setStatus, setPriority, setTags, setStartDate,
      setDueDate, setAssignedUserId, setProjectId, setMinTasks, setMaxTasks,
      setAiSubtasks, setAiError
    },
    handlers: {
      handleSubmit,
      handleAIBreakdown,
      isFormValid
    }
  };
}
