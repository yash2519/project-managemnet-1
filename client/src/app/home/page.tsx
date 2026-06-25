"use client";

import {
  Priority,
  Project,
  Task,
  Activity,
  useGetAuthUserQuery,
  useGetProjectsQuery,
  useGetTasksByUserQuery,
  useUpdateTaskStatusMutation,
  useGetActivitiesQuery,
} from "@/state/api";
import type { PieLabelRenderProps } from "recharts";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
import { dataGridClassNames, dataGridSxStyles, formatDate } from "@/lib/utils";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import ModalEditTask from "@/components/ModalEditTask";
import ModalAssignTask from "@/components/ModalAssignTask";
import { format, isToday, isPast, isFuture, addDays, formatDistanceToNow } from "date-fns";
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
  ArrowUp,
  ArrowDown,
  Filter,
  EyeOff,
  Settings2,
  RotateCcw,
  GripVertical,
  SlidersHorizontal,
  Search,
  X as XIcon,
} from "lucide-react";
import "./dashboard.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ModalNewProject from "@/app/projects/ModalNewProject";

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

// ══════════════════════════════════════
// ── ASSIGNED TASKS TABLE (with column actions) ──
// ══════════════════════════════════════

type TaskColKey = "title" | "project" | "priority" | "status" | "dueDate" | "actions";
type TaskSortDir = "asc" | "desc";

interface TaskColumnDef {
  key: TaskColKey;
  label: string;
  visible: boolean;
  order: number;
  sortable: boolean;
  filterable: boolean;
  width: string;
}

interface TaskSortConfig { key: TaskColKey; dir: TaskSortDir; }
interface TaskTablePrefs {
  columns: TaskColumnDef[];
  sortConfig: TaskSortConfig | null;
  filters: Partial<Record<TaskColKey, string>>;
}

const TASK_TABLE_PREFS_KEY = "home-tasks-table-prefs-v1";

const DEFAULT_TASK_COLUMNS: TaskColumnDef[] = [
  { key: "title",    label: "Task / Description", visible: true, order: 0, sortable: true,  filterable: true,  width: "30%" },
  { key: "project",  label: "Project",            visible: true, order: 1, sortable: true,  filterable: true,  width: "16%" },
  { key: "priority", label: "Priority",           visible: true, order: 2, sortable: true,  filterable: true,  width: "14%" },
  { key: "status",   label: "Status",             visible: true, order: 3, sortable: true,  filterable: true,  width: "20%" },
  { key: "dueDate",  label: "Due Date",           visible: true, order: 4, sortable: true,  filterable: false, width: "14%" },
  { key: "actions",  label: "",                   visible: true, order: 5, sortable: false, filterable: false, width: "6%"  },
];

const TASK_STATUSES  = ["To Do", "Work In Progress", "Under Review", "Completed"];
const TASK_PRIORITIES = ["Urgent", "High", "Medium", "Low", "Backlog"];

function loadTaskPrefs(): TaskTablePrefs {
  if (typeof window === "undefined")
    return { columns: DEFAULT_TASK_COLUMNS, sortConfig: null, filters: {} };
  try {
    const raw = localStorage.getItem(TASK_TABLE_PREFS_KEY);
    if (!raw) return { columns: DEFAULT_TASK_COLUMNS, sortConfig: null, filters: {} };
    const p = JSON.parse(raw) as Partial<TaskTablePrefs>;
    const savedKeys = new Set((p.columns ?? []).map((c) => c.key));
    return {
      columns: [
        ...(p.columns ?? []),
        ...DEFAULT_TASK_COLUMNS.filter((c) => !savedKeys.has(c.key)),
      ],
      sortConfig: p.sortConfig ?? null,
      filters: p.filters ?? {},
    };
  } catch {
    return { columns: DEFAULT_TASK_COLUMNS, sortConfig: null, filters: {} };
  }
}

