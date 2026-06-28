import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || "dummy-key-to-prevent-crash" });

import { getCachedStandup, saveStandup } from "./standupCacheService";
import { AnalysisFilters } from "../types/analysis";
import { buildProjectAnalysisContext } from "./projectAnalysisContextBuilder";

export interface AIStandupResponse {
  yesterday: string;
  today: string;
  blockers: string;
  teamSummary: string;
  aiRecommendations: string[];
}

export const generateAIStandup = async (projectId: number, userId: number, date?: string, filters?: AnalysisFilters): Promise<AIStandupResponse> => {
  // Determine target logical date
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setUTCHours(0, 0, 0, 0);

  // Determine if we have any active filters
  const hasFilters = filters && Object.keys(filters).length > 0;

  // Check cache first (ONLY if there are no filters, i.e., "Entire Project" default view)
  if (!hasFilters) {
    const cachedReport = await getCachedStandup(projectId, targetDate);
    if (cachedReport) {
      const summary = cachedReport.summary as any;
      return {
        yesterday: summary.yesterday || "",
        today: summary.today || "",
        blockers: summary.blockers || "",
        teamSummary: summary.teamSummary || "",
        aiRecommendations: (cachedReport.aiRecommendations as string[]) || [],
      };
    }
  }

  // Cache miss, stale, or filtered request: fetch consolidated inputs via ProjectAnalysisContext
  const dateLabel = date ? date : targetDate.toISOString().split("T")[0];
  const context = await buildProjectAnalysisContext(projectId, userId, dateLabel, filters || {});

  const prompt = `You are an expert Agile Technical Project Manager acting as a daily standup facilitator.

The following data has been deterministically collected from the project management system for project ID ${projectId}:

=== STRUCTURED ACTIVITY SUMMARY (Yesterday & Today) ===
${JSON.stringify(context.analytics.activity, null, 2)}

=== TEAM WORKLOAD ===
${JSON.stringify(context.analytics.workload, null, 2)}

=== DEPENDENCY STATUS & BLOCKERS ===
${JSON.stringify(context.analytics.dependency, null, 2)}

=== PROJECT HEALTH SCORE ===
${JSON.stringify(context.analytics.health, null, 2)}

=== INSTRUCTIONS ===
Generate a structured standup report based ONLY on the data above. Use concise, professional language suitable for engineering standups.

RULES:
1. Provide a "yesterday" summary (3-5 sentences) of what the team accomplished.
2. Provide a "today" summary (3-5 sentences) of what is being worked on or is scheduled.
3. Provide a "blockers" summary (2-4 sentences) identifying blocked tasks and their impact.
4. Provide a "teamSummary" (2-4 sentences) highlighting active members, idle members, and overloaded members.
5. Provide an "aiRecommendations" array of 2-4 concise action items (1-2 sentences each).
6. Do NOT invent tasks, names, or data not present in the input.
7. Do NOT repeat raw metric numbers unless they add meaningful context.
8. Return ONLY the JSON object specified by the schema.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      yesterday: { type: Type.STRING },
      today: { type: Type.STRING },
      blockers: { type: Type.STRING },
      teamSummary: { type: Type.STRING },
      aiRecommendations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: ["yesterday", "today", "blockers", "teamSummary", "aiRecommendations"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const responseText = response.text || "{}";
    const parsed = JSON.parse(responseText);

    const result = {
      yesterday: parsed.yesterday || "No data for yesterday.",
      today: parsed.today || "No data for today.",
      blockers: parsed.blockers || "No blockers reported.",
      teamSummary: parsed.teamSummary || "No team summary available.",
      aiRecommendations: Array.isArray(parsed.aiRecommendations) ? parsed.aiRecommendations : [],
    };

    // Save to database only if this is the default project view
    if (!hasFilters) {
      const summaryJson = {
        yesterday: result.yesterday,
        today: result.today,
        blockers: result.blockers,
        teamSummary: result.teamSummary,
      };
      
      const combinedStandup = `Yesterday: ${result.yesterday}\nToday: ${result.today}\nBlockers: ${result.blockers}\nTeam Summary: ${result.teamSummary}`;

      await saveStandup(
        projectId,
        targetDate,
        summaryJson,
        combinedStandup,
        result.aiRecommendations,
        context,
        userId,
        false // isRegenerated
      );
    }

    return result;
  } catch (error: any) {
    console.error("AI Standup Generation Error:", error);
    throw new Error(`Failed to generate standup narrative: ${error.message}\nCause: ${error.toString()}`);
  }
};

export const forceRegenerateAIStandup = async (projectId: number, userId: number, date?: string, filters?: AnalysisFilters): Promise<AIStandupResponse> => {
  // Essentially the same process, but bypasses the cache check and sets isRegenerated = true
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setUTCHours(0, 0, 0, 0);

  const dateLabel = date ? date : targetDate.toISOString().split("T")[0];
  const context = await buildProjectAnalysisContext(projectId, userId, dateLabel, filters || {});

  const prompt = `You are an expert Agile Technical Project Manager acting as a daily standup facilitator.

The following data has been deterministically collected from the project management system for project ID ${projectId}:

=== STRUCTURED ACTIVITY SUMMARY (Yesterday & Today) ===
${JSON.stringify(context.analytics.activity, null, 2)}

=== TEAM WORKLOAD ===
${JSON.stringify(context.analytics.workload, null, 2)}

=== DEPENDENCY STATUS & BLOCKERS ===
${JSON.stringify(context.analytics.dependency, null, 2)}

=== PROJECT HEALTH SCORE ===
${JSON.stringify(context.analytics.health, null, 2)}

=== INSTRUCTIONS ===
Generate a structured standup report based ONLY on the data above. Use concise, professional language suitable for engineering standups.

RULES:
1. Provide a "yesterday" summary (3-5 sentences) of what the team accomplished.
2. Provide a "today" summary (3-5 sentences) of what is being worked on or is scheduled.
3. Provide a "blockers" summary (2-4 sentences) identifying blocked tasks and their impact.
4. Provide a "teamSummary" (2-4 sentences) highlighting active members, idle members, and overloaded members.
5. Provide an "aiRecommendations" array of 2-4 concise action items (1-2 sentences each).
6. Do NOT invent tasks, names, or data not present in the input.
7. Do NOT repeat raw metric numbers unless they add meaningful context.
8. Return ONLY the JSON object specified by the schema.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      yesterday: { type: Type.STRING },
      today: { type: Type.STRING },
      blockers: { type: Type.STRING },
      teamSummary: { type: Type.STRING },
      aiRecommendations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: ["yesterday", "today", "blockers", "teamSummary", "aiRecommendations"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const responseText = response.text || "{}";
    const parsed = JSON.parse(responseText);

    const result = {
      yesterday: parsed.yesterday || "No data for yesterday.",
      today: parsed.today || "No data for today.",
      blockers: parsed.blockers || "No blockers reported.",
      teamSummary: parsed.teamSummary || "No team summary available.",
      aiRecommendations: Array.isArray(parsed.aiRecommendations) ? parsed.aiRecommendations : [],
    };

    const hasFilters = filters && Object.keys(filters).length > 0;

    if (!hasFilters) {
      const summaryJson = {
        yesterday: result.yesterday,
        today: result.today,
        blockers: result.blockers,
        teamSummary: result.teamSummary,
      };
      
      const combinedStandup = `Yesterday: ${result.yesterday}\nToday: ${result.today}\nBlockers: ${result.blockers}\nTeam Summary: ${result.teamSummary}`;

      await saveStandup(
        projectId,
        targetDate,
        summaryJson,
        combinedStandup,
        result.aiRecommendations,
        context,
        userId,
        true // isRegenerated
      );
    }

    return result;
  } catch (error: any) {
    console.error("AI Standup Regeneration Error:", error);
    throw new Error(`Failed to regenerate standup narrative: ${error.message}\nCause: ${error.toString()}`);
  }
};
