import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { taskDependencyService } from "../services/taskDependencyService";
import { DependencyType } from "@prisma/client";

export const getTaskDependencies = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const taskId = Number(req.params.taskId);
    if (!taskId) {
      res.status(400).json({ message: "taskId is required" });
      return;
    }

    const dependencies = await taskDependencyService.getTaskDependencies(taskId);
    res.status(200).json(dependencies);
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching dependencies: ${error.message}` });
  }
};

export const addDependency = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const taskId = Number(req.params.taskId);
    const { successorId, type, note } = req.body;
    
    // In this endpoint design, taskId is always the predecessor.
    // If we wanted to add a blocker (where taskId is successor), the client should set predecessorId and successorId appropriately.
    // Let's accept predecessorId and successorId explicitly in the body for flexibility.
    const { predecessorId: pId, successorId: sId } = req.body;
    
    const predecessorId = pId || taskId;
    const finalSuccessorId = sId || successorId;

    if (!predecessorId || !finalSuccessorId || !type) {
      res.status(400).json({ message: "predecessorId, successorId, and type are required" });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }

    const dependency = await taskDependencyService.addDependency(
      predecessorId,
      finalSuccessorId,
      type as DependencyType,
      req.user.userId,
      note
    );

    res.status(201).json(dependency);
  } catch (error: any) {
    // If it's a known validation error from our service, return 400
    if (error.message.includes("cycle") || error.message.includes("itself") || error.message.includes("already exists")) {
        res.status(400).json({ message: error.message });
        return;
    }
    res.status(500).json({ message: `Error adding dependency: ${error.message}` });
  }
};

export const updateDependency = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const dependencyId = Number(req.params.dependencyId);
    const { type, isActive, note } = req.body;

    const dependency = await taskDependencyService.updateDependency(dependencyId, { type, isActive, note });
    res.status(200).json(dependency);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating dependency: ${error.message}` });
  }
};

export const removeDependency = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const dependencyId = Number(req.params.dependencyId);
    await taskDependencyService.removeDependency(dependencyId, req.user?.userId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: `Error removing dependency: ${error.message}` });
  }
};
