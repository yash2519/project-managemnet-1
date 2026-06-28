import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { GoogleGenAI, Type } from "@google/genai";

const prisma = new PrismaClient();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || "dummy-key-to-prevent-crash" });

// Simple in-memory lock to prevent duplicate concurrent requests
const activeRequests = new Set<string>();

export const generateTaskBreakdown = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { title, description, projectId, minTasks = 3, maxTasks = 7 } = req.body;
  
  if (!title || !projectId) {
    res.status(400).json({ message: "Title and projectId are required." });
    return;
  }

  const requestKey = `${projectId}_${title.toLowerCase().trim()}`;

  if (activeRequests.has(requestKey)) {
    res.status(429).json({ message: "A breakdown request for this task is already in progress. Please wait." });
    return;
  }

  activeRequests.add(requestKey);

  try {
    // 1. Get project and its team members via the ProjectTeam many-to-many bridge
    //    Users are linked to teams via User.teamId (direct FK), reflected as Team.User in Prisma.
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
      include: {
        projectTeams: {
          include: {
            team: {
              include: {
                // Team.User[] is the back-relation for User.teamId (seeded).
                // Team.members (UserTeam[]) is a separate join table and is NOT seeded.
                User: true
              }
            }
          }
        }
      }
    });

    // Flatten all users from all associated teams, then deduplicate by userId
    const allUsers = (project?.projectTeams ?? [])
      .flatMap(pt => pt.team?.User ?? []);
    const teamMembers = [
      ...new Map(allUsers.map(u => [u.userId, u])).values()
    ];

    // 2. Calculate workload (total active points) for each member
    const teamStats = await Promise.all(
      teamMembers.map(async (user) => {
        const aggregation = await prisma.task.aggregate({
          _sum: {
            points: true
          },
          where: {
            assignedUserId: user.userId,
            status: {
              notIn: ["Completed", "Done"]
            }
          }
        });
        
        return {
          userId: user.userId,
          username: user.username,
          role: user.roleName || "Unassigned Role",
          activePoints: aggregation._sum.points || 0
        };
      })
    );

    // 3. Prepare the prompt for Gemini
    const teamContext = teamStats.length > 0 
      ? JSON.stringify(teamStats) 
      : "No team members found for this project. Assign user ID 1 as a fallback.";

    const prompt = `You are an expert technical project manager. 
Task Title: ${title}
Task Description: ${description || "No description provided."}

Here is the list of available team members, their roles, and their current workload (total active story points):
${teamContext}

Your goal is to break this task down into logical subtasks.
CRITICAL RULES:
1. Generate between ${minTasks} and ${maxTasks} actionable subtasks. Do NOT generate less than ${minTasks} or more than ${maxTasks}.
2. For each subtask, estimate the effort points (use fibonacci sequence like 1, 2, 3, 5, 8, 13).
3. Assign each subtask to the most appropriate user ID based ONLY on the IDs provided in the team context. You MUST consider:
   a. Role match (e.g. assign UI tasks to UI/UX or Frontend, backend to Backend Developer).
   b. If multiple users have relevant roles, assign to the user with the LOWEST 'activePoints' workload.
4. Set 'priority' to one of: "Urgent", "High", "Medium", "Low", "Backlog". Infer from context.
5. Set 'tags' as a comma-separated string (e.g., "Frontend, API, Auth").
6. Set 'startDate' and 'deadline' as ISO 8601 date strings.
7. If no team members are available, default to assignedUserId: 1.

Return a JSON array of objects.`;

    // 4. Call Gemini
    if (!apiKey || apiKey === "dummy-key-to-prevent-crash") {
      res.status(500).json({ message: "Gemini API key is not configured on the server." });
      return;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        points: { type: Type.NUMBER },
                        assignedUserId: { type: Type.NUMBER },
                        priority: { type: Type.STRING },
                        tags: { type: Type.STRING },
                        startDate: { type: Type.STRING },
                        estimatedHours: { type: Type.NUMBER },
                        riskLevel: { type: Type.STRING },
                        deadline: { type: Type.STRING }
                    },
                    required: ["title", "description", "points", "assignedUserId", "priority", "tags", "startDate", "deadline"]
                }
            }
        }
    });

    const text = response.text;
    if (!text) {
         res.status(500).json({ message: "AI returned empty response" });
         return;
    }

    let subtasks = JSON.parse(text);
    
    // Ensure we strictly enforce the limit of subtasks on the server side
    const maxSubtasksInt = Number(maxTasks) || 7;
    if (Array.isArray(subtasks) && subtasks.length > maxSubtasksInt) {
        subtasks = subtasks.slice(0, maxSubtasksInt);
    }
    
    res.status(200).json(subtasks);
  } catch (error: any) {
    console.error("AI Breakdown Error:", error);
    res.status(500).json({ message: `Error generating AI breakdown: ${error.message}` });
  } finally {
    // Release the lock
    activeRequests.delete(requestKey);
  }
};
