"use client";
import { useGetTeamsQuery } from "@/state/api";
import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import ModalNewTeam from "./ModalNewTeam";
import { useRouter } from "next/navigation";
import { Plus, Hash, MoreVertical, ArrowUp, ArrowDown, EyeOff, Filter, Search, X } from "lucide-react";
import { ManageColumnsPanel } from "@/components/data-table/ManageColumnsPanel";
import { ColumnMenu } from "@/components/data-table/ColumnMenu";
import { FilterInput } from "@/components/data-table/FilterInput";
import { EmptyTeams } from "./_components/EmptyStates";
import { MemberBadge } from "./_components/TeamBadges";
import { useTeamTableState, TeamColKey, DEFAULT_COLUMNS } from "./useTeamTableState";

const TeamsPage = () => {
  const { data: teams, isLoading, isError } = useGetTeamsQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const {
    columns, setColumns,
    sortConfig, setSortConfig,
    filters, setFilters,
    processedTeams, visibleColumns, getWidth,
    hasActiveFilters,
  } = useTeamTableState(teams);

  const [activeMenu, setActiveMenu] = useState<{ key: TeamColKey; top: number; left: number } | null>(null);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [filterFocusKey, setFilterFocusKey] = useState<TeamColKey | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const filterRefs = useRef<Partial<Record<TeamColKey, HTMLInputElement | HTMLSelectElement>>>({});

  /* ── Menu & Focus Effects ── */
  useEffect(() => {
    if (!activeMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeMenu]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setActiveMenu(null); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!filterFocusKey) return;
    const timer = setTimeout(() => filterRefs.current[filterFocusKey]?.focus(), 60);
    return () => clearTimeout(timer);
  }, [filterFocusKey]);

  /* ── Handlers ── */
  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, key: TeamColKey) => {
    e.stopPropagation();
    if (activeMenu?.key === key) { setActiveMenu(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.right - 208), window.innerWidth - 216);
    setActiveMenu({ key, top: rect.bottom + 4, left });
  };

  const handleSort = (key: TeamColKey, dir: "asc" | "desc") => { setSortConfig({ key, dir }); setActiveMenu(null); };
  const handleHide = (key: TeamColKey) => { setColumns(c => c.map(col => col.key === key ? { ...col, visible: false } : col)); setActiveMenu(null); };
  const handleToggleVisible = (key: TeamColKey) => setColumns(c => c.map(col => col.key === key ? { ...col, visible: !col.visible } : col));
  const handleReorder = (from: number, to: number) => {
    setColumns(c => {
      const arr = [...c].sort((a, b) => a.order - b.order);
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr.map((col, i) => ({ ...col, order: i }));
    });
  };
  const handleReset = () => {
    setColumns(DEFAULT_COLUMNS);
    setSortConfig(null);
    setFilters({});
    setShowManagePanel(false);
    setActiveMenu(null);
  };
  const handleFilterClick = (key: TeamColKey) => { setFilterFocusKey(key); setActiveMenu(null); };
  const setFilter = (key: TeamColKey, value: string) => setFilters(f => ({ ...f, [key]: value }));
  const clearAllFilters = () => { setFilters({}); setFilterFocusKey(null); };

  const showFilterRow = hasActiveFilters || filterFocusKey !== null;

  const SkeletonRow = ({ n }: { n: number }) => (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      {[...Array(n)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </td>
      ))}
    </tr>
  );

  /* ── Loading & Error States ── */
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

  return (
    <div className="flex w-full flex-col p-8">
      <ModalNewTeam isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Overlays */}
      {showManagePanel && (
        <ManageColumnsPanel<TeamColKey>
          columns={columns}
          onToggle={handleToggleVisible}
          onReorder={handleReorder}
          onReset={handleReset}
          onClose={() => setShowManagePanel(false)}
        />
      )}

      {activeMenu && (
        <ColumnMenu<TeamColKey>
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

      <div className="mt-1 mb-4 flex flex-wrap items-center gap-2.5">
        {teams.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {processedTeams.length} of {teams.length} {teams.length === 1 ? "team" : "teams"}
          </span>
        )}
        {sortConfig && (
          <span className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            {sortConfig.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            Sorted: {columns.find((c) => c.key === sortConfig.key)?.label}
            <button onClick={() => setSortConfig(null)} className="ml-0.5 rounded-full hover:text-blue-800 dark:hover:text-blue-200" aria-label="Clear sort">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        {hasActiveFilters && (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Filter className="h-3 w-3" />
            Filtered
            <button onClick={clearAllFilters} className="ml-0.5 rounded-full hover:text-amber-800 dark:hover:text-amber-200" aria-label="Clear all filters">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>

      {teams.length === 0 ? (
        <EmptyTeams onCreate={() => setIsModalOpen(true)} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="overflow-x-auto">
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
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                    {visibleColumns.map((col) => {
                      const isSorted = sortConfig?.key === col.key;
                      const hasColFilt = !!(filters[col.key]?.trim());
                      const menuOpen = activeMenu?.key === col.key;
                      return (
                        <th key={col.key} className="group/th relative px-5 py-0 text-left">
                          <div className="flex items-center gap-1.5 py-3.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              {col.label}
                            </span>
                            {isSorted && (
                              <span className="flex-shrink-0 text-blue-500">
                                {sortConfig!.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              </span>
                            )}
                            {hasColFilt && <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-amber-500" title="Filter active" />}
                            <button
                              id={`col-menu-${col.key}`}
                              onClick={(e) => openMenu(e, col.key)}
                              className={`ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-all ${
                                menuOpen
                                  ? "bg-blue-100 text-blue-600 opacity-100 dark:bg-blue-900/40 dark:text-blue-400"
                                  : "text-gray-400 opacity-0 group-hover/th:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                              }`}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                  {showFilterRow && (
                    <tr className="border-b border-amber-200/60 bg-amber-50/40 dark:border-amber-800/30 dark:bg-amber-900/10">
                      {visibleColumns.map((col) => (
                        <td key={col.key} className="px-3 py-2">
                          <FilterInput<TeamColKey>
                            col={col}
                            value={filters[col.key] ?? ""}
                            onChange={(v) => setFilter(col.key, v)}
                            onClear={() => setFilter(col.key, "")}
                            inputRef={(el) => { if (el) filterRefs.current[col.key] = el; }}
                            onFocus={() => setFilterFocusKey(col.key)}
                            onBlur={() => setFilterFocusKey(null)}
                          />
                        </td>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {processedTeams.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length} className="px-5 py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            No teams match the current filters
                          </p>
                          <button onClick={clearAllFilters} className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                            Clear filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    processedTeams.map((team, idx) => (
                      <tr
                        key={team.id}
                        className={`group/row transition-colors duration-150 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 ${
                          idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/30 dark:bg-gray-800/10"
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
                              </button>
                            )}
                            {col.key === "admin" && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {team.adminUsername || <span className="text-gray-400 italic font-normal">None</span>}
                                </span>
                              </div>
                            )}
                            {col.key === "memberCount" && <MemberBadge count={team.memberCount || 0} />}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
