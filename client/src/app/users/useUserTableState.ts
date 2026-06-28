import { useState, useMemo, useEffect } from "react";
import { User } from "@/state/api";
import { ColumnDef, SortConfig, TablePrefs } from "@/components/data-table/types";

export type UserColKey = "userId" | "avatar" | "username" | "role";

const PREFS_KEY = "users-table-prefs-v1";

export const DEFAULT_COLUMNS: ColumnDef<UserColKey>[] = [
  { key: "userId",   label: "ID",       visible: true, order: 0, sortable: true,  filterable: true, type: "numeric" },
  { key: "avatar",   label: "Avatar",   visible: true, order: 1, sortable: false, filterable: false },
  { key: "username", label: "Username", visible: true, order: 2, sortable: true,  filterable: true, type: "text" },
  { key: "role",     label: "Role",     visible: true, order: 3, sortable: true,  filterable: true, type: "enum" },
];

export const KNOWN_ROLES = ["ADMIN", "MANAGER", "MEMBER"];

export const BASE_WIDTHS: Record<UserColKey, number> = {
  userId:   8,
  avatar:   10,
  username: 42,
  role:     40,
};

function loadPrefs(): TablePrefs<UserColKey> {
  if (typeof window === "undefined")
    return { columns: DEFAULT_COLUMNS, sortConfig: null, filters: {} };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { columns: DEFAULT_COLUMNS, sortConfig: null, filters: {} };
    const p = JSON.parse(raw) as Partial<TablePrefs<UserColKey>>;
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

function savePrefs(prefs: TablePrefs<UserColKey>) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

export function useUserTableState(users: User[] | undefined) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [columns, setColumns] = useState<ColumnDef<UserColKey>[]>(DEFAULT_COLUMNS);
  const [sortConfig, setSortConfig] = useState<SortConfig<UserColKey> | null>(null);
  const [filters, setFilters] = useState<Partial<Record<UserColKey, string>>>({});
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

  const processedUsers = useMemo(() => {
    if (!users) return [];
    let result = [...users];

    const gq = globalSearch.trim().toLowerCase();
    if (gq) {
      result = result.filter(
        (u) =>
          String(u.userId ?? "").includes(gq) ||
          (u.username ?? "").toLowerCase().includes(gq) ||
          (u.roleName ?? "").toLowerCase().includes(gq)
      );
    }

    (Object.entries(filters) as [UserColKey, string][]).forEach(([key, value]) => {
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

    if (sortConfig) {
      result.sort((a, b) => {
        let av: string | number, bv: string | number;
        if (sortConfig.key === "userId")   { av = a.userId ?? 0; bv = b.userId ?? 0; }
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

  const visibleColumns = useMemo(
    () => [...columns].sort((a, b) => a.order - b.order).filter((c) => c.visible),
    [columns]
  );

  const getWidth = (key: UserColKey): string => {
    const total = visibleColumns.reduce((s, c) => s + BASE_WIDTHS[c.key], 0);
    return total === 0 ? "auto" : `${((BASE_WIDTHS[key] / total) * 100).toFixed(1)}%`;
  };

  return {
    globalSearch, setGlobalSearch,
    columns, setColumns,
    sortConfig, setSortConfig,
    filters, setFilters,
    processedUsers, visibleColumns, getWidth,
    hasColFilters: Object.values(filters).some((v) => v?.trim()),
  };
}
