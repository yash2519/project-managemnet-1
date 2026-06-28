import React from "react";
import { useGetProjectHealthQuery } from "@/state/api";
import { Activity, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";

type Props = {
  id: string;
};

const HealthView = ({ id }: Props) => {
  const { data, isLoading, isError, error } = useGetProjectHealthQuery(Number(id));

  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        <p className="text-xs text-gray-500 dark:text-neutral-400">Add tasks and activity to unlock AI predictions.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center p-8">
        <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Error Loading Health Data</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
          {(error as any)?.data?.message || "An unexpected error occurred while fetching health data."}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center p-8">
        <Activity className="mb-4 h-12 w-12 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">No Health Data Available</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
          We couldn&apos;t generate a health score for this project.
        </p>
      </div>
    );
  }

  const { score, risk, aiExplanation } = data;

  const getRiskColor = (r: string) => {
    switch (r.toLowerCase()) {
      case "low":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    }
  };

  const getRiskIcon = (r: string) => {
    switch (r.toLowerCase()) {
      case "low":
        return <CheckCircle className="h-5 w-5" />;
      case "medium":
      case "high":
        return <ShieldAlert className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 85) return "text-green-600 dark:text-green-400";
    if (s >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="mx-4 mb-4 mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-secondary dark:bg-dark-secondary xl:mx-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
          <Activity className="h-5 w-5 text-blue-500" />
          Project Health Dashboard
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left Column: Score & Risk */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 dark:border-dark-tertiary dark:bg-dark-tertiary">
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400">
              Overall Health Score
            </h3>
            <div className="flex items-baseline gap-2">
              <span className={`text-6xl font-bold tracking-tight ${getScoreColor(score)}`}>
                {score}
              </span>
              <span className="text-xl font-medium text-gray-400">/ 100</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 dark:border-dark-tertiary dark:bg-dark-tertiary">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400">
              Assessed Risk Level
            </h3>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm ${getRiskColor(
                risk
              )}`}
            >
              {getRiskIcon(risk)}
              {risk.toUpperCase()} RISK
            </div>
          </div>
        </div>

        {/* Right Column: AI Explanation */}
        <div className="flex flex-col rounded-xl border border-blue-100 bg-blue-50/50 p-6 dark:border-blue-900/30 dark:bg-blue-900/10">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <span className="text-lg">✨</span>
            </div>
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              AI Insights
            </h3>
          </div>
          <div className="flex-1 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm leading-relaxed text-gray-700 shadow-sm dark:bg-dark-secondary dark:text-gray-300">
            {aiExplanation}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthView;
