import React from "react";
import { Sparkles } from "lucide-react";

type Props = {
  explanation: string;
};

const AIInsightCard = ({ explanation }: Props) => {
  return (
    <div className="flex h-full flex-col rounded-xl border border-blue-100 bg-blue-50/50 p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
          AI Dependency Insights
        </h3>
      </div>
      <div className="flex-1 whitespace-pre-wrap rounded-lg bg-white/60 p-4 text-sm leading-relaxed text-gray-700 shadow-sm dark:bg-dark-secondary/50 dark:text-gray-300">
        {explanation}
      </div>
    </div>
  );
};

export default AIInsightCard;