function saveTaskPrefs(prefs: TaskTablePrefs) {
  try { localStorage.setItem(TASK_TABLE_PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

/* ─── Manage Columns Drawer ─────────────────────────────────────────────── */
interface TaskManagePanelProps {
  columns: TaskColumnDef[];
  onToggle: (key: TaskColKey) => void;
  onReorder: (from: number, to: number) => void;
  onReset: () => void;
  onClose: () => void;
}
const TaskManagePanel = ({ columns, onToggle, onReorder, onReset, onClose }: TaskManagePanelProps) => {
  const sorted = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Manage Columns</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 transition-colors" aria-label="Close">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Drag to reorder · Toggle visibility</p>
          <div className="space-y-2">
            {sorted.map((col, idx) => (
              <div
                key={col.key}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== idx) onReorder(dragIdx, idx);
                  setDragIdx(null); setOverIdx(null);
                }}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                className={`flex cursor-grab items-center gap-3 rounded-xl border px-3 py-2.5 select-none active:cursor-grabbing transition-all ${
                  overIdx === idx && dragIdx !== idx
                    ? "scale-[1.02] border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20"
                    : dragIdx === idx
                    ? "border-dashed border-gray-300 opacity-40"
                    : "border-gray-200 bg-gray-50 hover:bg-white dark:border-gray-700 dark:bg-gray-800/40 dark:hover:bg-gray-800"
                }`}
              >
                <GripVertical className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggle(col.key); }}
                  className={`relative flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none ${
                    col.visible ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${col.visible ? "left-[18px]" : "left-0.5"}`} />
                </button>
                <span className={`flex-1 text-sm font-medium ${
                  col.visible ? "text-gray-800 dark:text-gray-100" : "text-gray-400 line-through dark:text-gray-600"
                }`}>
                  {col.label || "Actions"}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <button
            onClick={onReset}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Default
          </button>
        </div>
      </aside>
    </>
  );
};

/* ─── Column Action Menu (three-dot dropdown) ───────────────────────────── */
interface TaskColMenuProps {
  col: TaskColumnDef;
  pos: { top: number; left: number };
  sortConfig: TaskSortConfig | null;
  hasFilter: boolean;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onFilter: () => void;
  onHide: () => void;
  onManage: () => void;
  menuRef: React.RefObject<HTMLDivElement>;
}
const TaskColMenu = ({
  col, pos, sortConfig, hasFilter,
  onSortAsc, onSortDesc, onFilter, onHide, onManage, menuRef,
}: TaskColMenuProps) => {
  const isAsc  = sortConfig?.key === col.key && sortConfig.dir === "asc";
  const isDesc = sortConfig?.key === col.key && sortConfig.dir === "desc";
  const isDateCol = col.key === "dueDate";

  const Item = ({
    icon, label, active = false, activeColor = "blue", disabled = false, onClick,
  }: {
    icon: React.ReactNode; label: string; active?: boolean;
    activeColor?: "blue" | "amber"; disabled?: boolean; onClick: () => void;
  }) => {
    const cls = activeColor === "amber"
      ? { row: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300", dot: "bg-amber-500", icon: "text-amber-500" }
      : { row: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",   dot: "bg-blue-500",  icon: "text-blue-500"  };
    return (
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
          disabled ? "cursor-not-allowed opacity-40 text-gray-400"
          : active  ? cls.row
          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
        }`}
      >
        <span className={disabled ? "text-gray-300" : active ? cls.icon : "text-gray-400"}>{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        {active && !disabled && <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cls.dot}`} />}
      </button>
    );
  };
  const Divider  = () => <div className="mx-2 my-0.5 border-t border-gray-100 dark:border-gray-800" />;
  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="px-2 py-1">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{title}</p>
      {children}
    </div>
  );
  return (
    <div
      ref={menuRef}
      className="fixed z-[70] w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      style={{ top: pos.top, left: pos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <Group title="Sort">
        <Item icon={<ArrowUp className="h-3.5 w-3.5" />}   label={isDateCol ? "Earliest first" : "Sort A → Z (ASC)"}  active={isAsc}  disabled={!col.sortable} onClick={onSortAsc}  />
        <Item icon={<ArrowDown className="h-3.5 w-3.5" />} label={isDateCol ? "Latest first"   : "Sort Z → A (DESC)"} active={isDesc} disabled={!col.sortable} onClick={onSortDesc} />
      </Group>
      <Divider />
      <Group title="Filter">
        <Item icon={<Filter className="h-3.5 w-3.5" />} label={`Filter by ${col.label || "column"}`} active={hasFilter} activeColor="amber" disabled={!col.filterable} onClick={onFilter} />
      </Group>
      <Divider />
      <Group title="Column">
        <Item icon={<EyeOff className="h-3.5 w-3.5" />}    label="Hide Column"     onClick={onHide}   />
        <Item icon={<Settings2 className="h-3.5 w-3.5" />} label="Manage Columns"  onClick={onManage} />
      </Group>
    </div>
  );
};

