import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { generateAIStandup, forceRegenerateAIStandup } from "../services/aiStandupService";
import { standupComparisonEngine } from "../engine/StandupComparisonEngine";

const prisma = new PrismaClient();
const activeRequests = new Set<string>();

const checkAuth = async (req: AuthenticatedRequest, res: Response, projectId: number): Promise<boolean> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return false;
  }
  const project = res.locals.project;
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return false;
  }
  const isOwner = project.ownerId === req.user.userId;
  const isAdmin = req.user.role === "ADMIN";
  const hasAssignedTask = await prisma.task.findFirst({
    where: { projectId, assignedUserId: req.user.userId },
  });

  if (!isOwner && !isAdmin && !hasAssignedTask) {
    res.status(403).json({ message: "Forbidden: insufficient permissions" });
    return false;
  }
  return true;
};

/**
 * POST /projects/:projectId/standup
 */
export const generateStandup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projectId = Number(req.params.projectId);
    const { date, filters } = req.body;
    
    if (!(await checkAuth(req, res, projectId))) return;

    // Create a key based on filters to avoid blocking separate filter requests, though 
    // we still want to rate-limit or prevent identical concurrent requests.
    const filterKey = filters ? Buffer.from(JSON.stringify(filters)).toString('base64') : 'default';
    const requestKey = `standup_${projectId}_${date || "today"}_${filterKey}`;
    
    if (activeRequests.has(requestKey)) {
      res.status(429).json({ message: "A standup generation request is already in progress. Please wait." });
      return;
    }

    activeRequests.add(requestKey);
    try {
      const result = await generateAIStandup(projectId, req.user!.userId, date, filters);
      res.status(200).json(result);
    } finally {
      activeRequests.delete(requestKey);
    }
  } catch (error: any) {
    console.error("Standup Generation Error:", error);
    res.status(500).json({ message: `Error generating standup: ${error.message}` });
  }
};

/**
 * POST /projects/:projectId/standup/regenerate
 */
export const regenerateStandup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projectId = Number(req.params.projectId);
    const { date, filters } = req.body;
    
    if (!(await checkAuth(req, res, projectId))) return;

    const filterKey = filters ? Buffer.from(JSON.stringify(filters)).toString('base64') : 'default';
    const requestKey = `standup_regen_${projectId}_${date || "today"}_${filterKey}`;
    
    if (activeRequests.has(requestKey)) {
      res.status(429).json({ message: "A standup regeneration request is already in progress." });
      return;
    }

    activeRequests.add(requestKey);
    try {
      const result = await forceRegenerateAIStandup(projectId, req.user!.userId, date, filters);
      res.status(200).json(result);
    } finally {
      activeRequests.delete(requestKey);
    }
  } catch (error: any) {
    console.error("Standup Regeneration Error:", error);
    res.status(500).json({ message: `Error regenerating standup: ${error.message}` });
  }
};

/**
 * GET /projects/:projectId/standup/today
 */
export const getTodayStandup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projectId = Number(req.params.projectId);
    if (!(await checkAuth(req, res, projectId))) return;

    // We can just call generateAIStandup which has smart caching built-in
    const result = await generateAIStandup(projectId, req.user!.userId);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Get Today Standup Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /projects/:projectId/standup/date/:date
 */
