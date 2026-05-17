import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const search = async (req: Request, res: Response): Promise<void> => {
  const { query, userId } = req.query;
  try {
    const taskWhereClause: any = {
      OR: [
        { title: { contains: query as string } },
        { description: { contains: query as string } },
      ],
    };

    if (userId) {
      taskWhereClause.AND = [
        {
          OR: [
            { authorUserId: Number(userId) },
            { assignedUserId: Number(userId) },
          ],
        },
      ];
    }

    const tasks = await prisma.task.findMany({
      where: taskWhereClause,
    });

    const projectWhereClause: any = {
      OR: [
        { name: { contains: query as string } },
        { description: { contains: query as string } },
      ],
    };

    if (userId) {
      projectWhereClause.tasks = {
        some: {
          OR: [
            { authorUserId: Number(userId) },
            { assignedUserId: Number(userId) },
          ],
        },
      };
    }

    const projects = await prisma.project.findMany({
      where: projectWhereClause,
    });

    const users = await prisma.user.findMany({
      where: {
        OR: [{ username: { contains: query as string } }],
      },
    });
    res.json({ tasks, projects, users });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error performing search: ${error.message}` });
  }
};