/* ─── Filter Input ────────────────────────────────────────────────────────── */
const TaskFilterInput = ({
  col, value, onChange, onClear, inputRef, onFocus, onBlur,
}: {
  col: TaskColumnDef; value: string;
  onChange: (v: string) => void; onClear: () => void;
  inputRef: (el: HTMLInputElement | HTMLSelectElement | null) => void;
  onFocus: () => void; onBlur: () => void;
}) => {
  const base = "w-full rounded-lg border border-gray-200 bg-white py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 transition-colors";
  if (col.key === "status") {
    return (
      <div className="relative">
        <Filter className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
        <select ref={inputRef as React.RefCallback<HTMLSelectElement>} value={value} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} onBlur={onBlur} className={`${base} cursor-pointer pl-6 pr-6 appearance-none`}>
          <option value="">All statuses…</option>
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {value && <button onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XIcon className="h-3 w-3" /></button>}
      </div>
    );
  }
  if (col.key === "priority") {
    return (
      <div className="relative">
        <Filter className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
        <select ref={inputRef as React.RefCallback<HTMLSelectElement>} value={value} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} onBlur={onBlur} className={`${base} cursor-pointer pl-6 pr-6 appearance-none`}>
          <option value="">All priorities…</option>
          {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {value && <button onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XIcon className="h-3 w-3" /></button>}
      </div>
    );
  }
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef as React.RefCallback<HTMLInputElement>}
        type="text" value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus} onBlur={onBlur}
        placeholder={`Filter…`}
        className={`${base} pl-6 pr-6`}
      />
      {value && <button onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XIcon className="h-3 w-3" /></button>}
    </div>
  );
};

