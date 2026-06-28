export const dataGridClassNames =
  "border border-gray-200 bg-white shadow dark:border-stroke-dark dark:bg-dark-secondary dark:text-gray-200";

export const dataGridSxStyles = (isDarkMode: boolean) => {
  return {
    "& .MuiDataGrid-columnHeaders": {
      color: `${isDarkMode ? "#e5e7eb" : ""}`,
      '& [role="row"] > *': {
        backgroundColor: `${isDarkMode ? "#111827" : "white"}`,
        borderColor: `${isDarkMode ? "#1f2937" : "#e5e7eb"}`,
      },
    },
    "& .MuiIconButton-root": {
      color: `${isDarkMode ? "#a3a3a3" : ""}`,
    },
    "& .MuiTablePagination-root": {
      color: `${isDarkMode ? "#a3a3a3" : ""}`,
    },
    "& .MuiTablePagination-selectIcon": {
      color: `${isDarkMode ? "#a3a3a3" : ""}`,
    },
    "& .MuiDataGrid-footerContainer": {
      display: "flex",
      justifyContent: "flex-end",
      padding: "8px 16px",
      borderTop: `1px solid ${isDarkMode ? "#1f2937" : "#e5e7eb"}`,
    },
    "& .MuiTablePagination-toolbar": {
      alignItems: "center",
      display: "flex",
    },
    "& .MuiTablePagination-displayedRows": {
      margin: "0",
      padding: "0 8px",
      fontWeight: "500",
      fontSize: "0.875rem",
      color: `${isDarkMode ? "#9ca3af" : "#6b7280"}`,
    },
    "& .MuiTablePagination-selectLabel": {
      margin: "0",
      padding: "0 8px",
      fontWeight: "500",
      fontSize: "0.875rem",
      color: `${isDarkMode ? "#9ca3af" : "#6b7280"}`,
    },
    "& .MuiDataGrid-cell": {
      border: "none",
    },
    "& .MuiDataGrid-row": {
      borderBottom: `1px solid ${isDarkMode ? "#1f2937" : "#e5e7eb"}`,
    },
    "& .MuiDataGrid-withBorderColor": {
      borderColor: `${isDarkMode ? "#1f2937" : "#e5e7eb"}`,
    },
  };
};

export const formatDate = (date: any): string => {
  if (!date) return "—";

  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
  }

  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return "—";
    }
    const day = String(parsedDate.getDate()).padStart(2, "0");
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const year = parsedDate.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return "—";
  }
};

export const rolePalette: Record<string, { bg: string; text: string }> = {
  default:   { bg: "bg-gray-100 dark:bg-gray-700",          text: "text-gray-600 dark:text-gray-300"   },
  admin:     { bg: "bg-purple-100 dark:bg-purple-900/40",   text: "text-purple-700 dark:text-purple-300" },
  manager:   { bg: "bg-blue-100 dark:bg-blue-900/40",       text: "text-blue-700 dark:text-blue-300"   },
  developer: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
  designer:  { bg: "bg-pink-100 dark:bg-pink-900/40",       text: "text-pink-700 dark:text-pink-300"   },
  member:    { bg: "bg-gray-100 dark:bg-gray-700",          text: "text-gray-600 dark:text-gray-300"   },
};

export const getRoleStyle = (role: string) => {
  const key = role.toLowerCase();
  for (const [k, v] of Object.entries(rolePalette)) {
    if (k !== "default" && key.includes(k)) return v;
  }
  return rolePalette.default;
};

export const getStatusBadgeClass = (status?: string) => {
  switch (status) {
    case "Completed": return "db-badge db-badge-status-completed";
    case "Work In Progress": return "db-badge db-badge-status-in-progress";
    case "Under Review": return "db-badge db-badge-status-review";
    default: return "db-badge db-badge-status-pending";
  }
};

export const getPriorityBadgeClass = (priority?: string) => {
  switch (priority) {
    case "Urgent": return "db-badge db-badge-priority-urgent";
    case "High": return "db-badge db-badge-priority-high";
    case "Medium": return "db-badge db-badge-priority-medium";
    case "Low": return "db-badge db-badge-priority-low";
    default: return "db-badge db-badge-priority-backlog";
  }
};
