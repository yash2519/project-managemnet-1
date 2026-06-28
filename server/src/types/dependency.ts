export enum DependencyStatus {
  READY = "READY",         // Predecessor is done, successor can start
  BLOCKED = "BLOCKED",       // Predecessor is not done, successor is blocked
  SATISFIED = "SATISFIED",     // Successor is done (or both are done)
  BROKEN = "BROKEN",        // e.g. Predecessor was deleted or inactive
}

export interface DependencyNodeDTO {
  taskId: number;
  title: string;
  status: string | null;
  priority: string | null;
  dueDate: string | null;     // ISO string
  assignedUserId: number | null;
}

import { PredictionResult } from "../engine/types";

export interface DependencyPredictionResponseDTO {
  prediction: PredictionResult;
  affectedTasks: number[];
  aiExplanation: string;
  recommendations: string[];
}

export interface TaskGraphNode {
  id: number;
  title: string;
  status: string | null;
  priority: string | null;
  dueDate: Date | null;
  assignedUserId: number | null;
  tags: string | null;
  points: number | null;
}
