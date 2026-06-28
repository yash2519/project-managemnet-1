import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth";

const prisma = new PrismaClient();

export const search = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query } = req.query;
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthenticated" });
      return;
    }

    const q = (query as string || "").trim();
    if (!q) {
      res.json({ tasks: [], projects: [], users: [] });
      return;
    }

    const isAdmin = req.user.role === "ADMIN";
    const userId = req.user.userId;
    const teamIds = req.user.teamIds || [];

    // --- 1. Fetch Tasks ---
    const taskWhere: any = {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    };

    if (!isAdmin) {
      taskWhere.AND = [
        {
          OR: [
            { authorUserId: userId },
            { assignedUserId: userId },
            { project: { ownerId: userId } },
            { project: { teamId: { in: teamIds } } },
            { project: { tasks: { some: { assignedUserId: userId } } } },
          ],
        },
      ];
    }

    const tasks = await prisma.task.findMany({
      where: taskWhere,
      include: {
        author: true,
        assignee: true,
        project: true, // Required for UI
      },
    });

    // --- 2. Fetch Projects ---
    const projectWhere: any = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    };

    if (!isAdmin) {
      projectWhere.AND = [
        {
          OR: [
            { ownerId: userId },
            { teamId: { in: teamIds } },
            { tasks: { some: { assignedUserId: userId } } },
          ],
        },
      ];
    }

    const projects = await prisma.project.findMany({
      where: projectWhere,
    });

    // --- 3. Fetch Users ---
    // Users are globally searchable
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
        ],
      },
    });

    res.json({ tasks, projects, users });
  } catch (error: any) {
    res.status(500).json({ message: `Error performing search: ${error.message}` });
  }
};
