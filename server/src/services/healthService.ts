import { PrismaClient } from "@prisma/client";
import { getProjectMetrics } from "../repository/projectMetricsRepo";
import { ProjectHealthResponseDTO } from "../types/health";
import { generateHealthExplanation } from "./aiHealthService";

const prisma = new PrismaClient();

export const calculateProjectHealth = async (projectId: number): Promise<ProjectHealthResponseDTO> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const projectSummary = `${project.name}: ${project.description || "No description provided"}`;
  const metrics = await getProjectMetrics(projectId);
  
  let score = 100;

  if (metrics.overdueTasks > 0) {
    score -= Math.min(metrics.overdueTasks * 5, 30);
  }

  if (metrics.blockedTasks > 0) {
    score -= Math.min(metrics.blockedTasks * 10, 40);
  }

  if (metrics.missedDeadlines > 5) {
    score -= 10;
  }

  if (metrics.teamWorkload > 100) {
    score -= 5;
  }

  score = Math.max(0, score);

  let risk = "Low";
  if (score < 70) {
    risk = "High";
  } else if (score < 85) {
    risk = "Medium";
  }

  const aiExplanation = await generateHealthExplanation(
    projectId,
    projectSummary,
    metrics,
    score,
    risk
  );

  return {
    projectId,
    score,
    risk,
    aiExplanation,
    generatedAt: new Date().toISOString()
  };
};
