import { GoogleGenAI, Type } from "@google/genai";
import { PredictionResult } from "../engine/types";
import { DependencyPredictionResponseDTO } from "../types/dependency";

const activeRequests = new Set<string>();

export const explainPrediction = async (
  prediction: PredictionResult,
  projectName: string,
  projectId: number
): Promise<DependencyPredictionResponseDTO> => {
  const requestKey = `dependency_${projectId}`;

  if (activeRequests.has(requestKey)) {
    throw new Error("A dependency analysis request is already in progress for this project.");
  }

  activeRequests.add(requestKey);

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found. Returning prediction without AI explanation.");
      return {
        prediction,
        affectedTasks: prediction.affectedTasks,
        aiExplanation: "AI unavailable: GEMINI_API_KEY not configured.",
        recommendations: [],
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build the prompt context
    const delayedTasksCount = prediction.allAtRiskTasks.filter(t => t.expectedDelayDays > 0).length;
    const blockedCount = prediction.allAtRiskTasks.filter(t => t.reasons.some(r => r.toLowerCase().includes("block"))).length;
    
    // We provide a summary of the prediction so Gemini can generate a narrative.
    const prompt = `
You are an expert Agile Technical Project Manager.

A deterministic Failure Prediction Engine has analysed the project "${projectName}".
It generated the following prediction data:

- Project Risk Score: ${prediction.riskScore}/100 (${prediction.riskLevel})
- Estimated Maximum Delay: ${prediction.estimatedDelay} days
- Tasks currently delayed: ${delayedTasksCount}
- Tasks currently blocked: ${blockedCount}
- Tasks affected downstream: ${prediction.affectedTasks.length}

Critical Path At-Risk Tasks:
${prediction.criticalTasks.map(t => `- [Task ID: ${t.taskId}] ${t.title} (${t.status}) - Expected Delay: ${t.expectedDelayDays} days`).join('\n')}

Affected Sprints:
${prediction.sprintImpacts.map(s => `- Sprint ID ${s.sprintId}: Estimated delay ${s.estimatedSprintDelayDays} days. Likely to miss deadline: ${s.likelyToMissDeadline}`).join('\n')}

Algorithmic Deductions/Bonuses:
${prediction.reasoningData.deductions.map(d => `- ${d.reason}: -${d.points}`).join('\n')}
${prediction.reasoningData.bonuses.map(b => `- ${b.reason}: +${b.points}`).join('\n')}

Your task is to produce a concise, actionable natural-language explanation and a list of recommendations based strictly on the data above.

RULES:
1. Provide a short "explanation" (3-4 sentences max) summarizing the project state, emphasizing the critical bottlenecks and sprint impacts.
2. Provide an array of "recommendations" (1-2 sentences each). E.g., "Reassign work from the overloaded developer" or "Adjust Sprint 3 timeline".
3. Do not invent tasks or metrics that are not in the prompt.
4. Return ONLY the JSON object specified by the schema.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["explanation", "recommendations"],
        },
      },
    });

    let explanation = "Failed to generate AI explanation.";
    let recommendations: string[] = [];

    if (response.text) {
      try {
        const parsed = JSON.parse(response.text);
        explanation = parsed.explanation || explanation;
        recommendations = parsed.recommendations || [];
      } catch (e) {
        console.error("Failed to parse AI response as JSON:", e);
      }
    }

    return {
      prediction,
      affectedTasks: prediction.affectedTasks,
      aiExplanation: explanation,
      recommendations,
    };
  } catch (error: any) {
    console.error("AI Dependency Explanation Error:", error);
    return {
      prediction,
      affectedTasks: prediction.affectedTasks,
      aiExplanation: `Failed to generate explanation: ${error.message}`,
      recommendations: [],
    };
  } finally {
    activeRequests.delete(requestKey);
  }
};
