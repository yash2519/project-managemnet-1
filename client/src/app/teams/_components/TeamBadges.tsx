import React from "react";
import { Users } from "lucide-react";

export const MemberBadge = ({ count }: { count: number }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
    <Users className="h-3 w-3" />
    {count} {count === 1 ? "member" : "members"}
  </span>
);
