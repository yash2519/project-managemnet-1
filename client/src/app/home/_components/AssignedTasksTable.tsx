import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  ArrowUp, ArrowDown, Filter, X as XIcon,
  EyeOff, Settings2, MoreVertical, Search,
} from "lucide-react";
import { isPast } from "date-fns";
import { formatDate, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import type { Task, Project } from "@/types";
import type { TaskColumnDef, TaskColKey, TaskSortConfig, TaskSortDir } from "./types";
import { DEFAULT_TASK_COLUMNS, loadTaskPrefs, saveTaskPrefs } from "./types";
import TaskManagePanel from "./TaskManagePanel";
import TaskColMenu from "./TaskColMenu";
import TaskFilterInput from "./TaskFilterInput";
import ActionMenu from "./ActionMenu";

interface AssignedTasksTableProps {
  safeTasks: Task[];
  projectMap: Record<number, string>;
  currentUser: any;
  projects: Project[];
  onViewDetails: (t: Task) => void;
  onEdit: (t: Task) => void;
  onAssign: (t: Task) => void;
  onMarkComplete: (id: number) => void;
}

const AssignedTasksTable = ({
  safeTasks, projectMap, currentUser, projects,
  onViewDetails, onEdit, onAssign, onMarkComplete,
}: AssignedTasksTableProps) => {
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
        if (sortConfig.key === "title")         { av = (a.title ?? "").toLowerCase(); bv = (b.title ?? "").toLowerCase(); }
        else if (sortConfig.key === "project")  { av = (projectMap[a.projectId] ?? "").toLowerCase(); bv = (projectMap[b.projectId] ?? "").toLowerCase(); }
        else if (sortConfig.key === "priority") { const O: Record<string, number> = { Urgent:0, High:1, Medium:2, Low:3, Backlog:4 }; av = O[a.priority ?? ""] ?? 5; bv = O[b.priority ?? ""] ?? 5; }
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
  const clearAllFilters   = useCallback(() => { setFilters({}); setFilterFocusKey(null); }, []);

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

export default AssignedTasksTable;
