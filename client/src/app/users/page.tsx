"use client";
import { useGetUsersQuery } from "@/state/api";
import React, { useState, useMemo, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Image from "next/image";
import {
  User as UserIcon, Search, X, Users, SearchX,
  MoreVertical, ArrowUp, ArrowDown, EyeOff, Settings2,
  Filter, RotateCcw, GripVertical, SlidersHorizontal,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════════════════ */
type ColKey = "userId" | "avatar" | "username" | "role";
type SortDir = "asc" | "desc";

interface ColumnDef {
  key: ColKey;
  label: string;
  visible: boolean;
  order: number;
  sortable: boolean;
  filterable: boolean;
}

interface SortConfig { key: ColKey; dir: SortDir; }

interface TablePrefs {
  columns: ColumnDef[];
  sortConfig: SortConfig | null;
  filters: Partial<Record<ColKey, string>>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Constants & Persistence
═══════════════════════════════════════════════════════════════════════════ */
const PREFS_KEY = "users-table-prefs-v1";

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "userId",   label: "ID",       visible: true, order: 0, sortable: true,  filterable: true  },
  { key: "avatar",   label: "Avatar",   visible: true, order: 1, sortable: false, filterable: false },
  { key: "username", label: "Username", visible: true, order: 2, sortable: true,  filterable: true  },
  { key: "role",     label: "Role",     visible: true, order: 3, sortable: true,  filterable: true  },
];

/* Proportional base widths (sum ≈ 100) */
const BASE_WIDTHS: Record<ColKey, number> = {
  userId:   8,
  avatar:   10,
  username: 42,
  role:     40,
};

/* Known role values for the dropdown filter */
const KNOWN_ROLES = ["ADMIN", "MANAGER", "MEMBER"];

function loadPrefs(): TablePrefs {
  if (typeof window === "undefined")
    return { columns: DEFAULT_COLUMNS, sortConfig: null, filters: {} };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { columns: DEFAULT_COLUMNS, sortConfig: null, filters: {} };
    const p = JSON.parse(raw) as Partial<TablePrefs>;
    const savedKeys = new Set((p.columns ?? []).map((c) => c.key));
    return {
      columns: [
        ...(p.columns ?? []),
        ...DEFAULT_COLUMNS.filter((c) => !savedKeys.has(c.key)),
      ],
      sortConfig: p.sortConfig ?? null,
      filters: p.filters ?? {},
    };
  } catch {
    return { columns: DEFAULT_COLUMNS, sortConfig: null, filters: {} };
  }
}

