import React from "react";
import { Lightbulb } from "lucide-react";

type Props = {
  recommendations: string[];
};

const RecommendationCard = ({ recommendations }: Props) => {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="flex h-full flex-col rounded-xl border border-amber-100 bg-amber-50/30 p-5 dark:border-amber-900/30 dark:bg-amber-900/10">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
          <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Recommendations
        </h3>
      </div>
      <div className="flex flex-1 flex-col justify-center space-y-3">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="flex items-start gap-3 rounded-lg bg-white/60 px-4 py-3 shadow-sm dark:bg-dark-secondary/50">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
              {idx + 1}
            </span>
            <p className="text-sm leading-snug text-gray-700 dark:text-gray-300">{rec}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationCard;