/* ─── Assigned Tasks Table ────────────────────────────────────────────────── */
const AssignedTasksTable = ({
  safeTasks, projectMap, currentUser, projects,
  onViewDetails, onEdit, onAssign, onMarkComplete,
}: {
  safeTasks: Task[];
  projectMap: Record<number, string>;
  currentUser: any;
  projects: Project[];
  onViewDetails: (t: Task) => void;
  onEdit: (t: Task) => void;
  onAssign: (t: Task) => void;
  onMarkComplete: (id: number) => void;
}) => {
  const [columns,    setColumns]    = useState<TaskColumnDef[]>(DEFAULT_TASK_COLUMNS);
  const [sortConfig, setSortConfig] = useState<TaskSortConfig | null>(null);
  const [filters,    setFilters]    = useState<Partial<Record<TaskColKey, string>>>({});
  const [prefsReady, setPrefsReady] = useState(false);

  const [activeMenu,      setActiveMenu]      = useState<{ key: TaskColKey; top: number; left: number } | null>(null);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [filterFocusKey,  setFilterFocusKey]  = useState<TaskColKey | null>(null);

  const menuRef    = useRef<HTMLDivElement>(null);
  const filterRefs = useRef<Partial<Record<TaskColKey, HTMLInputElement | HTMLSelectElement>>>({});

  useEffect(() => {
    const p = loadTaskPrefs();
    setColumns(p.columns); setSortConfig(p.sortConfig); setFilters(p.filters);
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    saveTaskPrefs({ columns, sortConfig, filters });
  }, [columns, sortConfig, filters, prefsReady]);

  useEffect(() => {
    if (!activeMenu) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [activeMenu]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setActiveMenu(null); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (!filterFocusKey) return;
    const t = setTimeout(() => filterRefs.current[filterFocusKey]?.focus(), 60);
    return () => clearTimeout(t);
  }, [filterFocusKey]);

  const visibleColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order).filter((c) => c.visible),
    [columns]
  );

  const processedTasks = useMemo(() => {
    let result = [...safeTasks];
    (Object.entries(filters) as [TaskColKey, string][]).forEach(([key, value]) => {
      if (!value?.trim()) return;
      const q = value.trim().toLowerCase();
      result = result.filter((t) => {
        if (key === "title")    return (t.title ?? "").toLowerCase().includes(q);
        if (key === "project")  return (projectMap[t.projectId] ?? "").toLowerCase().includes(q);
        if (key === "priority") return (t.priority ?? "").toLowerCase() === q.toLowerCase();
        if (key === "status")   return (t.status ?? "").toLowerCase() === q.toLowerCase();
        return true;
      });
    });
    if (sortConfig) {
      result.sort((a, b) => {
        let av: string | number, bv: string | number;
        if (sortConfig.key === "title")    { av = (a.title ?? "").toLowerCase(); bv = (b.title ?? "").toLowerCase(); }
        else if (sortConfig.key === "project")  { av = (projectMap[a.projectId] ?? "").toLowerCase(); bv = (projectMap[b.projectId] ?? "").toLowerCase(); }
        else if (sortConfig.key === "priority") { const O: Record<string,number> = { Urgent:0, High:1, Medium:2, Low:3, Backlog:4 }; av = O[a.priority ?? ""] ?? 5; bv = O[b.priority ?? ""] ?? 5; }
        else if (sortConfig.key === "status")   { av = (a.status ?? "").toLowerCase(); bv = (b.status ?? "").toLowerCase(); }
        else if (sortConfig.key === "dueDate")  { av = a.dueDate ? new Date(a.dueDate).getTime() : Infinity; bv = b.dueDate ? new Date(b.dueDate).getTime() : Infinity; }
        else return 0;
        if (av < bv) return sortConfig.dir === "asc" ? -1 : 1;
        if (av > bv) return sortConfig.dir === "asc" ?  1 : -1;
        return 0;
      });
    }
    return result;
  }, [safeTasks, filters, sortConfig, projectMap]);

  const hasColFilters = Object.values(filters).some((v) => v?.trim());
  const showFilterRow = hasColFilters || filterFocusKey !== null;
  const hiddenCount   = columns.filter((c) => !c.visible && c.key !== "actions").length;

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, key: TaskColKey) => {
    e.stopPropagation();
    if (activeMenu?.key === key) { setActiveMenu(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.right - 208), window.innerWidth - 216);
    setActiveMenu({ key, top: rect.bottom + 4, left });
  };

  const handleSort        = (key: TaskColKey, dir: TaskSortDir) => { setSortConfig({ key, dir }); setActiveMenu(null); };
  const handleHide        = (key: TaskColKey) => { setColumns((p) => p.map((c) => c.key === key ? { ...c, visible: false } : c)); setActiveMenu(null); };
  const handleToggle      = (key: TaskColKey) => setColumns((p) => p.map((c) => c.key === key ? { ...c, visible: !c.visible } : c));
  const handleFilterClick = (key: TaskColKey) => { setFilterFocusKey(key); setActiveMenu(null); };
  const setFilter         = (key: TaskColKey, value: string) => setFilters((p) => ({ ...p, [key]: value }));
  const clearAllFilters   = () => { setFilters({}); setFilterFocusKey(null); };

  const handleReorder = (from: number, to: number) => {
    setColumns((prev) => {
      const arr = [...prev].sort((a, b) => a.order - b.order);
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr.map((c, i) => ({ ...c, order: i }));
    });
  };

  const handleReset = () => {
    setColumns(DEFAULT_TASK_COLUMNS); setSortConfig(null); setFilters({});
    setShowManagePanel(false); setActiveMenu(null);
  };

  return (
    <>
      {showManagePanel && (
        <TaskManagePanel
          columns={columns}
          onToggle={handleToggle}
          onReorder={handleReorder}
          onReset={handleReset}
          onClose={() => setShowManagePanel(false)}
        />
      )}
      {activeMenu && (
        <TaskColMenu
          col={columns.find((c) => c.key === activeMenu.key)!}
          pos={{ top: activeMenu.top, left: activeMenu.left }}
          sortConfig={sortConfig}
          hasFilter={!!(filters[activeMenu.key]?.trim())}
          onSortAsc={() => handleSort(activeMenu.key, "asc")}
          onSortDesc={() => handleSort(activeMenu.key, "desc")}
          onFilter={() => handleFilterClick(activeMenu.key)}
          onHide={() => handleHide(activeMenu.key)}
          onManage={() => { setShowManagePanel(true); setActiveMenu(null); }}
          menuRef={menuRef}
        />
      )}

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold dark:text-white">Assigned Tasks</h3>
        <div className="flex items-center gap-3">
          {/* Active state pills */}
          {sortConfig && (
            <span className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
              {sortConfig.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {columns.find((c) => c.key === sortConfig.key)?.label}
              <button onClick={() => setSortConfig(null)} className="ml-0.5"><XIcon className="h-3 w-3" /></button>
            </span>
          )}
          {hasColFilters && (
            <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <Filter className="h-3 w-3" /> Filtered
              <button onClick={clearAllFilters} className="ml-0.5"><XIcon className="h-3 w-3" /></button>
            </span>
          )}
          {hiddenCount > 0 && (
            <button onClick={() => setShowManagePanel(true)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <EyeOff className="h-3.5 w-3.5" />{hiddenCount} hidden
            </button>
          )}
          <button onClick={() => setShowManagePanel(true)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <Settings2 className="h-3.5 w-3.5" />Columns
          </button>
        </div>
      </div>

      {safeTasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No tasks assigned to you yet.</p>
      ) : (
        <div className="assigned-tasks-table-wrapper">
          <table className="assigned-tasks-table">
            <thead>
              <tr>
                {visibleColumns.map((col) => {
                  const isSorted   = sortConfig?.key === col.key;
                  const hasColFilt = !!(filters[col.key]?.trim());
                  const menuOpen   = activeMenu?.key === col.key;
                  return (
                    <th key={col.key} style={{ width: col.width }} className="group/th">
                      <div className="flex items-center gap-1">
                        <span>{col.label}</span>
                        {isSorted && (
                          <span className="text-blue-500">
                            {sortConfig!.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          </span>
                        )}
                        {hasColFilt && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />}
                        {col.key !== "actions" && (
                          <button
                            id={`task-col-menu-${col.key}`}
                            onClick={(e) => openMenu(e, col.key)}
                            className={`ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded transition-all ${
                              menuOpen
                                ? "bg-blue-100 text-blue-600 opacity-100 dark:bg-blue-900/40"
                                : "text-gray-400 opacity-0 group-hover/th:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                            aria-label={`${col.label} options`}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* ── Filter row ── */}
              {showFilterRow && (
                <tr style={{ background: "rgba(245,158,11,0.06)", borderBottom: "1px solid rgba(245,158,11,0.2)" }}>
                  {visibleColumns.map((col) => (
                    <td key={col.key} style={{ padding: "4px 8px" }}>
                      {col.filterable ? (
                        <TaskFilterInput
                          col={col}
                          value={filters[col.key] ?? ""}
                          onChange={(v) => setFilter(col.key, v)}
                          onClear={() => setFilter(col.key, "")}
                          inputRef={(el) => { if (el) filterRefs.current[col.key] = el as HTMLInputElement | HTMLSelectElement; }}
                          onFocus={() => setFilterFocusKey(col.key)}
                          onBlur={() => setFilterFocusKey(null)}
                        />
                      ) : (
                        <div style={{ height: "26px" }} />
                      )}
                    </td>
                  ))}
                </tr>
              )}
            </thead>

            <tbody>
              {processedTasks.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} style={{ padding: "32px", textAlign: "center" }}>
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm text-gray-400">No tasks match the current filters</p>
                      <button onClick={clearAllFilters} className="text-xs text-blue-500 hover:underline">Clear filters</button>
                    </div>
                  </td>
                </tr>
              ) : (
                processedTasks.map((task: Task) => {
                  const due = task.dueDate ? new Date(task.dueDate) : null;
                  const overdue = due && isPast(due) && task.status !== "Completed";
                  return (
                    <tr key={task.id} className="assigned-tasks-row">
                      {visibleColumns.map((col) => (
                        <td key={col.key}>
                          {col.key === "title" && (
                            <div className="task-name-cell">
                              <span className="task-title">{task.title}</span>
                              {task.description && <span className="task-desc">{task.description}</span>}
                            </div>
                          )}
                          {col.key === "project" && (
                            <span className="task-project">
                              {task.projectId && projectMap[task.projectId]
                                ? projectMap[task.projectId]
                                : <span className="text-gray-400">—</span>}
                            </span>
                          )}
                          {col.key === "priority" && (
                            <span className={getPriorityBadgeClass(task.priority as string)}>{task.priority || "—"}</span>
                          )}
                          {col.key === "status" && (
                            <span className={getStatusBadgeClass(task.status)}>{task.status || "—"}</span>
                          )}
                          {col.key === "dueDate" && (
                            <span className={`task-date ${overdue ? "task-date--overdue" : ""}`}>{formatDate(task.dueDate)}</span>
                          )}
                          {col.key === "actions" && (
                            <ActionMenu
                              task={task}
                              currentUser={currentUser}
                              projects={projects}
                              onViewDetails={onViewDetails}
                              onEdit={onEdit}
                              onAssign={onAssign}
                              onMarkComplete={onMarkComplete}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Table footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-1 pt-2 pb-1 dark:border-gray-800">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {processedTasks.length} of {safeTasks.length} tasks
              {hasColFilters && (
                <> · <button onClick={clearAllFilters} className="text-amber-500 hover:underline">clear filters</button></>
              )}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

// ── Action Menu Component ──
const ActionMenu = ({
  task,
  currentUser,
  projects,
  onViewDetails,
  onEdit,
  onAssign,
  onMarkComplete,
}: {
  task: Task;
  currentUser: any;
  projects: Project[];
  onViewDetails: (task: Task) => void;
  onEdit: (task: Task) => void;
  onAssign: (task: Task) => void;
  onMarkComplete: (taskId: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const project = projects.find((p) => p.id === task.projectId);
  const isOwner = project !== undefined && project.ownerId === currentUser?.userId;
  const isAdmin = currentUser?.role === "ADMIN";
  const isAssigned = task.assignedUserId === currentUser?.userId;

  const canEditOrAssign = isOwner || isAdmin;
  const canChangeStatus = isOwner || isAssigned;

  return (
    <div className="action-menu-container" ref={ref}>
      <button className="action-menu-trigger" onClick={() => setOpen(!open)}>
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="action-menu-dropdown">
          <button
            className="action-menu-item"
            onClick={() => {
              onViewDetails(task);
              setOpen(false);
            }}
          >
            <Eye size={14} /> View Details
          </button>
          {canEditOrAssign && (
            <button
              className="action-menu-item"
              onClick={() => {
                onEdit(task);
                setOpen(false);
              }}
            >
              <Edit3 size={14} /> Edit
            </button>
          )}
          {canEditOrAssign && (
            <button
              className="action-menu-item"
              onClick={() => {
                onAssign(task);
                setOpen(false);
              }}
            >
              <UserPlus size={14} /> Assign
            </button>
          )}
          {canChangeStatus && task.status !== "Completed" && (
            <button
              className="action-menu-item"
              onClick={() => {
                onMarkComplete(task.id);
                setOpen(false);
              }}
            >
              <CheckSquare size={14} /> Mark Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Custom Recharts Tooltip ──
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip text-gray-900 dark:text-gray-100">
      <p className="font-semibold mb-1">{label || payload[0]?.name}</p>
      <p style={{ color: payload[0]?.payload?.fill || "#3B82F6" }} className="text-xs">
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

  // ── KPI Metrics ──
  const safeTasks = tasks || [];
  const safeProjects = projects || [];
  const safeActivities = activities || [];
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
  const maxPriorityCount = taskDistribution.length > 0 ? Math.max(...taskDistribution.map((d) => d.count)) : 0;
  const yAxisMax = maxPriorityCount + 2;
  const yAxisTicks = Array.from({ length: yAxisMax + 1 }, (_, i) => i);

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