function savePrefs(prefs: TablePrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

/* ═══════════════════════════════════════════════════════════════════════════
   Role Badge
═══════════════════════════════════════════════════════════════════════════ */
const rolePalette: Record<string, { bg: string; text: string }> = {
  default:   { bg: "bg-gray-100 dark:bg-gray-700",          text: "text-gray-600 dark:text-gray-300"   },
  admin:     { bg: "bg-purple-100 dark:bg-purple-900/40",   text: "text-purple-700 dark:text-purple-300" },
  manager:   { bg: "bg-blue-100 dark:bg-blue-900/40",       text: "text-blue-700 dark:text-blue-300"   },
  developer: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
  designer:  { bg: "bg-pink-100 dark:bg-pink-900/40",       text: "text-pink-700 dark:text-pink-300"   },
  member:    { bg: "bg-gray-100 dark:bg-gray-700",          text: "text-gray-600 dark:text-gray-300"   },
};

const getRoleStyle = (role: string) => {
  const key = role.toLowerCase();
  for (const [k, v] of Object.entries(rolePalette)) {
    if (k !== "default" && key.includes(k)) return v;
  }
  return rolePalette.default;
};

const RoleBadge = ({ role }: { role?: string | null }) => {
  const label = role?.trim() || "Not Specified";
  const style = role?.trim() ? getRoleStyle(label) : rolePalette.default;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {label}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Avatar
═══════════════════════════════════════════════════════════════════════════ */
const Avatar = ({ url, username }: { url?: string | null; username: string }) => {
  if (url) {
    return (
      <Image
        src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${url}`}
        alt={username}
        width={36}
        height={36}
        className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-gray-800"
        onError={(e) => {
          if (e.currentTarget.src.includes("ui-avatars.com")) return;
          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
          e.currentTarget.srcset = "";
        }}
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 ring-2 ring-white dark:ring-gray-800">
      <UserIcon className="h-4 w-4 text-white" />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Empty States
═══════════════════════════════════════════════════════════════════════════ */
const EmptyNoUsers = () => (
  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-8 py-20 text-center">
    <div className="relative mb-6">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-inner">
        <Users className="h-12 w-12 text-blue-400 dark:text-blue-500" />
      </div>
      <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-md">
        <span className="text-base">👥</span>
      </div>
    </div>
    <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-100">No users available.</h3>
    <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
      Users will appear here once they are added to the system.
    </p>
  </div>
);

const EmptyNoResults = ({ query }: { query: string }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-8 py-20 text-center">
    <div className="relative mb-6">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 shadow-inner">
        <SearchX className="h-12 w-12 text-amber-400 dark:text-amber-500" />
      </div>
    </div>
    <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-100">No matching users found.</h3>
    <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
      Try adjusting your search criteria.{" "}
      <span className="font-medium text-gray-600 dark:text-gray-300">&ldquo;{query}&rdquo;</span>{" "}
      did not match any user.
    </p>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Manage Columns Panel (slide-in drawer)
═══════════════════════════════════════════════════════════════════════════ */
interface ManageColsPanelProps {
  columns: ColumnDef[];
  onToggle: (key: ColKey) => void;
  onReorder: (from: number, to: number) => void;
  onReset: () => void;
  onClose: () => void;
}

const ManageColumnsPanel = ({ columns, onToggle, onReorder, onReset, onClose }: ManageColsPanelProps) => {
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
        {/* Header */}
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

        {/* Column list */}
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

                {/* Toggle switch */}
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

                {!col.sortable && col.visible && (
                  <span className="text-[9px] uppercase tracking-wider text-gray-300 dark:text-gray-600">
                    no sort
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
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

/* ═══════════════════════════════════════════════════════════════════════════
   Column Action Menu (three-dot dropdown)
═══════════════════════════════════════════════════════════════════════════ */
interface ColMenuProps {
  col: ColumnDef;
  pos: { top: number; left: number };
  sortConfig: SortConfig | null;
  hasFilter: boolean;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onFilter: () => void;
  onHide: () => void;
  onManage: () => void;
  menuRef: React.RefObject<HTMLDivElement>;
}

const ColumnMenu = ({
  col, pos, sortConfig, hasFilter,
  onSortAsc, onSortDesc, onFilter, onHide, onManage, menuRef,
}: ColMenuProps) => {
  const isAsc  = sortConfig?.key === col.key && sortConfig.dir === "asc";
  const isDesc = sortConfig?.key === col.key && sortConfig.dir === "desc";
  const isNumeric = col.key === "userId";

  /* ── Reusable menu item */
  const Item = ({
    icon, label, active = false, activeColor = "blue", disabled = false, onClick,
  }: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    activeColor?: "blue" | "amber";
    disabled?: boolean;
    onClick: () => void;
  }) => {
    const colorMap = {
      blue:  { row: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",    dot: "bg-blue-500",  icon: "text-blue-500"  },
      amber: { row: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300", dot: "bg-amber-500", icon: "text-amber-500" },
    };
    const cls = colorMap[activeColor];
    return (
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-40 text-gray-400 dark:text-gray-600"
            : active
            ? cls.row
            : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
        }`}
      >
        <span className={disabled ? "text-gray-300 dark:text-gray-600" : active ? cls.icon : "text-gray-400"}>
          {icon}
        </span>
        <span className="flex-1 text-left">{label}</span>
        {active && !disabled && <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cls.dot}`} />}
      </button>
    );
  };

  const Divider = () => <div className="mx-2 my-0.5 border-t border-gray-100 dark:border-gray-800" />;

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="px-2 py-1">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {title}
      </p>
      {children}
    </div>
  );

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      style={{ top: pos.top, left: pos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <Group title="Sort">
        <Item
          icon={<ArrowUp className="h-3.5 w-3.5" />}
          label={isNumeric ? "Sort 1 → 9 (ASC)" : "Sort A → Z (ASC)"}
          active={isAsc}
          disabled={!col.sortable}
          onClick={onSortAsc}
        />
        <Item
          icon={<ArrowDown className="h-3.5 w-3.5" />}
          label={isNumeric ? "Sort 9 → 1 (DESC)" : "Sort Z → A (DESC)"}
          active={isDesc}
          disabled={!col.sortable}
          onClick={onSortDesc}
        />
      </Group>

      <Divider />

      <Group title="Filter">
        <Item
          icon={<Filter className="h-3.5 w-3.5" />}
          label={`Filter by ${col.label}`}
          active={hasFilter}
          activeColor="amber"
          disabled={!col.filterable}
          onClick={onFilter}
        />
      </Group>

      <Divider />

      <Group title="Column">
        <Item
          icon={<EyeOff className="h-3.5 w-3.5" />}
          label="Hide Column"
          onClick={onHide}
        />
        <Item
          icon={<Settings2 className="h-3.5 w-3.5" />}
          label="Manage Columns"
          onClick={onManage}
        />
      </Group>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Filter Input — text or dropdown based on column
═══════════════════════════════════════════════════════════════════════════ */
interface FilterInputProps {
  col: ColumnDef;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  inputRef: (el: HTMLInputElement | HTMLSelectElement | null) => void;
  onFocus: () => void;
  onBlur: () => void;
}

const FilterInput = ({ col, value, onChange, onClear, inputRef, onFocus, onBlur }: FilterInputProps) => {
  const baseClass =
    "w-full rounded-lg border border-gray-200 bg-white py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-amber-500 transition-colors";

  /* Role column → dropdown select */
  if (col.key === "role") {
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
          <option value="">All roles…</option>
          {KNOWN_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
          <option value="Not Specified">Not Specified</option>
        </select>
        {value && (
          <button
            onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear role filter"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  /* Default → text input */
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
};

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════════════════════════ */
const UsersPage = () => {
  const { data: users, isLoading, isError } = useGetUsersQuery();

  /* ── Global search (preserved from original) */
  const [globalSearch, setGlobalSearch] = useState("");

  /* ── Table state (loaded from localStorage) */
  const [columns,    setColumns]    = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters,    setFilters]    = useState<Partial<Record<ColKey, string>>>({});
  const [prefsReady, setPrefsReady] = useState(false);

  /* ── UI state */
  const [activeMenu,      setActiveMenu]      = useState<{ key: ColKey; top: number; left: number } | null>(null);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [filterFocusKey,  setFilterFocusKey]  = useState<ColKey | null>(null);

  const menuRef    = useRef<HTMLDivElement>(null);
  const filterRefs = useRef<Partial<Record<ColKey, HTMLInputElement | HTMLSelectElement>>>({});

  /* ── Hydrate prefs from localStorage */
  useEffect(() => {
    const prefs = loadPrefs();
    setColumns(prefs.columns);
    setSortConfig(prefs.sortConfig);
    setFilters(prefs.filters);
    setPrefsReady(true);
  }, []);

  /* ── Persist prefs on change */
  useEffect(() => {
    if (!prefsReady) return;
    savePrefs({ columns, sortConfig, filters });
  }, [columns, sortConfig, filters, prefsReady]);

  /* ── Close menu on outside click */
  useEffect(() => {
    if (!activeMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setActiveMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeMenu]);

  /* ── Escape closes menu */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setActiveMenu(null); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* ── Auto-focus filter input when activated from menu */
  useEffect(() => {
    if (!filterFocusKey) return;
    const timer = setTimeout(() => filterRefs.current[filterFocusKey]?.focus(), 60);
    return () => clearTimeout(timer);
  }, [filterFocusKey]);

  /* ── Derived: visible columns in order */
  const visibleColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order).filter((c) => c.visible),
    [columns],
  );

  /* ── Dynamic proportional widths */
  const getWidth = (key: ColKey): string => {
    const total = visibleColumns.reduce((s, c) => s + BASE_WIDTHS[c.key], 0);
    return total === 0 ? "auto" : `${((BASE_WIDTHS[key] / total) * 100).toFixed(1)}%`;
  };

  /* ── Derived: processed data (global search + column filters + sort) */
  const processedUsers = useMemo(() => {
    if (!users) return [];
    let result = [...users];

    // Global search (preserved from original)
    const gq = globalSearch.trim().toLowerCase();
    if (gq) {
      result = result.filter(
        (u) =>
          String(u.userId ?? "").includes(gq) ||
          (u.username ?? "").toLowerCase().includes(gq) ||
          (u.roleName ?? "").toLowerCase().includes(gq),
      );
    }

    // Per-column filters
    (Object.entries(filters) as [ColKey, string][]).forEach(([key, value]) => {
      if (!value?.trim()) return;
      const q = value.trim().toLowerCase();
      result = result.filter((u) => {
        if (key === "userId")   return String(u.userId ?? "").includes(q);
        if (key === "username") return (u.username ?? "").toLowerCase().includes(q);
        if (key === "role") {
          if (q === "not specified") return !u.roleName?.trim();
          return (u.roleName ?? "").toLowerCase().includes(q);
        }
        return true;
      });
    });

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let av: string | number, bv: string | number;
        if (sortConfig.key === "userId")   { av = a.userId ?? 0;              bv = b.userId ?? 0;              }
        else if (sortConfig.key === "username") { av = (a.username ?? "").toLowerCase(); bv = (b.username ?? "").toLowerCase(); }
        else if (sortConfig.key === "role") { av = (a.roleName ?? "").toLowerCase(); bv = (b.roleName ?? "").toLowerCase(); }
        else return 0;
        if (av < bv) return sortConfig.dir === "asc" ? -1 : 1;
        if (av > bv) return sortConfig.dir === "asc" ?  1 : -1;
        return 0;
      });
    }

    return result;
  }, [users, globalSearch, filters, sortConfig]);

  const hasColFilters    = Object.values(filters).some((v) => v?.trim());
  const showFilterRow    = hasColFilters || filterFocusKey !== null;
  const hiddenCount      = columns.filter((c) => !c.visible).length;

  /* ── Handlers */
  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, key: ColKey) => {
    e.stopPropagation();
    if (activeMenu?.key === key) { setActiveMenu(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.right - 208), window.innerWidth - 216);
    setActiveMenu({ key, top: rect.bottom + 4, left });
  };

  const handleSort = (key: ColKey, dir: SortDir) => {
    setSortConfig({ key, dir });
    setActiveMenu(null);
  };

  const handleHide = (key: ColKey) => {
    setColumns((prev) => prev.map((c) => c.key === key ? { ...c, visible: false } : c));
    setActiveMenu(null);
  };

  const handleToggleVisible = (key: ColKey) =>
    setColumns((prev) => prev.map((c) => c.key === key ? { ...c, visible: !c.visible } : c));

  const handleReorder = (from: number, to: number) => {
    setColumns((prev) => {
      const arr = [...prev].sort((a, b) => a.order - b.order);
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr.map((c, i) => ({ ...c, order: i }));
    });
  };

  const handleReset = () => {
    setColumns(DEFAULT_COLUMNS);
    setSortConfig(null);
    setFilters({});
    setShowManagePanel(false);
    setActiveMenu(null);
  };

  const handleFilterClick = (key: ColKey) => {
    setFilterFocusKey(key);
    setActiveMenu(null);
  };

  const setFilter   = (key: ColKey, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearAllColFilters = () => { setFilters({}); setFilterFocusKey(null); };

  /* ── Loading */
  if (isLoading) {
    return (
      <div className="flex w-full flex-col p-8">
        <Header name="Users" />
        <div className="mt-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error */
  if (isError || !users) {
    return (
      <div className="flex w-full flex-col p-8">
        <Header name="Users" />
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-6 py-5 text-red-700 dark:text-red-400">
          Failed to load users. Please try again later.
        </div>
      </div>
    );
  }

  /* ── Main render */
  return (
    <div className="flex w-full flex-col p-8">

      {/* Overlays */}
      {showManagePanel && (
        <ManageColumnsPanel
          columns={columns}
          onToggle={handleToggleVisible}
          onReorder={handleReorder}
          onReset={handleReset}
          onClose={() => setShowManagePanel(false)}
        />
      )}

      {activeMenu && (
        <ColumnMenu
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

      <Header name="Users" />

      {/* ── Global search bar (preserved from original) */}
      <div className="mt-5 mb-2">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            id="users-search-input"
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search by ID, username or role…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Status bar: active state pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5 min-h-[24px]">
        {/* Count */}
        {users.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {processedUsers.length} of {users.length} {users.length === 1 ? "user" : "users"}
            {globalSearch && ` · search: "${globalSearch}"`}
          </span>
        )}

        {/* Active sort pill */}
        {sortConfig && (
          <span className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            {sortConfig.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            Sorted: {columns.find((c) => c.key === sortConfig.key)?.label}
            <button onClick={() => setSortConfig(null)} aria-label="Clear sort" className="ml-0.5 rounded-full hover:text-blue-800 dark:hover:text-blue-200">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        {/* Active column filter pill */}
        {hasColFilters && (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Filter className="h-3 w-3" />
            Column filtered
            <button onClick={clearAllColFilters} aria-label="Clear all column filters" className="ml-0.5 rounded-full hover:text-amber-800 dark:hover:text-amber-200">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>

      {/* ── Content */}
      {users.length === 0 ? (
        <EmptyNoUsers />
      ) : processedUsers.length === 0 ? (
        <EmptyNoResults query={globalSearch || Object.values(filters).find(Boolean) || ""} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="overflow-x-auto">

            {/* All columns hidden */}
            {visibleColumns.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <EyeOff className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">All columns are hidden</p>
                <button onClick={handleReset} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                  Reset to default
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <colgroup>
                  {visibleColumns.map((c) => (
                    <col key={c.key} style={{ width: getWidth(c.key) }} />
                  ))}
                </colgroup>

                {/* ═══ THEAD ═══ */}
                <thead>

                  {/* Column header row */}
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                    {visibleColumns.map((col) => {
                      const isSorted   = sortConfig?.key === col.key;
                      const hasColFilt = !!(filters[col.key]?.trim());
                      const menuOpen   = activeMenu?.key === col.key;

                      return (
                        <th
                          key={col.key}
                          className="group/th relative px-4 py-0 text-left"
                        >
                          <div className="flex items-center gap-1.5 py-3.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              {col.label}
                            </span>

                            {/* Sort indicator */}
                            {isSorted && (
                              <span className="flex-shrink-0 text-blue-500">
                                {sortConfig!.dir === "asc"
                                  ? <ArrowUp className="h-3 w-3" />
                                  : <ArrowDown className="h-3 w-3" />}
                              </span>
                            )}

                            {/* Filter active dot */}
                            {hasColFilt && (
                              <span
                                className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-amber-500"
                                title="Column filter active"
                              />
                            )}

                            {/* Three-dot menu button */}
                            <button
                              id={`col-menu-${col.key}`}
                              onClick={(e) => openMenu(e, col.key)}
                              className={`ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-all ${
                                menuOpen
                                  ? "bg-blue-100 text-blue-600 opacity-100 dark:bg-blue-900/40 dark:text-blue-400"
                                  : "text-gray-400 opacity-0 group-hover/th:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                              }`}
                              aria-label={`${col.label} column options`}
                              aria-expanded={menuOpen}
                              aria-haspopup="menu"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>

                  {/* Filter row */}
                  {showFilterRow && (
                    <tr className="border-b border-amber-200/60 bg-amber-50/40 dark:border-amber-800/30 dark:bg-amber-900/10">
                      {visibleColumns.map((col) => (
                        <td key={col.key} className="px-3 py-2">
                          {col.filterable ? (
                            <FilterInput
                              col={col}
                              value={filters[col.key] ?? ""}
                              onChange={(v) => setFilter(col.key, v)}
                              onClear={() => setFilter(col.key, "")}
                              inputRef={(el) => {
                                if (el) filterRefs.current[col.key] = el as HTMLInputElement | HTMLSelectElement;
                              }}
                              onFocus={() => setFilterFocusKey(col.key)}
                              onBlur={() => setFilterFocusKey(null)}
                            />
                          ) : (
                            /* Non-filterable columns (Avatar) — greyed placeholder */
                            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 py-1.5 text-center">
                              <span className="text-[10px] text-gray-300 dark:text-gray-600">—</span>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                </thead>

                {/* ═══ TBODY ═══ */}
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {processedUsers.map((user, idx) => (
                    <tr
                      key={user.userId}
                      className={`transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/40 ${
                        idx % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-gray-50/30 dark:bg-gray-800/10"
                      }`}
                    >
                      {visibleColumns.map((col) => (
                        <td key={col.key} className="px-4 py-3.5">
                          {col.key === "userId" && (
                            <span className="font-mono text-xs font-medium text-gray-500 dark:text-gray-400">
                              #{user.userId}
                            </span>
                          )}
                          {col.key === "avatar" && (
                            <Avatar url={user.profilePictureUrl} username={user.username} />
                          )}
                          {col.key === "username" && (
                            <span className="block truncate font-medium text-gray-800 dark:text-gray-100">
                              {user.username}
                            </span>
                          )}
                          {col.key === "role" && (
                            <RoleBadge role={user.roleName} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Table footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Showing {processedUsers.length} of {users.length} {users.length === 1 ? "user" : "users"}
              {hasColFilters && (
                <>
                  {" · "}
                  <button onClick={clearAllColFilters} className="text-amber-600 hover:underline dark:text-amber-400">
                    clear column filters
                  </button>
                </>
              )}
            </p>

            <div className="flex items-center gap-3">
              {hiddenCount > 0 && (
                <button
                  onClick={() => setShowManagePanel(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  {hiddenCount} hidden
                </button>
              )}
              <button
                id="manage-columns-btn"
                onClick={() => setShowManagePanel(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Columns
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
