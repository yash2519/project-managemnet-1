"use client";

import {
  Priority,
  Project,
  Task,
  useGetAuthUserQuery,
  useGetProjectsQuery,
  useGetTasksByUserQuery,
  useUpdateTaskStatusMutation,
} from "@/state/api";
import type { PieLabelRenderProps } from "recharts";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAppSelector } from "../redux";
// DataGrid removed — replaced with custom table for full text visibility
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
import { format, isToday, isPast, isFuture, addDays } from "date-fns";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  UserPlus,
  CheckSquare,
  Calendar,
  TrendingUp,
  Zap,
  Loader2,
  Layout,
  ArrowRight,
} from "lucide-react";
import "./dashboard.css";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Helpers ──
const STATUS_PROGRESS: Record<string, number> = {
  "To Do": 0,
  "Work In Progress": 45,
  "Under Review": 75,
  Completed: 100,
};

const getStatusBadgeClass = (status?: string) => {
  switch (status) {
    case "Completed": return "db-badge db-badge-status-completed";
    case "Work In Progress": return "db-badge db-badge-status-in-progress";
    case "Under Review": return "db-badge db-badge-status-review";
    default: return "db-badge db-badge-status-pending";
  }
};

const getPriorityBadgeClass = (priority?: string) => {
  switch (priority) {
    case "Urgent": return "db-badge db-badge-priority-urgent";
    case "High": return "db-badge db-badge-priority-high";
    case "Medium": return "db-badge db-badge-priority-medium";
    case "Low": return "db-badge db-badge-priority-low";
    default: return "db-badge db-badge-priority-backlog";
  }
};

const getPriorityDot = (priority?: string) => {
  const colors: Record<string, string> = {
    Urgent: "#EF4444", High: "#F97316", Medium: "#F59E0B", Low: "#3B82F6",
  };
  return colors[priority || ""] || "#6B7280";
};

const getInitials = (name?: string) => {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

// ── Action Menu Component ──
const ActionMenu = ({ taskId, onMarkComplete }: { taskId: number; onMarkComplete: (id: number) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="action-menu-container" ref={ref}>
      <button className="action-menu-trigger" onClick={() => setOpen(!open)}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="action-menu-dropdown">
          <button className="action-menu-item" onClick={() => { alert("View Details"); setOpen(false); }}>
            <Eye size={14} /> View Details
          </button>
          <button className="action-menu-item" onClick={() => { alert("Edit Task"); setOpen(false); }}>
            <Edit3 size={14} /> Edit
          </button>
          <button className="action-menu-item" onClick={() => { alert("Assign Task"); setOpen(false); }}>
            <UserPlus size={14} /> Assign
          </button>
          <button className="action-menu-item" onClick={() => { onMarkComplete(taskId); setOpen(false); }}>
            <CheckSquare size={14} /> Mark Complete
          </button>
          <div className="action-menu-divider" />
          <button className="action-menu-item action-menu-item--danger" onClick={() => { alert("Delete Task"); setOpen(false); }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

// ── Custom Recharts Tooltip ──
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label || payload[0]?.name}</p>
      <p style={{ color: payload[0]?.payload?.fill || "#3B82F6" }}>
        {payload[0]?.value} {payload[0]?.value === 1 ? "task" : "tasks"}
      </p>
    </div>
  );
};

// ── Priority / Status Colors ──
const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "#EF4444", High: "#F97316", Medium: "#F59E0B", Low: "#3B82F6", Backlog: "#6B7280",
};
const STATUS_COLORS: Record<string, string> = {
  Completed: "#10B981", "In Progress": "#3B82F6", Pending: "#F59E0B", Delayed: "#EF4444",
};

