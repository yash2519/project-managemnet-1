import { PrismaClient, StandupReport } from "@prisma/client";

const prisma = new PrismaClient();

export const getCachedStandup = async (
  projectId: number,
  targetDate: Date
): Promise<StandupReport | null> => {
  // Find an existing standup report for this project on this logical date
  const standup = await prisma.standupReport.findUnique({
    where: {
      projectId_date: {
        projectId,
        date: targetDate,
      },
    },
  });

  if (!standup) {
    return null;
  }

  // Intelligent Cache Validation: Check if there is significant new activity since generation
  // For 'today', we look at any activity logged since generatedAt.
  const newActivityCount = await prisma.activity.count({
    where: {
      projectId,
      createdAt: {
        gt: standup.generatedAt,
      },
    },
  });

  // If there are more than 2 new activities, we consider the cache stale
  if (newActivityCount > 2) {
    return null;
  }

  return standup;
};

export const saveStandup = async (
  projectId: number,
  targetDate: Date,
  summary: any,
  generatedStandup: string,
  aiRecommendations: any,
  analysisContext: any,
  generatedByUserId: number,
  isRegenerated = false,
  analysisVersion = "1.1"
): Promise<StandupReport> => {
  return prisma.standupReport.upsert({
    where: {
      projectId_date: {
        projectId,
        date: targetDate,
      },
    },
    update: {
      summary,
      generatedStandup,
      aiRecommendations,
      analysisContext,
      generatedBy: generatedByUserId,
      isRegenerated,
      generationVersion: analysisVersion,
    },
    create: {
      projectId,
      date: targetDate,
      summary,
      generatedStandup,
      aiRecommendations,
      analysisContext,
      generatedBy: generatedByUserId,
      isRegenerated,
      generationVersion: analysisVersion,
    },
  });
};
