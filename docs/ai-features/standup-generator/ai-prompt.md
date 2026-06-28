# Smart Daily Standup Generator — AI Prompt Design

## Overview

The standup prompt is designed to follow the same conventions established by `aiDependencyService.ts` and `aiHealthService.ts`:

- Provide **deterministically computed data** as input; never ask the model to infer metrics.
- Return **only a JSON object** conforming to a strict `responseSchema` using Gemini's structured output mode.
- Limit the narrative to **actionable, professional language** — no markdown, no raw metric numbers repeated verbatim.

---

## Model Configuration

| Setting | Value |
|---|---|
| Model | `gemini-2.5-flash` |
| `responseMimeType` | `application/json` |
| `responseSchema` | Structured JSON (see below) |
| Lock key pattern | `standup_${projectId}` |

---

## Prompt Template

```
You are an expert Agile Technical Project Manager acting as a daily standup facilitator.

The following data has been deterministically collected from the project management system for project ID ${projectId} using the provided analysis filters:

=== STRUCTURED ACTIVITY SUMMARY (Yesterday & Today) ===
${JSON.stringify(context.activitySummary, null, 2)}

=== TEAM WORKLOAD ===
${JSON.stringify(context.workloadSummary, null, 2)}

=== DEPENDENCY STATUS & BLOCKERS ===
${JSON.stringify(context.dependencySummary, null, 2)}

=== PROJECT HEALTH SCORE ===
${JSON.stringify(context.healthSummary, null, 2)}

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
8. Return ONLY the JSON object specified by the schema.
```

---

## Response Schema (Gemini Structured Output)

```ts
{
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
}
```
