import React from "react";
import { useCompareStandupsQuery } from "@/state/api";
import { 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  GitCommit, 
  Lightbulb, 
  TrendingDown, 
  TrendingUp, 
  Users 
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type Props = {
  projectId: number;
  dateA: string;
  dateB: string;
  onClose: () => void;
};

const StandupComparisonView = ({ projectId, dateA, dateB, onClose }: Props) => {
  const { data, isLoading, isError, error } = useCompareStandupsQuery({ 
    projectId, 
    dateA, 
    dateB 
  });

  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        <p className="mt-4 text-sm text-gray-500 dark:text-neutral-400">Loading comparison...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center p-8">
        <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Error Loading Comparison</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
          {(error as any)?.data?.message || "Failed to load standup comparison data."}
        </p>
        <button
          onClick={onClose}
          className="mt-6 flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { reportA, reportB, comparison } = data;
  const { narrativeDiffs, workloadDiff, recommendationDiff, statistics, healthScoreDelta } = comparison;

  const renderDiffMetric = (label: string, delta: number, invertColors = false) => {
    if (delta === 0) return null;
    const isPositive = delta > 0;
    const isGood = invertColors ? !isPositive : isPositive;
    
    return (
      <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
        isGood 
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(delta)} {label}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-3">
          <GitCommit className="h-6 w-6 text-blue-500" />
          Comparison View
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:hover:bg-gray-800"
        >
          Back to History
        </button>
      </div>

      {/* Header comparison card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-dark-secondary dark:bg-dark-secondary flex flex-col items-center">
          <span className="text-sm text-gray-500 dark:text-neutral-400 uppercase tracking-widest font-semibold mb-2">Baseline</span>
          <span className="text-xl font-bold text-gray-800 dark:text-white">{formatDate(reportA.date)}</span>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900/30 dark:bg-blue-900/10 flex flex-col items-center">
          <span className="text-sm text-blue-600 dark:text-blue-400 uppercase tracking-widest font-semibold mb-2">Comparison</span>
          <span className="text-xl font-bold text-blue-800 dark:text-blue-300">{formatDate(reportB.date)}</span>
        </div>
      </div>

      {/* Statistics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm dark:border-dark-tertiary dark:bg-dark-secondary">
          <span className="block text-sm text-gray-500 dark:text-gray-400">Risk Trend</span>
          <span className={`mt-1 block text-lg font-bold uppercase tracking-wider ${
            statistics.riskTrend === "improved" ? "text-green-600 dark:text-green-400" :
            statistics.riskTrend === "degraded" ? "text-red-600 dark:text-red-400" :
            "text-gray-600 dark:text-gray-300"
          }`}>
            {statistics.riskTrend}
          </span>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm dark:border-dark-tertiary dark:bg-dark-secondary">
          <span className="block text-sm text-gray-500 dark:text-gray-400">Health Score</span>
          <span className="mt-1 block text-lg font-bold text-gray-800 dark:text-white flex items-center justify-center gap-1">
            {healthScoreDelta !== null ? (
              <>
                {healthScoreDelta > 0 ? "+" : ""}{healthScoreDelta}
                {healthScoreDelta > 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : 
                 healthScoreDelta < 0 ? <TrendingDown className="h-4 w-4 text-red-500" /> : ""}
              </>
            ) : "N/A"}
          </span>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm dark:border-dark-tertiary dark:bg-dark-secondary">
          <span className="block text-sm text-gray-500 dark:text-gray-400">Workload</span>
          <span className={`mt-1 block text-lg font-bold ${statistics.workloadImproved ? "text-green-600" : "text-gray-800 dark:text-white"}`}>
            {statistics.workloadImproved ? "Improved" : "Mixed"}
          </span>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm dark:border-dark-tertiary dark:bg-dark-secondary">
          <span className="block text-sm text-gray-500 dark:text-gray-400">Sections Changed</span>
          <span className="mt-1 block text-lg font-bold text-gray-800 dark:text-white">
            {statistics.totalSectionsChanged} / 4
          </span>
        </div>
      </div>

      {/* Narrative Diffs */}
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mt-8 mb-4 border-b border-gray-200 dark:border-dark-tertiary pb-2">
        Narrative Changes
      </h3>
      <div className="space-y-6">
        {narrativeDiffs.map((diff, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-dark-secondary dark:bg-dark-secondary">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between dark:bg-dark-tertiary dark:border-dark-tertiary">
              <h4 className="font-semibold text-gray-700 capitalize dark:text-gray-200">
                {diff.section.replace(/([A-Z])/g, ' $1')}
              </h4>
              <div className="flex gap-2">
                {diff.changed ? (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Changed
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    Unchanged
                  </span>
                )}
              </div>
            </div>
            {diff.changed ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-dark-tertiary">
                <div className="p-4 bg-red-50/30 dark:bg-red-900/5">
                  <p className="text-sm whitespace-pre-wrap text-gray-600 dark:text-gray-400">{diff.before || "No data."}</p>
                </div>
                <div className="p-4 bg-green-50/30 dark:bg-green-900/5">
                  <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">{diff.after || "No data."}</p>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-sm whitespace-pre-wrap text-gray-600 dark:text-gray-400">{diff.after || "No data."}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI Recommendations Diff */}
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mt-8 mb-4 border-b border-gray-200 dark:border-dark-tertiary pb-2">
        Recommendations Shift
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/30 dark:bg-red-900/10">
          <h4 className="mb-3 font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" /> Dropped / Resolved
          </h4>
          {recommendationDiff.removed.length > 0 ? (
            <ul className="space-y-2">
              {recommendationDiff.removed.map((r, i) => (
                <li key={i} className="text-sm text-red-800 line-through opacity-70 dark:text-red-300">{r}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-red-600/70 dark:text-red-400/70 italic">None</p>
          )}
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-5 dark:border-green-900/30 dark:bg-green-900/10">
          <h4 className="mb-3 font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> New Focus
          </h4>
          {recommendationDiff.added.length > 0 ? (
            <ul className="space-y-2">
              {recommendationDiff.added.map((r, i) => (
                <li key={i} className="text-sm text-green-800 dark:text-green-300 flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-green-600/70 dark:text-green-400/70 italic">None</p>
          )}
        </div>
      </div>
      
      {recommendationDiff.retained.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-dark-tertiary dark:bg-dark-secondary mt-4">
          <h4 className="mb-3 font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Persisting Recommendations
          </h4>
          <ul className="space-y-2">
            {recommendationDiff.retained.map((r, i) => (
              <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Workload Deltas */}
      {workloadDiff && (
        <>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mt-8 mb-4 border-b border-gray-200 dark:border-dark-tertiary pb-2">
            Workload Delta
          </h3>
          <div className="flex flex-wrap gap-3">
            {renderDiffMetric("Active Tasks", workloadDiff.totalActiveTasksDelta)}
            {renderDiffMetric("Completed Tasks", workloadDiff.totalCompletedTasksDelta)}
            {renderDiffMetric("Blocked Tasks", workloadDiff.totalBlockedTasksDelta, true)}
            {renderDiffMetric("Overloaded Members", workloadDiff.overloadedMembersDelta, true)}
            {renderDiffMetric("Idle Members", workloadDiff.idleMembersDelta, true)}
            {renderDiffMetric("Team Members", workloadDiff.totalMembersDelta)}
          </div>
        </>
      )}
    </div>
  );
};

export default StandupComparisonView;
