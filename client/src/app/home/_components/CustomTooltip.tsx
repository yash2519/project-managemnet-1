import React from "react";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip text-gray-900 dark:text-gray-100">
      <p className="font-semibold mb-1">{label || payload[0]?.name}</p>
      <p style={{ color: payload[0]?.payload?.fill || "#3B82F6" }} className="text-xs">
        {payload[0]?.value} {payload[0]?.value === 1 ? "task" : "tasks"}
      </p>
    </div>
  );
};

export default CustomTooltip;
