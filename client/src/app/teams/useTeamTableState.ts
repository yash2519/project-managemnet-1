import { useState, useMemo, useEffect } from "react";
import { Team } from "@/state/api";
import { ColumnDef, SortConfig, TablePrefs } from "@/components/data-table/types";

export type TeamColKey = "id" | "teamName" | "admin" | "memberCount";

const PREFS_KEY = "teams-table-prefs-v1";

export const DEFAULT_COLUMNS: ColumnDef<TeamColKey>[] = [
  { key: "id", label: "Team ID", visible: true, order: 0, type: "numeric" },
  { key: "teamName", label: "Team Name", visible: true, order: 1, type: "text" },
  { key: "admin", label: "Admin", visible: true, order: 2, type: "text" },
  { key: "memberCount", label: "Members", visible: true, order: 3, type: "numeric" },
];

export const BASE_WIDTHS: Record<TeamColKey, number> = { id: 12, teamName: 40, admin: 25, memberCount: 23 };

function loadPrefs(): TablePrefs<TeamColKey> {
  if (typeof window === "undefined")
    return { columns: DEFAULT_COLUMNS, sortConfig: null, filters: {} };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { columns: DEFAULT_COLUMNS, sortConfig: null, filters: {} };
    const p = JSON.parse(raw) as Partial<TablePrefs<TeamColKey>>;
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

function savePrefs(prefs: TablePrefs<TeamColKey>) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { }
}

export function useTeamTableState(teams: Team[] | undefined) {
  const [columns, setColumns] = useState<ColumnDef<TeamColKey>[]>(DEFAULT_COLUMNS);
  const [sortConfig, setSortConfig] = useState<SortConfig<TeamColKey> | null>(null);
  const [filters, setFilters] = useState<Partial<Record<TeamColKey, string>>>({});
  const [prefsReady, setPrefsReady] = useState(false);

  useEffect(() => {
    const prefs = loadPrefs();
    setColumns(prefs.columns);
    setSortConfig(prefs.sortConfig);
    setFilters(prefs.filters);
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    savePrefs({ columns, sortConfig, filters });
  }, [columns, sortConfig, filters, prefsReady]);

  const processedTeams = useMemo(() => {
    if (!teams) return [];
    let result = [...teams];

    (Object.entries(filters) as [TeamColKey, string][]).forEach(([key, value]) => {
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

  const visibleColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order).filter((c) => c.visible),
    [columns]
  );

  const getWidth = (key: TeamColKey): string => {
    const total = visibleColumns.reduce((s, c) => s + BASE_WIDTHS[c.key], 0);
    return total === 0 ? "auto" : `${((BASE_WIDTHS[key] / total) * 100).toFixed(1)}%`;
  };

  return {
    columns, setColumns,
    sortConfig, setSortConfig,
    filters, setFilters,
    processedTeams, visibleColumns, getWidth,
    hasActiveFilters: Object.values(filters).some((v) => v?.trim()),
  };
}
