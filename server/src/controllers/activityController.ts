import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getActivities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  
  try {
    let whereClause: any = {};
    
    if (req.user.role !== "ADMIN") {
      const userProjects = await prisma.project.findMany({
        where: {
          OR: [
            { ownerId: req.user.userId },
            { tasks: { some: { assignedUserId: req.user.userId } } },
          ],
        },
        select: { id: true },
      });
      const projectIds = userProjects.map((p) => p.id);
      
      whereClause = {
        OR: [
          { projectId: { in: projectIds } },
          { userId: req.user.userId }
        ]
      };
    }

    const activities = await prisma.activity.findMany({
      where: whereClause,
      include: {
        user: { select: { userId: true, username: true, profilePictureUrl: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    
    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching activities: ${error.message}` });
  }
};
