import React from "react";
import { useGetProjectDependenciesPredictionQuery } from "@/state/api";
import { Sparkles, Activity, Clock, ShieldAlert, GitBranch, ArrowRight, CheckCircle, GitMerge } from "lucide-react";
import { RiskLevel } from "@/types";

type Props = {
  projectId: number;
  onViewAnalytics: () => void;
};

const ProjectAIOverview = ({ projectId, onViewAnalytics }: Props) => {
  const { data: predictionResponse, isLoading, isError } = useGetProjectDependenciesPredictionQuery(projectId);

  if (isLoading) {
    return (
      <div className="mx-4 mb-2 mt-4 animate-pulse rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-secondary dark:bg-dark-secondary xl:mx-6">
        <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          <div className="h-16 rounded bg-gray-100 dark:bg-dark-tertiary"></div>
          <div className="h-16 rounded bg-gray-100 dark:bg-dark-tertiary"></div>
          <div className="h-16 rounded bg-gray-100 dark:bg-dark-tertiary"></div>
          <div className="h-16 rounded bg-gray-100 dark:bg-dark-tertiary"></div>
          <div className="h-16 rounded bg-gray-100 dark:bg-dark-tertiary"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return null; // Fail silently so we don't break the main project page
  }

  const hasDependencies = predictionResponse && predictionResponse.affectedTasks && predictionResponse.prediction.allAtRiskTasks;
  const isGraphEmpty = !predictionResponse || (predictionResponse.affectedTasks.length === 0 && predictionResponse.prediction.allAtRiskTasks.length === 0);

  if (isGraphEmpty) {
    return (
      <div className="mx-4 mb-2 mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm dark:border-dark-secondary dark:bg-dark-secondary xl:mx-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <Sparkles className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">AI Project Insights</h3>
            <p className="text-xs text-gray-500 dark:text-neutral-400">Add dependencies between tasks to unlock AI failure prediction and risk analysis.</p>
          </div>
        </div>
        <button 
          onClick={onViewAnalytics}
          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Manage Dependencies
        </button>
      </div>
    );
  }

  const { prediction, aiExplanation } = predictionResponse;

  const getRiskColor = (r: RiskLevel) => {
    switch (r) {
      case "Low":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "Medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "High":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "Critical":
        return "bg-red-600 text-white dark:bg-red-600 dark:text-white";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 85) return "text-green-600 dark:text-green-400";
    if (s >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const blockedCount = prediction.allAtRiskTasks.filter(t => t.reasons.some(r => r.toLowerCase().includes("block"))).length;
  // Get first sentence of AI explanation for brevity
  const briefInsight = aiExplanation.split(".")[0] + ".";

  return (
    <div className="mx-4 mb-2 mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-dark-secondary dark:bg-dark-secondary xl:mx-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">AI Project Overview</h2>
        </div>
        <button 
          onClick={onViewAnalytics}
          className="group flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400"
        >
          View Full Analytics
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        
        {/* Metric 1: Risk */}
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-dark-tertiary">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${getRiskColor(prediction.riskLevel)}`}>
            {prediction.riskLevel === "Low" ? <CheckCircle className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400">Dependency Risk</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-lg font-bold ${getScoreColor(prediction.riskScore)}`}>{prediction.riskScore}</span>
              <span className="text-xs text-gray-400">/100</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Estimated Delay */}
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-dark-tertiary">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400">Est. Delay</p>
            <p className="text-lg font-bold text-gray-800 dark:text-white">{prediction.estimatedDelay} days</p>
          </div>
        </div>

        {/* Metric 3: Blocked Tasks */}
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-dark-tertiary">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400">Blocked Tasks</p>
            <p className="text-lg font-bold text-gray-800 dark:text-white">{blockedCount}</p>
          </div>
        </div>

        {/* Metric 4: Critical Path */}
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-dark-tertiary">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <GitMerge className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400">Critical Path</p>
            <p className="text-lg font-bold text-gray-800 dark:text-white">{prediction.criticalTasks.length} tasks</p>
          </div>
        </div>

        {/* AI Summary Insight */}
        <div className="flex flex-col justify-center rounded-lg border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/30 dark:bg-blue-900/10 lg:col-span-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">AI Insight</p>
          <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-gray-700 dark:text-gray-300" title={aiExplanation}>
            &quot;{briefInsight}&quot;
          </p>
        </div>

      </div>
    </div>
  );
};

export default ProjectAIOverview;