// ══════════════════════════════════════
// ── HOMEPAGE COMPONENT ──
// ══════════════════════════════════════
const HomePage = () => {
  const router = useRouter();
  const { data: currentUser, isLoading: isAuthLoading } = useGetAuthUserQuery({});
  const userId = currentUser?.userId ?? null;
  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
  } = useGetTasksByUserQuery(userId || 0, { skip: userId === null });
  const { data: projects, isLoading: isProjectsLoading } = useGetProjectsQuery(
    { userId: userId || 0 },
    { skip: userId === null }
  );

  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const [updateTaskStatus] = useUpdateTaskStatusMutation();

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5,
  });

  const handleMarkComplete = useCallback(async (taskId: number) => {
    try {
      await updateTaskStatus({ taskId, status: "Completed" });
    } catch (e) {
      console.error("Failed to update task", e);
    }
  }, [updateTaskStatus]);

  // ── Loading State ──
  if (isAuthLoading || tasksLoading || isProjectsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-dark-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── KPI Metrics ──
  const safeTasks = tasks || [];
  const safeProjects = projects || [];
  const totalTasks = safeTasks.length;
  const completedTasks = safeTasks.filter((t) => t.status === "Completed").length;
  const pendingTasks = safeTasks.filter((t) => t.status !== "Completed").length;
  const overdueTasks = safeTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed"
  ).length;

  // ── Chart Data: Priority Distribution ──
  const priorityCount = safeTasks.reduce((acc: Record<string, number>, task: Task) => {
    const p = task.priority as string;
    if (p) acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});
  const taskDistribution = ["Low", "Medium", "High", "Urgent"]
    .filter((k) => priorityCount[k] !== undefined)
    .map((k) => ({ name: k, count: priorityCount[k], fill: PRIORITY_COLORS[k] }));
  const maxPriorityCount = Math.max(...taskDistribution.map((d) => d.count), 1);
  const yAxisMax = Math.ceil(maxPriorityCount * 1.5);

  // ── Chart Data: Task Status (Doughnut) ──
  const statusMapping: Record<string, string> = {
    Completed: "Completed", "Work In Progress": "In Progress", "Under Review": "In Progress", "To Do": "Pending",
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

  // ── Today's Tasks ──
  const todaysTasks = safeTasks.filter((t) => {
    if (t.status === "Completed") return false;
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return isToday(due) || isPast(due) || (isFuture(due) && due <= addDays(new Date(), 3));
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // ── Project lookup map (taskId → project name) ──
  const projectMap = safeProjects.reduce((acc: Record<number, string>, p: Project) => {
    acc[p.id] = p.name;
    return acc;
  }, {});

  const kpis = [
    { label: "Total Tasks", value: totalTasks, color: "blue", icon: ClipboardList, trend: "+12%", trendUp: true },
    { label: "Pending Tasks", value: pendingTasks, color: "amber", icon: Clock, trend: `${pendingTasks} active`, trendUp: false },
    { label: "Completed Tasks", value: completedTasks, color: "green", icon: CheckCircle2, trend: "On track", trendUp: true },
    { label: "Overdue Tasks", value: overdueTasks, color: "red", icon: AlertTriangle, trend: overdueTasks > 0 ? "Needs attention" : "All clear", trendUp: overdueTasks === 0 },
  ];

  const chartGridColor = isDarkMode ? "#2d3135" : "#f0f0f0";
  const chartTextColor = isDarkMode ? "#9ca3af" : "#6b7280";

  return (
    <div className="dashboard container h-full w-full bg-gray-100 bg-transparent p-8 dark:bg-dark-bg">
      <div className="mb-8 border-b border-gray-200 pb-4 dark:border-gray-700">
        <Header name={`Welcome back, ${currentUser?.username || "User"}`} />
        <p className="-mt-3 text-sm text-gray-500 dark:text-gray-400">
          Here is what&apos;s happening with your projects today.
        </p>
      </div>

      {totalTasks === 0 && safeProjects.length === 0 ? (
        <EmptyState 
          title="No projects yet"
          description="It looks like you haven't created any projects or tasks. Get started by visiting the onboarding page or creating your first project."
          ctaLabel="Get Started"
          onCta={() => router.push("/welcome")}
          icon={<Layout size={48} />}
        />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className={`kpi-card kpi-card--${kpi.color}`}>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{kpi.label}</span>
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{kpi.value}</span>
                  </div>
                  <div className={`kpi-icon kpi-icon--${kpi.color}`}>
                    <kpi.icon size={22} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Charts */}
            <div className="lg:col-span-2 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="dashboard-card p-6">
                <h3 className="mb-5 text-base font-semibold dark:text-white">Task Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={taskDistribution} margin={{ top: 10, right: 15, bottom: 20, left: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke={chartTextColor}
                      label={{ value: "Priority Level", position: "insideBottom", offset: -10, fill: chartTextColor, fontSize: 11 }}
                    />
                    <YAxis 
                      stroke={chartTextColor} 
                      domain={[0, yAxisMax]}
                      label={{ value: "Task Count", angle: -90, position: "insideLeft", offset: -5, fill: chartTextColor, fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {taskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="dashboard-card p-6 flex flex-col justify-between" style={{ overflow: 'visible' }}>
                <h3 className="mb-3 text-base font-semibold dark:text-white font-medium">Task Status</h3>
                <div style={{ position: 'relative' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                      <Pie 
                        data={taskStatusData} 
                        dataKey="count" 
                        cx="50%" 
                        cy="45%" 
                        innerRadius={55} 
                        outerRadius={80} 
                        paddingAngle={4}
                        label={({ name, percent, x, y, midAngle }: PieLabelRenderProps & { midAngle?: number }) =>
                          `${name}: ${(Number(percent) * 100).toFixed(0)}%`
                        }
                        labelLine={true}
                      >
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      {/* Center label: total task count */}
                      <text
                        x="50%"
                        y="43%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: 22, fontWeight: 700, fill: isDarkMode ? '#f3f4f6' : '#111827' }}
                      >
                        {totalTasks}
                      </text>
                      <text
                        x="50%"
                        y="43%"
                        dy={20}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: 10, fill: isDarkMode ? '#9ca3af' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      >
                        Total Tasks
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={28} iconSize={10} wrapperStyle={{ fontSize: '11px', color: chartTextColor, paddingTop: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Your Projects Widget */}
            <div className="dashboard-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold dark:text-white">Your Projects</h3>
                <Link href="/projects" className="text-xs text-blue-500 hover:underline">View all</Link>
              </div>
              <div className="flex flex-col gap-3">
                {safeProjects.slice(0, 5).map((project) => (
                  <Link 
                    key={project.id} 
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-blue-100 p-2 dark:bg-blue-900/30">
                        <Layout className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-medium dark:text-gray-200">{project.name}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </Link>
                ))}
                {safeProjects.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-400">No projects yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="dashboard-card p-6">
            <h3 className="mb-5 text-base font-semibold dark:text-white font-medium">Assigned Tasks</h3>
            {safeTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No tasks assigned to you yet.</p>
            ) : (
              <div className="assigned-tasks-table-wrapper">
                <table className="assigned-tasks-table">
                  <thead>
                    <tr>
                      <th style={{ width: '38%' }}>Task / Description</th>
                      <th style={{ width: '18%' }}>Project</th>
                      <th style={{ width: '12%' }}>Priority</th>
                      <th style={{ width: '16%' }}>Status</th>
                      <th style={{ width: '12%' }}>Due Date</th>
                      <th style={{ width: '4%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeTasks.map((task: Task) => {
                      const due = task.dueDate ? new Date(task.dueDate) : null;
                      const overdue = due && isPast(due) && task.status !== "Completed";
                      return (
                        <tr key={task.id} className="assigned-tasks-row">
                          <td>
                            <div className="task-name-cell">
                              <span className="task-title">{task.title}</span>
                              {task.description && (
                                <span className="task-desc">{task.description}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="task-project">
                              {task.projectId && projectMap[task.projectId]
                                ? projectMap[task.projectId]
                                : <span className="text-gray-400">—</span>}
                            </span>
                          </td>
                          <td>
                            <span className={getPriorityBadgeClass(task.priority as string)}>
                              {task.priority || "—"}
                            </span>
                          </td>
                          <td>
                            <span className={getStatusBadgeClass(task.status)}>
                              {task.status || "—"}
                            </span>
                          </td>
                          <td>
                            <span className={`task-date ${overdue ? 'task-date--overdue' : ''}`}>
                              {due ? format(due, "MMM d, yyyy") : "—"}
                            </span>
                          </td>
                          <td>
                            <ActionMenu taskId={task.id} onMarkComplete={handleMarkComplete} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default HomePage;
