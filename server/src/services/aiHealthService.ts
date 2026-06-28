import { GoogleGenAI } from "@google/genai";
import { HealthMetricsDTO } from "../types/health";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || "dummy-key-to-prevent-crash" });

// Simple lock to prevent concurrent AI requests for the same project
const activeRequests = new Set<string>();

export const generateHealthExplanation = async (
  projectId: number,
  projectSummary: string,
  metrics: HealthMetricsDTO,
  score: number,
  risk: string
): Promise<string> => {
  const requestKey = `health_${projectId}`;

  if (activeRequests.has(requestKey)) {
    throw new Error("A health analysis request is already in progress for this project.");
  }

  activeRequests.add(requestKey);

  try {
    const prompt = `You are an expert Agile Technical Project Manager.
Analyze the following project health data and generate a natural language explanation of the project's state.

Project Summary: ${projectSummary}
Overall Health Score: ${score}/100
Assessed Risk Level: ${risk}

Raw Metrics:
- Completed Tasks: ${metrics.completedTasks}
- Overdue Tasks: ${metrics.overdueTasks}
- Blocked Tasks: ${metrics.blockedTasks}
- High Priority Tasks: ${metrics.highPriorityTasks}
- Missed Deadlines: ${metrics.missedDeadlines}
- Team Workload (Active Points): ${metrics.teamWorkload}

Provide a concise, 2-3 sentence natural language explanation of WHY the project has this score and risk level. Do not use markdown. Do not include raw metric numbers unless highly relevant. Keep it professional and actionable.`;

    if (!apiKey || apiKey === "dummy-key-to-prevent-crash") {
      throw new Error("Gemini API key is not configured.");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        // Just expecting a plain text string back
        responseMimeType: "text/plain",
      }
    });

    return response.text || "No explanation generated.";
  } catch (error: any) {
    console.error("AI Health Explanation Error:", error);
    return `Failed to generate AI explanation: ${error.message}`;
  } finally {
    activeRequests.delete(requestKey);
  }
};