export const getStandupByDate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projectId = Number(req.params.projectId);
    const { date } = req.params;
    if (!(await checkAuth(req, res, projectId))) return;

    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const report = await prisma.standupReport.findUnique({
      where: { projectId_date: { projectId, date: targetDate } }
    });

    if (!report) {
      res.status(404).json({ message: "Standup not found for this date" });
      return;
    }
    res.status(200).json(report);
  } catch (error: any) {
    console.error("Get Standup By Date Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /projects/:projectId/standup/history
 *
 * Query params (all optional):
 *   page, limit          — pagination
 *   startDate, endDate   — date-range filter
 *   sprintId             — reserved for future sprint filtering (stored, no-op now)
 *   search               — reserved for future full-text search (stored, no-op now)
 *   author               — reserved for future author filtering (stored, no-op now)
 */
export const getStandupHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projectId = Number(req.params.projectId);
    if (!(await checkAuth(req, res, projectId))) return;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Reserved params — accepted but not yet acted on (future extensibility)
    // const sprintId = req.query.sprintId ? Number(req.query.sprintId) : undefined;
    // const search   = req.query.search as string | undefined;
    // const author   = req.query.author as string | undefined;

    const whereClause: any = { projectId };
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = startDate;
      if (endDate)   whereClause.date.lte = endDate;
    }

    const [total, reports] = await Promise.all([
      prisma.standupReport.count({ where: whereClause }),
      prisma.standupReport.findMany({
        where: whereClause,
        orderBy: { date: "desc" },
        skip,
        take: limit,
        // Lightweight summary selection — full record loaded on demand via /date/:date
        select: {
          id: true,
          date: true,
          generatedAt: true,
          isRegenerated: true,
          generationVersion: true,
          summary: true,           // Needed for card previews
          aiRecommendations: true, // Needed for recommendation count badge
          analysisContext: true,   // Needed for health score extraction on card
          author: { select: { username: true } },
        },
      }),
    ]);

    res.status(200).json({
      data: reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Get Standup History Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /projects/:projectId/standup/compare?dateA=YYYY-MM-DD&dateB=YYYY-MM-DD
 *
 * Loads two full StandupReport records and runs them through the
 * StandupComparisonEngine.  Both dates must resolve to existing reports.
 */
export const compareStandups = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projectId = Number(req.params.projectId);
    if (!(await checkAuth(req, res, projectId))) return;

    const { dateA, dateB } = req.query as { dateA?: string; dateB?: string };

    if (!dateA || !dateB) {
      res.status(400).json({ message: "Both dateA and dateB query parameters are required (YYYY-MM-DD)." });
      return;
    }

    const parsedA = new Date(dateA);
    const parsedB = new Date(dateB);
    parsedA.setUTCHours(0, 0, 0, 0);
    parsedB.setUTCHours(0, 0, 0, 0);

    if (isNaN(parsedA.getTime()) || isNaN(parsedB.getTime())) {
      res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
      return;
    }

    const [reportA, reportB] = await Promise.all([
      prisma.standupReport.findUnique({
        where: { projectId_date: { projectId, date: parsedA } },
        include: { author: { select: { username: true } } },
      }),
      prisma.standupReport.findUnique({
        where: { projectId_date: { projectId, date: parsedB } },
        include: { author: { select: { username: true } } },
      }),
    ]);

    if (!reportA) {
      res.status(404).json({ message: `No standup found for date ${dateA}` });
      return;
    }
    if (!reportB) {
      res.status(404).json({ message: `No standup found for date ${dateB}` });
      return;
    }

    // Determine chronological order (engine always expects A = older, B = newer)
    const [older, newer] = parsedA <= parsedB ? [reportA, reportB] : [reportB, reportA];

    const result = standupComparisonEngine.compare(
      {
        ...older,
        summary: older.summary as any,
        aiRecommendations: (older.aiRecommendations as string[]) ?? [],
      },
      {
        ...newer,
        summary: newer.summary as any,
        aiRecommendations: (newer.aiRecommendations as string[]) ?? [],
      }
    );

    res.status(200).json({
      reportA: { id: older.id, date: older.date, author: older.author },
      reportB: { id: newer.id, date: newer.date, author: newer.author },
      comparison: result,
    });
  } catch (error: any) {
    console.error("Compare Standups Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /projects/:projectId/standup/export
 */
export const exportStandups = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const projectId = Number(req.params.projectId);
    if (!(await checkAuth(req, res, projectId))) return;

    const format = (req.query.format as string) || "json"; // json | csv | md
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const whereClause: any = { projectId };
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = startDate;
      if (endDate)   whereClause.date.lte = endDate;
    }

    const reports = await prisma.standupReport.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
    });

    if (format === "csv") {
      let csv = "ID,Date,Yesterday,Today,Blockers,TeamSummary,Recommendations,GeneratedAt,GenerationVersion\n";
      for (const r of reports) {
        const s: any = r.summary;
        const recs = Array.isArray(r.aiRecommendations) ? (r.aiRecommendations as string[]).join(" | ") : "";
        const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
        csv += `${esc(String(r.id))},${esc(r.date.toISOString())},${esc(s.yesterday)},${esc(s.today)},${esc(s.blockers)},${esc(s.teamSummary)},${esc(recs)},${esc(r.generatedAt.toISOString())},${esc(r.generationVersion)}\n`;
      }
      res.header("Content-Type", "text/csv");
      res.attachment("standups.csv");
      res.send(csv);
    } else if (format === "md") {
      let md = `# Standup Export\n\n`;
      for (const r of reports) {
        md += `## ${r.date.toISOString().split("T")[0]}\n\n${r.generatedStandup}\n\n---\n\n`;
      }
      res.header("Content-Type", "text/markdown");
      res.attachment("standups.md");
      res.send(md);
    } else {
      res.header("Content-Type", "application/json");
      res.attachment("standups.json");
      res.json(reports);
    }
  } catch (error: any) {
    console.error("Export Standups Error:", error);
    res.status(500).json({ message: error.message });
  }
};
