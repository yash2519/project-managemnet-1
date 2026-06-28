import React, { useState } from "react";
import { 
  useGetProjectDependenciesPredictionQuery,
  useGetProjectDependencyGraphQuery
} from "@/state/api";
import { AlertTriangle, GitMerge } from "lucide-react";
import RiskSummaryCards from "./components/RiskSummaryCards";
import AIInsightCard from "./components/AIInsightCard";
import CriticalPathCard from "./components/CriticalPathCard";
import BlockedTasksCard from "./components/BlockedTasksCard";
import AffectedTasksCard from "./components/AffectedTasksCard";
import DependencyGraph from "./components/DependencyGraph";
import RecommendationCard from "./components/RecommendationCard";

type Props = {
  id: string;
};

const DependenciesDashboard = ({ id }: Props) => {
  const projectId = Number(id);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Fetch Prediction & Graph
  const { 
    data: predictionResponse, 
    isLoading: isLoadingPrediction, 
    isError: isErrorPrediction, 
    error: errorPrediction 
  } = useGetProjectDependenciesPredictionQuery(projectId);

  const {
    data: graphResponse,
    isLoading: isLoadingGraph,
    isError: isErrorGraph,
    error: errorGraph
  } = useGetProjectDependencyGraphQuery(projectId);

  const isLoading = isLoadingPrediction || isLoadingGraph;
  const isError = isErrorPrediction || isErrorGraph;
  const error = errorPrediction || errorGraph;

  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        <p className="mt-4 text-sm text-gray-500 dark:text-neutral-400">Analyzing Project Dependencies...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center p-8">
        <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Error Loading Dependency Data</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
          {(error as any)?.data?.message || "An unexpected error occurred while fetching dependency analysis."}
        </p>
      </div>
    );
  }

  if (!predictionResponse || !graphResponse || graphResponse.nodes.length === 0) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center p-8">
        <GitMerge className="mb-4 h-12 w-12 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">No Dependencies Found</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
          This project does not have any task dependencies configured yet.
        </p>
      </div>
    );
  }

  const { prediction, aiExplanation, recommendations } = predictionResponse;
  
  // Calculate top-level metrics
  const blockedCount = prediction.allAtRiskTasks.filter(t => t.reasons.some(r => r.toLowerCase().includes("block"))).length;
  const sprintRiskPct = prediction.sprintImpacts.length > 0 
    ? Math.round((prediction.sprintImpacts.filter(s => s.likelyToMissDeadline).length / prediction.sprintImpacts.length) * 100) 
    : 0;

  return (
    <div className="mx-4 mb-4 mt-6 flex flex-col gap-6 xl:mx-6">
      {/* Top Level High-Level Metrics */}
      <RiskSummaryCards 
        riskScore={prediction.riskScore}
        riskLevel={prediction.riskLevel}
        estimatedDelay={prediction.estimatedDelay}
        criticalPathLength={prediction.criticalTasks.length}
        blockedTasksCount={blockedCount}
        affectedTasksCount={prediction.affectedTasks.length}
        sprintRiskPercentage={sprintRiskPct}
      />

      {/* AI Insights & Recommendations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AIInsightCard explanation={aiExplanation} />
        <RecommendationCard recommendations={recommendations} />
      </div>

      {/* Main Content Area: Graph & Lists */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column: Interactive Graph */}
        <div className="xl:col-span-2">
          <DependencyGraph 
            nodes={graphResponse.nodes}
            prediction={prediction}
            onNodeClick={(taskId) => setSelectedTaskId(taskId)}
          />
        </div>

        {/* Right Column: Contextual Lists */}
        <div className="flex flex-col gap-6">
          <BlockedTasksCard 
            allAtRiskTasks={prediction.allAtRiskTasks} 
            selectedTaskId={selectedTaskId}
          />
          <CriticalPathCard 
            criticalTasks={prediction.criticalTasks} 
            selectedTaskId={selectedTaskId}
          />
          {selectedTaskId && (
            <AffectedTasksCard 
              projectId={projectId}
              taskId={selectedTaskId} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DependenciesDashboard;
