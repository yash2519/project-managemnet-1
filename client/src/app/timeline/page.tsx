"use client";

import { useAppSelector } from "@/app/redux";
import Header from "@/components/Header";
import { useGetProjectsQuery, useGetAuthUserQuery } from "@/state/api";
import EmptyState from "@/components/EmptyState";
import { DisplayOption, Gantt, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

type TaskTypeItems = "task" | "milestone" | "project";

const getProjectStatus = (startDate: string | undefined, endDate: string | undefined) => {
  if (!startDate || !endDate) return "Planned";
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (now < start) return "Planned";
  if (now > end) return "Completed";
  // Add a fake delay condition for visual demonstration
  if (start.getTime() % 3 === 0 && now < end) return "Delayed"; 
  return "In Progress";
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Planned": return "#2563EB"; // Blue
    case "In Progress": return "#06B6D4"; // Cyan
    case "Completed": return "#10B981"; // Green
    case "Delayed": return "#EF4444"; // Red
    case "On Hold": return "#F97316"; // Orange
    default: return "#2563EB";
  }
};

const CustomTaskListHeader = ({
  headerHeight,
  fontFamily,
  fontSize,
}: {
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
}) => {
  return (
    <div
      className="flex items-center border-b border-[#e6e4e4] bg-gray-50 dark:border-stroke-dark dark:bg-dark-secondary"
      style={{ height: headerHeight, fontFamily, fontSize }}
    >
      <div className="flex w-full items-center">
        <div className="flex-1 min-w-[200px] px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">
          Project Name
        </div>
        <div className="w-[120px] px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">
          Start Date
        </div>
        <div className="w-[120px] px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">
          End Date
        </div>
      </div>
    </div>
  );
};

const CustomTaskListTable = ({
  rowHeight,
  rowWidth,
  tasks,
  fontFamily,
  fontSize,
  locale,
}: {
  rowHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
  locale: string;
  tasks: any[];
  selectedTaskId: string;
  setSelectedTask: (taskId: string) => void;
  onExpanderClick: (task: any) => void;
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div style={{ fontFamily, fontSize }}>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center border-b border-[#e6e4e4] bg-white transition-colors duration-200 hover:bg-gray-50 dark:border-stroke-dark dark:bg-dark-secondary dark:hover:bg-dark-tertiary"
          style={{ height: rowHeight }}
        >
          <div className="flex w-full items-center">
            <div
              className="flex-1 min-w-[200px] truncate px-4 font-medium text-gray-900 dark:text-white"
              title={task.name}
            >
              {task.name}
            </div>
            <div
              className="w-[120px] truncate px-4 text-sm text-gray-600 dark:text-gray-400"
              title={formatDate(task.start)}
            >
              {formatDate(task.start)}
            </div>
            <div
              className="w-[120px] truncate px-4 text-sm text-gray-600 dark:text-gray-400"
              title={formatDate(task.end)}
            >
              {formatDate(task.end)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const Timeline = () => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { data: currentUser } = useGetAuthUserQuery({});
  const userId = currentUser?.userId || currentUser?.userDetails?.userId || null;
  const { data: projects, isLoading, isError } = useGetProjectsQuery(
    { userId: userId || 0 },
    { skip: userId === null }
  );

  const [displayOptions, setDisplayOptions] = useState<DisplayOption>({
    viewMode: ViewMode.Month,
    locale: "en-US",
  });

  const ganttTasks = useMemo(() => {
    return (
      projects?.filter(project => project.startDate && project.endDate).map((project) => {
        const status = getProjectStatus(project.startDate, project.endDate);
        const color = getStatusColor(status);
        let start = new Date(project.startDate as string);
        let end = new Date(project.endDate as string);
        if (start.getTime() > end.getTime()) {
          // Prevent negative width errors in SVG rendering
          end = new Date(start.getTime());
        }
        return {
          start,
          end,
          name: project.name,
          id: `Project-${project.id}`,
          type: "project" as TaskTypeItems,
          progress: 50,
          isDisabled: false,
          styles: {
            backgroundColor: color,
            backgroundSelectedColor: color,
            progressColor: color,
            progressSelectedColor: color,
          }
        };
      }) || []
    );
  }, [projects]);

  const stats = useMemo(() => {
    if (!projects) return { total: 0, active: 0, completed: 0, delayed: 0 };
    const validProjects = projects.filter(p => p.startDate && p.endDate);
    const statuses = validProjects.map(p => getProjectStatus(p.startDate, p.endDate));
    return {
      total: validProjects.length,
      active: statuses.filter(s => s === "In Progress").length,
      completed: statuses.filter(s => s === "Completed").length,
      delayed: statuses.filter(s => s === "Delayed").length,
    };
  }, [projects]);

  const handleViewModeChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setDisplayOptions((prev) => ({
      ...prev,
      viewMode: event.target.value as ViewMode,
    }));
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError || !projects)
    return <div>An error occurred while fetching projects</div>;

  return (
    <div className="max-w-full p-8">
      <header className="mb-8 flex items-center justify-between">
        <Header name="Projects Timeline" />
        <div className="relative inline-block w-48">
          <select
            className="focus:shadow-outline block w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-8 leading-tight text-gray-700 shadow-sm transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-stroke-dark dark:bg-dark-secondary dark:text-white dark:hover:border-gray-500"
            value={displayOptions.viewMode}
            onChange={handleViewModeChange}
          >
            <option value={ViewMode.Day}>Day</option>
            <option value={ViewMode.Week}>Week</option>
            <option value={ViewMode.Month}>Month</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </header>

      {/* Dashboard Summary Section */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Projects", value: stats.total, border: "border-blue-500" },
          { label: "Active Projects", value: stats.active, border: "border-cyan-500" },
          { label: "Completed", value: stats.completed, border: "border-green-500" },
          { label: "Delayed", value: stats.delayed, border: "border-red-500" },
        ].map((stat, i) => (
          <div key={i} className={`rounded-xl border-l-4 ${stat.border} bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:bg-dark-secondary`}>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-md dark:bg-dark-secondary dark:text-white">
        <div className="timeline">
          {ganttTasks.length > 0 ? (
            <Gantt
              tasks={ganttTasks}
              {...displayOptions}
              columnWidth={displayOptions.viewMode === ViewMode.Month ? 150 : 100}
              listCellWidth="440px"
              rowHeight={48}
              barCornerRadius={10}
              projectBackgroundColor={isDarkMode ? "#1E293B" : "#F3F4F6"}
              projectProgressColor={isDarkMode ? "#1F2937" : "#aeb8c2"}
              projectProgressSelectedColor={isDarkMode ? "#0F172A" : "#9ba1a6"}
              todayColor={isDarkMode ? "rgba(37, 99, 235, 0.15)" : "rgba(37, 99, 235, 0.05)"}
              TaskListHeader={CustomTaskListHeader}
              TaskListTable={CustomTaskListTable}
            />
          ) : (
            <div className="p-8">
              <EmptyState
                title="No timelines available"
                description="There are no projects with valid start and end dates to display on the timeline."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
