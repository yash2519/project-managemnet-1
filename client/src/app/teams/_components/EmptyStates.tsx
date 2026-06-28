import React from "react";
import { Users, Plus } from "lucide-react";

export const EmptyTeams = ({ onCreate }: { onCreate: () => void }) => (
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
