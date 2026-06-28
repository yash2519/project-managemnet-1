import React, { useState, useMemo } from "react";
import { SlidersHorizontal, X, GripVertical, RotateCcw } from "lucide-react";
import { ColumnDef } from "./types";

interface ManageColsPanelProps<TKey extends string> {
  columns: ColumnDef<TKey>[];
  onToggle: (key: TKey) => void;
  onReorder: (from: number, to: number) => void;
  onReset: () => void;
  onClose: () => void;
}

export function ManageColumnsPanel<TKey extends string>({
  columns,
  onToggle,
  onReorder,
  onReset,
  onClose,
}: ManageColsPanelProps<TKey>) {
  const sorted = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-950">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Manage Columns</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Drag to reorder · Toggle to show/hide
          </p>
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
                className={`flex cursor-grab items-center gap-3 rounded-xl border px-3 py-2.5 transition-all select-none active:cursor-grabbing ${
                  overIdx === idx && dragIdx !== idx
                    ? "scale-[1.02] border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20"
                    : dragIdx === idx
                    ? "border-dashed border-gray-300 opacity-40 dark:border-gray-600"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                }`}
              >
                <GripVertical className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggle(col.key); }}
                  className={`relative flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none ${
                    col.visible ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  aria-label={`${col.visible ? "Hide" : "Show"} ${col.label}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                      col.visible ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </button>
                <span
                  className={`flex-1 text-sm font-medium transition-colors ${
                    col.visible
                      ? "text-gray-800 dark:text-gray-100"
                      : "text-gray-400 line-through dark:text-gray-600"
                  }`}
                >
                  {col.label}
                </span>
                {col.sortable === false && col.visible && (
                  <span className="text-[9px] uppercase tracking-wider text-gray-300 dark:text-gray-600">
                    no sort
                  </span>
                )}
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
}
