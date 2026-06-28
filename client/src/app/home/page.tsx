"use client";

import {
  Task,
  Activity,
  useGetAuthUserQuery,
  useGetProjectsQuery,
  useGetTasksByUserQuery,
  useUpdateTaskStatusMutation,
  useGetActivitiesQuery,
} from "@/state/api";

import React, { useState, useCallback } from "react";
import { useAppSelector } from "../redux";
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
import TaskDetailsModal from "@/components/TaskDetailsModal";
import ModalEditTask from "@/components/ModalEditTask";
import ModalAssignTask from "@/components/ModalAssignTask";
import { formatDistanceToNow } from "date-fns";
import {
  Loader2,
  Layout,
  Zap,
  Edit3,
  CheckCircle2,
} from "lucide-react";
import "./dashboard.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ModalNewProject from "@/app/projects/ModalNewProject";

// ── Home-page-specific sub-components ──────────────────────────────────────
import AssignedTasksTable from "./_components/AssignedTasksTable";
import CustomTooltip from "./_components/CustomTooltip";
import { useDashboardMetrics } from "./useDashboardMetrics";

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
  const { data: activities, isLoading: isActivitiesLoading } = useGetActivitiesQuery(
    undefined,
    { skip: userId === null }
  );

  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const [updateTaskStatus] = useUpdateTaskStatusMutation();

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalNewProjectOpen, setIsModalNewProjectOpen] = useState(false);

  const handleMarkComplete = useCallback(async (taskId: number) => {
    try {
      await updateTaskStatus({ taskId, status: "Completed" });
    } catch (e) {
      console.error("Failed to update task", e);
    }
  }, [updateTaskStatus]);

  const {
    safeTasks,
    safeProjects,
    totalTasks,
    taskDistribution,
    yAxisMax,
    yAxisTicks,
    taskStatusData,
    projectMap,
    kpis,
  } = useDashboardMetrics(tasks, projects);

  // ── Loading State ──
  if (isAuthLoading || tasksLoading || isProjectsLoading || isActivitiesLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-dark-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const safeActivities = activities || [];

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
                    <defs>
                      {taskDistribution.map((entry, index) => (
                        <linearGradient key={`grad-${index}`} id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                          <stop offset="100%" stopColor={entry.fill} stopOpacity={0.4} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke={chartTextColor}
                      label={{ value: "Priority Level", position: "insideBottom", offset: -10, fill: chartTextColor, fontSize: 11 }}
                    />
                    <YAxis 
                      stroke={chartTextColor} 
                      domain={[0, yAxisMax]}
                      allowDecimals={false}
                      ticks={yAxisTicks}
                      interval={0}
                      label={{ value: "Task Count", angle: -90, position: "insideLeft", offset: -5, fill: chartTextColor, fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.05)' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {taskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#grad-${index})`} className="transition-all duration-300" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="dashboard-card p-6 flex flex-col justify-between" style={{ overflow: 'visible' }}>
                <h3 className="mb-3 text-base font-semibold dark:text-white font-medium">Task Status</h3>
                <div style={{ position: 'relative' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                      <Pie 
                        data={taskStatusData} 
                        dataKey="count" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={65} 
                        outerRadius={85} 
                        paddingAngle={3}
                        label={({ name, percent, x, y, cx }: any) => (
                          <text
                            x={x}
                            y={y}
                            fill={isDarkMode ? "#f3f4f6" : "#111827"}
                            textAnchor={x > cx ? "start" : "end"}
                            dominantBaseline="central"
                            fontSize={10}
                            fontWeight={500}
                          >
                            {`${name}: ${(Number(percent) * 100).toFixed(0)}%`}
                          </text>
                        )}
                        labelLine={true}
                      >
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      {/* Center label: total task count */}
                      <text
                        x="50%"
                        y="50%"
                        dy={-6}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: 26, fontWeight: 700, fill: isDarkMode ? '#F8FAFC' : '#0F172A' }}
                      >
                        {totalTasks}
                      </text>
                      <text
                        x="50%"
                        y="50%"
                        dy={16}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ 
                          fontSize: 9, 
                          fontWeight: 600, 
                          fill: isDarkMode ? '#94A3B8' : '#64748B', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.08em',
                          opacity: 0.85
                        }}
                      >
                        TOTAL TASKS
                      </text>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={28} 
                        iconSize={10} 
                        formatter={(value) => <span className="text-gray-900 dark:text-gray-300 font-medium">{value}</span>}
                        wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Your Projects Widget */}
            <div className="dashboard-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold dark:text-white">Recent Projects</h3>
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
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {safeTasks.filter(t => t.projectId === project.id).length} Assigned Tasks
                    </span>
                  </Link>
                ))}
                {safeProjects.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-400">No projects yet.</p>
                )}
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button 
                    onClick={() => setIsModalNewProjectOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20">
                    + New Project
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="dashboard-card p-6 lg:col-span-2">
              <AssignedTasksTable
                safeTasks={safeTasks}
                projectMap={projectMap}
                currentUser={currentUser}
                projects={projects || []}
                onViewDetails={(t) => { setSelectedTask(t); setIsDetailsOpen(true); }}
                onEdit={(t) => { setSelectedTask(t); setIsEditOpen(true); }}
                onAssign={(t) => { setSelectedTask(t); setIsAssignOpen(true); }}
                onMarkComplete={handleMarkComplete}
              />
            </div>

            {/* Recent Activity Widget */}
            <div className="dashboard-card p-6">
              <h3 className="mb-4 text-base font-semibold dark:text-white font-medium">Recent Activity</h3>
              <div className="flex flex-col gap-4">
                {safeActivities.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">No recent activity.</p>
                ) : (
                  safeActivities.slice(0, 6).map((activity: Activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {activity.action === "CREATED" ? <Zap size={14} /> : activity.action === "UPDATED" ? <Edit3 size={14} /> : <CheckCircle2 size={14} />}
                      </div>
                      <div>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{activity.details}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
      <TaskDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        task={selectedTask}
      />
      <ModalEditTask
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        task={selectedTask}
      />
      <ModalAssignTask
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        task={selectedTask}
      />
      <ModalNewProject 
        isOpen={isModalNewProjectOpen} 
        onClose={() => setIsModalNewProjectOpen(false)} 
      />
    </div>
  );
};

export default HomePage;
