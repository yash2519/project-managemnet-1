import { useMemo } from "react";
import { Project, Task } from "@/state/api";
import { ClipboardList, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { PRIORITY_COLORS, STATUS_COLORS } from "./_components/types";

export function useDashboardMetrics(tasks: Task[] | undefined, projects: Project[] | undefined) {
  return useMemo(() => {
    const safeTasks = tasks || [];
    const safeProjects = projects || [];

    const totalTasks = safeTasks.length;
    const completedTasks = safeTasks.filter((t) => t.status === "Completed").length;
    const pendingTasks = safeTasks.filter((t) => t.status !== "Completed").length;
    const overdueTasks = safeTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed"
    ).length;

    const priorityCount = safeTasks.reduce((acc: Record<string, number>, task: Task) => {
      const p = task.priority as string;
      if (p) acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});
    
    const taskDistribution = ["Low", "Medium", "High", "Urgent"]
      .filter((k) => priorityCount[k] !== undefined)
      .map((k) => ({ name: k, count: priorityCount[k], fill: PRIORITY_COLORS[k] }));
      
    const maxPriorityCount = taskDistribution.length > 0 ? Math.max(...taskDistribution.map((d) => d.count)) : 0;
    const yAxisMax = maxPriorityCount + 2;
    const yAxisTicks = Array.from({ length: yAxisMax + 1 }, (_, i) => i);

    const statusMapping: Record<string, string> = {
      Completed: "Completed", 
      "Work In Progress": "In Progress", 
      "Under Review": "In Progress", 
      "To Do": "Pending",
    };
    
    const statusCount = safeTasks.reduce((acc: Record<string, number>, task: Task) => {
      let mapped = statusMapping[task.status || ""] || "Pending";
      if (mapped !== "Completed" && task.dueDate && new Date(task.dueDate) < new Date()) mapped = "Delayed";
      acc[mapped] = (acc[mapped] || 0) + 1;
      return acc;
    }, {});
    
    const taskStatusData = ["Completed", "In Progress", "Pending", "Delayed"]
      .filter((k) => statusCount[k])
      .map((k) => ({ name: k, count: statusCount[k], fill: STATUS_COLORS[k] }));

    const projectMap = safeProjects.reduce((acc: Record<number, string>, p: Project) => {
      acc[p.id] = p.name;
      return acc;
    }, {});

    const kpis = [
      { label: "Total Tasks",     value: totalTasks,     color: "blue",  icon: ClipboardList, trend: "+12%",                                   trendUp: true },
      { label: "Pending Tasks",   value: pendingTasks,   color: "amber", icon: Clock,         trend: `${pendingTasks} active`,                  trendUp: false },
      { label: "Completed Tasks", value: completedTasks, color: "green", icon: CheckCircle2,  trend: "On track",                                trendUp: true },
      { label: "Overdue Tasks",   value: overdueTasks,   color: "red",   icon: AlertTriangle, trend: overdueTasks > 0 ? "Needs attention" : "All clear", trendUp: overdueTasks === 0 },
    ];

    return {
      safeTasks,
      safeProjects,
      totalTasks,
      taskDistribution,
      yAxisMax,
      yAxisTicks,
      taskStatusData,
      projectMap,
      kpis,
    };
  }, [tasks, projects]);
}
