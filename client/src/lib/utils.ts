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

