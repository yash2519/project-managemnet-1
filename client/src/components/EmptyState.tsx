import React from "react";
import { PlusCircle } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
  icon?: React.ReactNode;
}

const EmptyState = ({ title, description, ctaLabel, onCta, icon }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
      <div className="mb-4 text-gray-400 dark:text-gray-500">
        {icon || <PlusCircle size={48} />}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="mb-6 max-w-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          {ctaLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
