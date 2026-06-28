"use client";
import { useGetUsersQuery } from "@/state/api";
import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import { Search, X, MoreVertical, ArrowUp, ArrowDown, EyeOff, Filter } from "lucide-react";
import { ManageColumnsPanel } from "@/components/data-table/ManageColumnsPanel";
import { ColumnMenu } from "@/components/data-table/ColumnMenu";
import { FilterInput } from "@/components/data-table/FilterInput";
import { RoleBadge, Avatar } from "./_components/UserBadges";
import { EmptyNoUsers, EmptyNoResults } from "./_components/EmptyStates";
import { useUserTableState, UserColKey, KNOWN_ROLES, DEFAULT_COLUMNS } from "./useUserTableState";

const UsersPage = () => {
  const { data: users, isLoading, isError } = useGetUsersQuery();

  const {
    globalSearch, setGlobalSearch,
    columns, setColumns,
    sortConfig, setSortConfig,
    filters, setFilters,
    processedUsers, visibleColumns, getWidth,
    hasColFilters,
  } = useUserTableState(users);

  const [activeMenu, setActiveMenu] = useState<{ key: UserColKey; top: number; left: number } | null>(null);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [filterFocusKey, setFilterFocusKey] = useState<UserColKey | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const filterRefs = useRef<Partial<Record<UserColKey, HTMLInputElement | HTMLSelectElement>>>({});

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
  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, key: UserColKey) => {
    e.stopPropagation();
    if (activeMenu?.key === key) { setActiveMenu(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.right - 208), window.innerWidth - 216);
    setActiveMenu({ key, top: rect.bottom + 4, left });
  };

  const handleSort = (key: UserColKey, dir: "asc" | "desc") => { setSortConfig({ key, dir }); setActiveMenu(null); };
  const handleHide = (key: UserColKey) => { setColumns(c => c.map(col => col.key === key ? { ...col, visible: false } : col)); setActiveMenu(null); };
  const handleToggleVisible = (key: UserColKey) => setColumns(c => c.map(col => col.key === key ? { ...col, visible: !col.visible } : col));
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
  const handleFilterClick = (key: UserColKey) => { setFilterFocusKey(key); setActiveMenu(null); };
  const setFilter = (key: UserColKey, value: string) => setFilters(f => ({ ...f, [key]: value }));
  const clearAllColFilters = () => { setFilters({}); setFilterFocusKey(null); };

  const showFilterRow = hasColFilters || filterFocusKey !== null;

  /* ── Loading & Error States ── */
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

  return (
    <div className="flex w-full flex-col p-8">
      {/* Overlays */}
      {showManagePanel && (
        <ManageColumnsPanel<UserColKey>
          columns={columns}
          onToggle={handleToggleVisible}
          onReorder={handleReorder}
          onReset={handleReset}
          onClose={() => setShowManagePanel(false)}
        />
      )}

      {activeMenu && (
        <ColumnMenu<UserColKey>
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

      {/* Global Search */}
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

      {/* Status Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5 min-h-[24px]">
        {users.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {processedUsers.length} of {users.length} {users.length === 1 ? "user" : "users"}
            {globalSearch && ` · search: "${globalSearch}"`}
          </span>
        )}
        {sortConfig && (
          <span className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            {sortConfig.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            Sorted: {columns.find((c) => c.key === sortConfig.key)?.label}
            <button onClick={() => setSortConfig(null)} aria-label="Clear sort" className="ml-0.5 rounded-full hover:text-blue-800 dark:hover:text-blue-200">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
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

      {/* Content */}
      {users.length === 0 ? (
        <EmptyNoUsers />
      ) : processedUsers.length === 0 ? (
        <EmptyNoResults query={globalSearch || Object.values(filters).find(Boolean) || ""} />
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
                          <FilterInput<UserColKey>
                            col={col}
                            value={filters[col.key] ?? ""}
                            onChange={(v) => setFilter(col.key, v)}
                            onClear={() => setFilter(col.key, "")}
                            inputRef={(el) => { if (el) filterRefs.current[col.key] = el; }}
                            onFocus={() => setFilterFocusKey(col.key)}
                            onBlur={() => setFilterFocusKey(null)}
                            knownOptions={KNOWN_ROLES}
                          />
                        </td>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {processedUsers.map((u, idx) => (
                    <tr
                      key={u.userId}
                      className={`transition-colors duration-150 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 ${
                        idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/30 dark:bg-gray-800/10"
                      }`}
                    >
                      {visibleColumns.map((col) => (
                        <td key={col.key} className="px-5 py-4">
                          {col.key === "userId" && (
                            <span className="font-mono text-xs text-gray-500">{u.userId}</span>
                          )}
                          {col.key === "avatar" && (
                            <Avatar url={u.profilePictureUrl} username={u.username} />
                          )}
                          {col.key === "username" && (
                            <span className="font-medium text-gray-900 dark:text-gray-100">{u.username}</span>
                          )}
                          {col.key === "role" && <RoleBadge role={u.roleName} />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
