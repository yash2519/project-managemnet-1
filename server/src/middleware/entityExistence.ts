import { Request, Response, NextFunction } from "express";
import { PrismaClient, Project, Task, Team } from "@prisma/client";

const prisma = new PrismaClient();

// Add type declarations to express Response locals for safe access in controllers
declare global {
  namespace Express {
    interface Locals {
      project?: Project;
      task?: Task & { project: Project };
      team?: Team;
    }
  }
}

/**
 * Middleware to verify a Project exists before proceeding.
 * Expects validateIdParam("projectId") to have run first.
 * Attaches the found Project to res.locals.project.
 */
export const requireProjectExists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const projectId = Number(req.params.projectId);
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    res.locals.project = project;
    next();
  } catch (error: any) {
    res.status(500).json({ message: `Error verifying project existence: ${error.message}` });
  }
};

/**
 * Middleware to verify a Task exists before proceeding.
 * Expects validateIdParam("taskId") to have run first.
 * Attaches the found Task (including its related project) to res.locals.task.
 */
export const requireTaskExists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const taskId = Number(req.params.taskId);
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    res.locals.task = task as Task & { project: Project };
    next();
  } catch (error: any) {
    res.status(500).json({ message: `Error verifying task existence: ${error.message}` });
  }
};

/**
 * Middleware to verify a Team exists before proceeding.
 * Expects validateIdParam("teamId") to have run first.
 * Attaches the found Team to res.locals.team.
 */
export const requireTeamExists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const teamId = Number(req.params.teamId);
  try {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      res.status(404).json({ message: "Team not found" });
      return;
    }
    res.locals.team = team;
    next();
  } catch (error: any) {
    res.status(500).json({ message: `Error verifying team existence: ${error.message}` });
  }
};
