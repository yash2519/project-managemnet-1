// ─────────────────────────────────────────────────────────────────────────────
// Shared types, interfaces, constants, and helper functions used by
// the home page sub-components (AssignedTasksTable, TaskManagePanel, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export type TaskColKey = "title" | "project" | "priority" | "status" | "dueDate" | "actions";
export type TaskSortDir = "asc" | "desc";

export interface TaskColumnDef {
  key: TaskColKey;
  label: string;
  visible: boolean;
  order: number;
  sortable: boolean;
  filterable: boolean;
  width: string;
}

export interface TaskSortConfig { key: TaskColKey; dir: TaskSortDir; }

export interface TaskTablePrefs {
  columns: TaskColumnDef[];
  sortConfig: TaskSortConfig | null;
  filters: Partial<Record<TaskColKey, string>>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const TASK_TABLE_PREFS_KEY = "home-tasks-table-prefs-v1";

export const DEFAULT_TASK_COLUMNS: TaskColumnDef[] = [
  { key: "title",    label: "Task / Description", visible: true, order: 0, sortable: true,  filterable: true,  width: "30%" },
  { key: "project",  label: "Project",            visible: true, order: 1, sortable: true,  filterable: true,  width: "16%" },
  { key: "priority", label: "Priority",           visible: true, order: 2, sortable: true,  filterable: true,  width: "14%" },
  { key: "status",   label: "Status",             visible: true, order: 3, sortable: true,  filterable: true,  width: "20%" },
  { key: "dueDate",  label: "Due Date",           visible: true, order: 4, sortable: true,  filterable: false, width: "14%" },
  { key: "actions",  label: "",                   visible: true, order: 5, sortable: false, filterable: false, width: "6%"  },
];

export const TASK_STATUSES  = ["To Do", "Work In Progress", "Under Review", "Completed"];
export const TASK_PRIORITIES = ["Urgent", "High", "Medium", "Low", "Backlog"];

export const STATUS_PROGRESS: Record<string, number> = {
  "To Do": 0,
  "Work In Progress": 45,
  "Under Review": 75,
  Completed: 100,
};

export const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "#EF4444", High: "#F97316", Medium: "#F59E0B", Low: "#3B82F6", Backlog: "#6B7280",
};

export const STATUS_COLORS: Record<string, string> = {
  Completed: "#10B981", "In Progress": "#3B82F6", Pending: "#F59E0B", Delayed: "#EF4444",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export const getPriorityDot = (priority?: string): string => {
  const colors: Record<string, string> = {
    Urgent: "#EF4444", High: "#F97316", Medium: "#F59E0B", Low: "#3B82F6",
  };
  return colors[priority || ""] || "#6B7280";
};

export const getInitials = (name?: string): string => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export function loadTaskPrefs(): TaskTablePrefs {
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

export function saveTaskPrefs(prefs: TaskTablePrefs): void {
  try { localStorage.setItem(TASK_TABLE_PREFS_KEY, JSON.stringify(prefs)); } catch {}
}
