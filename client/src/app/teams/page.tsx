"use client";
import { useGetTeamsQuery } from "@/state/api";
import React, { useState, useMemo, useEffect, useRef } from "react";
import Header from "@/components/Header";
import ModalNewTeam from "./ModalNewTeam";
import { useRouter } from "next/navigation";
import {
  Users, Plus, ChevronRight, Hash, MoreVertical,
  ArrowUp, ArrowDown, EyeOff, Settings2, Filter,
  X, RotateCcw, GripVertical, SlidersHorizontal, Search,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════════════════ */
type ColKey = "id" | "teamName" | "admin" | "memberCount";
type SortDir = "asc" | "desc";

interface ColumnDef {
  key: ColKey;
  label: string;
  visible: boolean;
  order: number;
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
const PREFS_KEY = "teams-table-prefs-v1";

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "id", label: "Team ID", visible: true, order: 0 },
  { key: "teamName", label: "Team Name", visible: true, order: 1 },
  { key: "admin", label: "Admin", visible: true, order: 2 },
  { key: "memberCount", label: "Members", visible: true, order: 3 },
];

/* Proportional base widths (sum = 100) */
const BASE_WIDTHS: Record<ColKey, number> = { id: 12, teamName: 40, admin: 25, memberCount: 23 };

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
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Skeleton
═══════════════════════════════════════════════════════════════════════════ */
const SkeletonRow = ({ n }: { n: number }) => (
  <tr className="border-b border-gray-100 dark:border-gray-800">
    {[...Array(n)].map((_, i) => (
      <td key={i} className="px-5 py-4">
        <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      </td>
    ))}
  </tr>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Empty State
═══════════════════════════════════════════════════════════════════════════ */
const EmptyTeams = ({ onCreate }: { onCreate: () => void }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-8 py-20 text-center">
    <div className="relative mb-6">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-inner">
        <Users className="h-12 w-12 text-blue-400 dark:text-blue-500" />
      </div>
      <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-md">
        <span className="text-base">🚀</span>
      </div>
    </div>
    <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-100">No teams yet</h3>
    <p className="mb-6 max-w-xs text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
      Teams help organise users around projects. Create your first team to get started.
    </p>
    <button
      onClick={onCreate}
      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
    >
      <Plus className="h-4 w-4" />
      Create First Team
    </button>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Member Badge
═══════════════════════════════════════════════════════════════════════════ */
const MemberBadge = ({ count }: { count: number }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
    <Users className="h-3 w-3" />
    {count} {count === 1 ? "member" : "members"}
  </span>
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-950 animate-in slide-in-from-right duration-200">

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
                className={`flex cursor-grab items-center gap-3 rounded-xl border px-3 py-2.5 transition-all select-none active:cursor-grabbing ${overIdx === idx && dragIdx !== idx
                    ? "scale-[1.02] border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20"
                    : dragIdx === idx
                      ? "border-dashed border-gray-300 opacity-40 dark:border-gray-600"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                  }`}
              >
                <GripVertical className="h-4 w-4 flex-shrink-0 text-gray-350 dark:text-gray-500" />

                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggle(col.key); }}
                  className={`relative flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none ${col.visible ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  aria-label={`${col.visible ? "Hide" : "Show"} ${col.label}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${col.visible ? "left-[18px]" : "left-0.5"
                      }`}
                  />
                </button>

                <span
                  className={`flex-1 text-sm font-medium transition-colors ${col.visible
                      ? "text-gray-800 dark:text-gray-100"
                      : "text-gray-400 line-through dark:text-gray-600"
                    }`}
                >
                  {col.label}
                </span>

                {col.visible && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">visible</span>
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
  colKey: ColKey;
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
  colKey, pos, sortConfig, hasFilter,
  onSortAsc, onSortDesc, onFilter, onHide, onManage, menuRef,
}: ColMenuProps) => {
  const isAsc = sortConfig?.key === colKey && sortConfig.dir === "asc";
  const isDesc = sortConfig?.key === colKey && sortConfig.dir === "desc";
  const isNumeric = colKey === "id" || colKey === "memberCount";

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="px-2 py-1">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {title}
      </p>
      {children}
    </div>
  );

  type ItemProps = {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    activeColor?: "blue" | "amber";
    onClick: () => void;
  };

  const Item = ({ icon, label, active, activeColor = "blue", onClick }: ItemProps) => {
    const colorMap = {
      blue: { row: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300", dot: "bg-blue-500", icon: "text-blue-500" },
      amber: { row: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300", dot: "bg-amber-500", icon: "text-amber-500" },
    };
    const cls = colorMap[activeColor];
    return (
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${active
            ? cls.row
            : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
          }`}
      >
        <span className={active ? cls.icon : "text-gray-400"}>{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        {active && <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cls.dot}`} />}
      </button>
    );
  };

  const Divider = () => (
    <div className="mx-2 my-0.5 border-t border-gray-100 dark:border-gray-800" />
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
          onClick={onSortAsc}
        />
        <Item
          icon={<ArrowDown className="h-3.5 w-3.5" />}
          label={isNumeric ? "Sort 9 → 1 (DESC)" : "Sort Z → A (DESC)"}
          active={isDesc}
          onClick={onSortDesc}
        />
      </Group>

      <Divider />

      <Group title="Filter">
        <Item
          icon={<Filter className="h-3.5 w-3.5" />}
          label={`Filter by ${colKey === "id" ? "ID" : colKey === "teamName" ? "Name" : colKey === "admin" ? "Admin" : "Members"}`}
          active={hasFilter}
          activeColor="amber"
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
   Main Page
═══════════════════════════════════════════════════════════════════════════ */
const TeamsPage = () => {
  const { data: teams, isLoading, isError } = useGetTeamsQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  /* ── Table state (hydrated from localStorage in useEffect) */
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<Partial<Record<ColKey, string>>>({});
  const [prefsReady, setPrefsReady] = useState(false);

  /* ── UI state */
  const [activeMenu, setActiveMenu] = useState<{ key: ColKey; top: number; left: number } | null>(null);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [filterFocusKey, setFilterFocusKey] = useState<ColKey | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const filterRefs = useRef<Partial<Record<ColKey, HTMLInputElement>>>({});

  /* ── Load preferences from localStorage on mount */
  useEffect(() => {
    const prefs = loadPrefs();
    setColumns(prefs.columns);
    setSortConfig(prefs.sortConfig);
    setFilters(prefs.filters);
    setPrefsReady(true);
  }, []);

  /* ── Persist preferences whenever they change */
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

  /* ── Auto-focus filter input when activated via menu */
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

  /* ── Derived: proportional widths for visible set */
  const getWidth = (key: ColKey): string => {
    const total = visibleColumns.reduce((s, c) => s + BASE_WIDTHS[c.key], 0);
    return total === 0 ? "auto" : `${((BASE_WIDTHS[key] / total) * 100).toFixed(1)}%`;
  };

  /* ── Derived: filtered + sorted data */
  const processedTeams = useMemo(() => {
    if (!teams) return [];
    let result = [...teams];

    // Filter
    (Object.entries(filters) as [ColKey, string][]).forEach(([key, value]) => {
      if (!value?.trim()) return;
      const q = value.trim().toLowerCase();
      result = result.filter((t) => {
        if (key === "id") return String(t.id).includes(q);
        if (key === "teamName") return t.teamName.toLowerCase().includes(q);
        if (key === "admin") return (t.adminUsername ?? "").toLowerCase().includes(q);
        if (key === "memberCount") return String(t.memberCount ?? 0).includes(q);
        return true;
      });
    });

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let av: string | number, bv: string | number;
        if (sortConfig.key === "id") { av = a.id; bv = b.id; }
        else if (sortConfig.key === "teamName") { av = a.teamName.toLowerCase(); bv = b.teamName.toLowerCase(); }
        else if (sortConfig.key === "admin") { av = (a.adminUsername ?? "").toLowerCase(); bv = (b.adminUsername ?? "").toLowerCase(); }
        else { av = a.memberCount ?? 0; bv = b.memberCount ?? 0; }
        if (av < bv) return sortConfig.dir === "asc" ? -1 : 1;
        if (av > bv) return sortConfig.dir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [teams, filters, sortConfig]);

  const hasActiveFilters = Object.values(filters).some((v) => v?.trim());
  const showFilterRow = hasActiveFilters || filterFocusKey !== null;
  const hiddenCount = columns.filter((c) => !c.visible).length;

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

  const setFilter = (key: ColKey, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearAllFilters = () => { setFilters({}); setFilterFocusKey(null); };

  /* ── Loading */
  if (isLoading) {
    return (
      <div className="flex w-full flex-col p-8">
        <Header name="Teams" />
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col style={{ width: "12%" }} />
              <col style={{ width: "58%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                {DEFAULT_COLUMNS.map((c) => (
                  <th key={c.key} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{[...Array(4)].map((_, i) => <SkeletonRow key={i} n={3} />)}</tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── Error */
  if (isError || !teams) {
    return (
      <div className="flex w-full flex-col p-8">
        <Header name="Teams" />
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-6 py-5 text-red-700 dark:text-red-400">
          Failed to load teams. Please try again later.
        </div>
      </div>
    );
  }

  /* ── Main render */
  return (
    <div className="flex w-full flex-col p-8">

      {/* Modals & overlays */}
      <ModalNewTeam isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

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
          colKey={activeMenu.key}
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

      {/* ── Page Header */}
      <Header
        name="Teams"
        buttonComponent={
          <button
            id="create-team-btn"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Team
          </button>
        }
      />

      {/* ── Status bar: count + active state pills */}
      <div className="mt-1 mb-4 flex flex-wrap items-center gap-2.5">
        {teams.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {processedTeams.length} of {teams.length} {teams.length === 1 ? "team" : "teams"}
          </span>
        )}

        {sortConfig && (
          <span className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            {sortConfig.dir === "asc"
              ? <ArrowUp className="h-3 w-3" />
              : <ArrowDown className="h-3 w-3" />}
            Sorted: {columns.find((c) => c.key === sortConfig.key)?.label}
            <button
              onClick={() => setSortConfig(null)}
              className="ml-0.5 rounded-full hover:text-blue-800 dark:hover:text-blue-200"
              aria-label="Clear sort"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        {hasActiveFilters && (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Filter className="h-3 w-3" />
            Filtered
            <button
              onClick={clearAllFilters}
              className="ml-0.5 rounded-full hover:text-amber-800 dark:hover:text-amber-200"
              aria-label="Clear all filters"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>

      {/* ── Content */}
      {teams.length === 0 ? (
        <EmptyTeams onCreate={() => setIsModalOpen(true)} />
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

                  {/* Column headers */}
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                    {visibleColumns.map((col) => {
                      const isSorted = sortConfig?.key === col.key;
                      const hasColFilt = !!(filters[col.key]?.trim());
                      const menuOpen = activeMenu?.key === col.key;

                      return (
                        <th
                          key={col.key}
                          className="group/th relative px-5 py-0 text-left"
                        >
                          <div className="flex items-center gap-1.5 py-3.5">
                            {/* Label */}
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

                            {/* Filter dot */}
                            {hasColFilt && (
                              <span
                                className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-amber-500"
                                title="Filter active"
                              />
                            )}

                            {/* Three-dot menu button */}
                            <button
                              id={`col-menu-${col.key}`}
                              onClick={(e) => openMenu(e, col.key)}
                              className={`ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-all ${menuOpen
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

                  {/* Filter row (shown when any filter active or focused) */}
                  {showFilterRow && (
                    <tr className="border-b border-amber-200/60 bg-amber-50/40 dark:border-amber-800/30 dark:bg-amber-900/10">
                      {visibleColumns.map((col) => (
                        <td key={col.key} className="px-3 py-2">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                            <input
                              ref={(el) => { if (el) filterRefs.current[col.key] = el; }}
                              id={`filter-${col.key}`}
                              type="text"
                              value={filters[col.key] ?? ""}
                              onChange={(e) => setFilter(col.key, e.target.value)}
                              onFocus={() => setFilterFocusKey(col.key)}
                              onBlur={() => setFilterFocusKey(null)}
                              placeholder={`Filter ${col.label}…`}
                              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-7 pr-7 text-xs text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-amber-500 transition-colors"
                            />
                            {filters[col.key] && (
                              <button
                                onClick={() => setFilter(col.key, "")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                aria-label={`Clear ${col.label} filter`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  )}
                </thead>

                {/* ═══ TBODY ═══ */}
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {processedTeams.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length} className="px-5 py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            No teams match the current filters
                          </p>
                          <button
                            onClick={clearAllFilters}
                            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                          >
                            Clear filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    processedTeams.map((team, idx) => (
                      <tr
                        key={team.id}
                        className={`group/row transition-colors duration-150 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 ${idx % 2 === 0
                            ? "bg-white dark:bg-gray-900"
                            : "bg-gray-50/30 dark:bg-gray-800/10"
                          }`}
                      >
                        {visibleColumns.map((col) => (
                          <td key={col.key} className="px-5 py-4">
                            {col.key === "id" && (
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-gray-400 dark:text-gray-500">
                                <Hash className="h-3 w-3" />
                                {team.id}
                              </span>
                            )}
                            {col.key === "teamName" && (
                              <button
                                onClick={() => router.push(`/teams/${team.id}`)}
                                className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group/name"
                              >
                                {team.teamName}
                                <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                              </button>
                            )}
                            {col.key === "admin" && (
                              <span className="text-gray-800 dark:text-gray-100 font-medium text-sm">
                                {team.adminUsername ?? "—"}
                              </span>
                            )}
                            {col.key === "memberCount" && (
                              <MemberBadge count={team.memberCount ?? 0} />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Table footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Showing {processedTeams.length} of {teams.length}{" "}
              {teams.length === 1 ? "team" : "teams"}
              {hasActiveFilters && (
                <> · <button onClick={clearAllFilters} className="text-amber-600 hover:underline dark:text-amber-400">clear filters</button></>
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

export default TeamsPage;
