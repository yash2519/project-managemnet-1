import React, { useState } from "react";
import { useGetStandupHistoryQuery } from "@/state/api";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  GitCommit, 
  Hash, 
  Search, 
  Sparkles 
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type Props = {
  projectId: number;
  onSelectDate: (date: string) => void;
  onCompare: (dateA: string, dateB: string) => void;
};

const StandupHistoryPanel = ({ projectId, onSelectDate, onCompare }: Props) => {
  const [page, setPage] = useState(1);
  const [searchDate, setSearchDate] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  // Apply search/filters
  const appliedStartDate = searchDate || undefined;
  const appliedEndDate = searchDate || undefined;
  
  const { data, isLoading, isFetching } = useGetStandupHistoryQuery({
    projectId,
    page,
    limit: 10,
    startDate: appliedStartDate,
    endDate: appliedEndDate,
    sprintId: sprintId ? Number(sprintId) : undefined,
  });

  const toggleCompareSelect = (date: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(date)) return prev.filter(d => d !== date);
      if (prev.length >= 2) return [prev[1], date]; // Keep last 2
      return [...prev, date];
    });
  };

  const handleCompareSubmit = () => {
    if (selectedForCompare.length === 2) {
      onCompare(selectedForCompare[0], selectedForCompare[1]);
      setCompareMode(false);
      setSelectedForCompare([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Filter Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-secondary dark:bg-dark-secondary">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Search by Date</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={searchDate}
                onChange={(e) => {
                  setSearchDate(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-48 rounded-md border border-gray-300 bg-transparent py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none dark:border-dark-tertiary dark:text-white dark:[color-scheme:dark]"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1 opacity-60">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400" title="Coming soon">Sprint (Disabled)</label>
            <div className="relative">
              <Hash className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                disabled
                placeholder="N/A"
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="w-full sm:w-32 cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 py-1.5 pl-9 pr-3 text-sm dark:border-dark-tertiary dark:bg-gray-800 dark:text-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {compareMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedForCompare.length} / 2 selected
              </span>
              <button
                onClick={() => {
                  setCompareMode(false);
                  setSelectedForCompare([]);
                }}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-tertiary"
              >
                Cancel
              </button>
              <button
                onClick={handleCompareSubmit}
                disabled={selectedForCompare.length !== 2}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <GitCommit className="h-4 w-4" /> Compare
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCompareMode(true)}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:hover:bg-gray-800"
            >
              <GitCommit className="h-4 w-4" /> Compare Mode
            </button>
          )}
        </div>
      </div>

      {/* ── Timeline List ─────────────────────────────────────────── */}
      <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent dark:before:via-dark-tertiary">
        {isLoading || isFetching ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
          </div>
        ) : data?.data && data.data.length > 0 ? (
          data.data.map((item) => {
            const isSelected = selectedForCompare.includes(item.date as string);
            
            // Extract lightweight metadata for card
            const health = item.analysisContext?.analytics?.health || item.analysisContext?.healthSummary;
            const healthScore = health?.overallScore ?? health?.score;
            const workload = item.analysisContext?.analytics?.workload || item.analysisContext?.workloadSummary;
            const completedCount = workload?.teamSummary?.totalCompletedTasks ?? 0;
            const blockedCount = workload?.teamSummary?.totalBlockedTasks ?? 0;

            return (
              <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Timeline dot */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-dark-bg bg-blue-100 dark:bg-blue-900/50 text-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-500 text-white border-white dark:border-dark-bg' : ''
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                
                {/* Card */}
                <div 
                  className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] rounded-xl border p-5 shadow-sm transition-all cursor-pointer ${
                    isSelected 
                      ? "border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-900/20 ring-1 ring-blue-500" 
                      : compareMode
                        ? "border-gray-200 bg-white hover:border-blue-300 dark:border-dark-secondary dark:bg-dark-secondary"
                        : "border-gray-200 bg-white hover:shadow-md hover:-translate-y-1 dark:border-dark-secondary dark:bg-dark-secondary"
                  }`}
                  onClick={() => compareMode ? toggleCompareSelect(item.date as string) : onSelectDate(item.date as string)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                      {formatDate(item.date)}
                    </h3>
                    <div className="flex items-center gap-2">
                      {item.isRegenerated && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Regenerated
                        </span>
                      )}
                      {compareMode && (
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                    {item.summary?.yesterday || "No standup content recorded."}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                    <span className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-gray-600 dark:bg-dark-tertiary dark:text-gray-300">
                      <Sparkles className="h-3 w-3 text-violet-500" />
                      {item.aiRecommendations?.length || 0} Recs
                    </span>
                    <span className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      {completedCount} Completed
                    </span>
                    {blockedCount > 0 && (
                      <span className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                        {blockedCount} Blocked
                      </span>
                    )}
                    {healthScore !== undefined && healthScore !== null && (
                      <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        Health: {healthScore}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-tertiary flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>By {item.author?.username || "System"}</span>
                    <span>v{item.generationVersion}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 relative z-10 bg-gray-50 dark:bg-dark-bg">
            No standup history found.
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────── */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-200 dark:border-dark-secondary">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-dark-tertiary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Page {page} of {data.pagination.totalPages}
          </span>
          <button
            disabled={page === data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-dark-tertiary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default StandupHistoryPanel;
