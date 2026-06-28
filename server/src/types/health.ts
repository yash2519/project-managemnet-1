export interface HealthMetricsDTO {
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  highPriorityTasks: number;
  missedDeadlines: number;
  teamWorkload: number;
}

export interface ProjectHealthResponseDTO {
  projectId: number;
  score: number;
  risk: string;
  aiExplanation: string;
  generatedAt: string;
}
