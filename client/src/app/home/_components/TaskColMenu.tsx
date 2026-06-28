import React from "react";
import { ArrowUp, ArrowDown, Filter, EyeOff, Settings2 } from "lucide-react";
import type { TaskColumnDef, TaskSortConfig } from "./types";

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

export default TaskColMenu;
