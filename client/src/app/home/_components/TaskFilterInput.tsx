import React from "react";
import { Filter, Search, X as XIcon } from "lucide-react";
import type { TaskColumnDef, TaskColKey } from "./types";
import { TASK_STATUSES, TASK_PRIORITIES } from "./types";

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

export default TaskFilterInput;

// Re-export TaskColKey so consumers can use it from this module
export type { TaskColKey };
