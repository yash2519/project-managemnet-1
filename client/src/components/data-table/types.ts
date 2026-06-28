export type SortDir = "asc" | "desc";

export interface ColumnDef<TKey extends string = string> {
  key: TKey;
  label: string;
  visible: boolean;
  order: number;
  sortable?: boolean;
  filterable?: boolean;
  type?: "numeric" | "text" | "enum";
}

export interface SortConfig<TKey extends string = string> {
  key: TKey;
  dir: SortDir;
}

export interface TablePrefs<TKey extends string = string> {
  columns: ColumnDef<TKey>[];
  sortConfig: SortConfig<TKey> | null;
  filters: Partial<Record<TKey, string>>;
}
