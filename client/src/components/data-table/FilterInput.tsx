import React from "react";
import { Filter, Search, X } from "lucide-react";
import { ColumnDef } from "./types";

interface FilterInputProps<TKey extends string> {
  col: ColumnDef<TKey>;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  inputRef: (el: HTMLInputElement | HTMLSelectElement | null) => void;
  onFocus: () => void;
  onBlur: () => void;
  knownOptions?: string[];
}

export function FilterInput<TKey extends string>({
  col,
  value,
  onChange,
  onClear,
  inputRef,
  onFocus,
  onBlur,
  knownOptions = [],
}: FilterInputProps<TKey>) {
  const baseClass =
    "w-full rounded-lg border border-gray-200 bg-white py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-amber-500 transition-colors";

  if (col.type === "enum") {
    return (
      <div className="relative">
        <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <select
          ref={inputRef as React.RefCallback<HTMLSelectElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className={`${baseClass} cursor-pointer pl-7 pr-7 appearance-none`}
        >
          <option value="">All {col.label}…</option>
          {knownOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
          <option value="Not Specified">Not Specified</option>
        </select>
        {value && (
          <button
            onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label={`Clear ${col.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
      <input
        ref={inputRef as React.RefCallback<HTMLInputElement>}
        id={`filter-${col.key}`}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={`Filter ${col.label}…`}
        className={`${baseClass} pl-7 pr-7`}
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label={`Clear ${col.label} filter`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
