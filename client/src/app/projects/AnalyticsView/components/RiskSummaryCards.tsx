import React from "react";
import { ShieldAlert, CheckCircle, Activity, Clock, Layers, GitPullRequest, GitMerge } from "lucide-react";
import { RiskLevel } from "@/types";

type Props = {
  riskScore: number;
  riskLevel: RiskLevel;
  estimatedDelay: number;
  criticalPathLength: number;
  blockedTasksCount: number;
  affectedTasksCount: number;
  sprintRiskPercentage: number;
};

const RiskSummaryCards = ({
  riskScore,
  riskLevel,
  estimatedDelay,
  criticalPathLength,
  blockedTasksCount,
  affectedTasksCount,
  sprintRiskPercentage
}: Props) => {
  const getRiskColor = (r: RiskLevel) => {
    switch (r) {
      case "Low":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "Medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "High":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "Critical":
        return "bg-red-600 text-white dark:bg-red-600 dark:text-white shadow-lg shadow-red-500/20";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 85) return "text-green-600 dark:text-green-400";
    if (s >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <div className="col-span-2 flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-dark-secondary dark:bg-dark-secondary">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400">Project Risk</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-3xl font-bold tracking-tight ${getScoreColor(riskScore)}`}>{riskScore}</span>
            <span className="text-sm text-gray-400">/ 100</span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${getRiskColor(riskLevel)}`}>
          {riskLevel === "Low" ? <CheckCircle className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          {riskLevel}
        </div>
      </div>

      <MetricCard icon={<Clock className="h-5 w-5 text-amber-500" />} label="Expected Delay" value={`${estimatedDelay}d`} />
      <MetricCard icon={<GitPullRequest className="h-5 w-5 text-purple-500" />} label="Critical Path" value={criticalPathLength} />
      <MetricCard icon={<Activity className="h-5 w-5 text-red-500" />} label="Blocked Tasks" value={blockedTasksCount} />
      <MetricCard icon={<GitMerge className="h-5 w-5 text-blue-500" />} label="Affected Tasks" value={affectedTasksCount} />
    </div>
  );
};

const MetricCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
  <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-dark-secondary dark:bg-dark-secondary">
    <div className="mb-2 flex items-center justify-between">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400">{label}</p>
      {icon}
    </div>
    <span className="text-2xl font-bold text-gray-800 dark:text-white">{value}</span>
  </div>
);

export default RiskSummaryCards;
