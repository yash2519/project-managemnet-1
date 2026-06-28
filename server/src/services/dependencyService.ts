import { DependencyPredictionResponseDTO } from "../types/dependency";
import { dependencyGraphService } from "./dependencyGraphService";
import { explainPrediction } from "./aiDependencyService";

export const analyseProjectDependencies = async (
  projectId: number,
  projectName: string
): Promise<DependencyPredictionResponseDTO> => {
  // 1. Run the deterministic prediction engine
  const prediction = await dependencyGraphService.predictProject(projectId);

  // 2. Generate natural language explanation and recommendations via Gemini
  const response = await explainPrediction(prediction, projectName, projectId);

  return response;
};
