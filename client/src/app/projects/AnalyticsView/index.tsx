import React, { useState } from "react";
import HealthView from "../HealthView";
import DependenciesDashboard from "./DependenciesDashboard";
import StandupView from "../StandupView";

type Props = {
  id: string;
};

const AnalyticsView = ({ id }: Props) => {
  const [activeSubTab, setActiveSubTab] = useState("Dependencies");

  return (
    <div className="flex flex-col h-full">
      {/* Sub-navigation for Analytics features */}
      <div className="mx-4 mt-4 flex gap-4 border-b border-gray-200 dark:border-stroke-dark xl:mx-6">
        <SubTabButton
          name="Dependencies"
          isActive={activeSubTab === "Dependencies"}
          onClick={() => setActiveSubTab("Dependencies")}
        />
        <SubTabButton
          name="Health Score"
          isActive={activeSubTab === "Health Score"}
          onClick={() => setActiveSubTab("Health Score")}
        />
        <SubTabButton
          name="Standups"
          isActive={activeSubTab === "Standups"}
          onClick={() => setActiveSubTab("Standups")}
        />
        <SubTabButton
          name="Retrospectives"
          isActive={activeSubTab === "Retrospectives"}
          onClick={() => setActiveSubTab("Retrospectives")}
          disabled
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 mt-2">
        {activeSubTab === "Health Score" && <HealthView id={id} />}
        {activeSubTab === "Dependencies" && <DependenciesDashboard id={id} />}
        {activeSubTab === "Standups" && <StandupView id={id} />}
      </div>
    </div>
  );
};

type SubTabButtonProps = {
  name: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
};

const SubTabButton = ({ name, isActive, onClick, disabled }: SubTabButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors
        ${disabled ? "text-gray-300 cursor-not-allowed dark:text-gray-700 border-transparent" :
        isActive
          ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600"
      }`}
    >
      {name}
      {disabled && <span className="ml-2 text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full text-gray-400">Soon</span>}
    </button>
  );
};

export default AnalyticsView;
