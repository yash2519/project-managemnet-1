# AI Dependency Failure Predictor — AI Prompt Design

## Context

`aiDependencyService.ts` calls Gemini 2.5 Flash after the deterministic `FailurePredictionEngine`
has executed. The AI receives the aggregated prediction output (risk score, delayed tasks, critical path,
sprint impacts, and reasoning data).

1. The prompt size stays bounded because we pass aggregated summary data and only the at-risk tasks, rather than the entire raw graph.
2. The AI explains *why* the project is at risk in plain English and generates actionable recommendations, rather than calculating risk itself. This mirrors the design principle established in `aiHealthService.ts`.

---

## Prompt Template

```text
You are an expert Agile Technical Project Manager.

A deterministic Failure Prediction Engine has analysed the project "{{projectName}}".
It generated the following prediction data:

- Project Risk Score: {{riskScore}}/100 ({{riskLevel}})
- Estimated Maximum Delay: {{estimatedDelay}} days
- Tasks currently delayed: {{delayedTasksCount}}
- Tasks currently blocked: {{blockedCount}}
- Tasks affected downstream: {{affectedTasksCount}}

Critical Path At-Risk Tasks:
{{#each criticalTasks}}
- [Task ID: {{taskId}}] {{title}} ({{status}}) - Expected Delay: {{expectedDelayDays}} days
{{/each}}

Affected Sprints:
{{#each sprintImpacts}}
- Sprint ID {{sprintId}}: Estimated delay {{estimatedSprintDelayDays}} days. Likely to miss deadline: {{likelyToMissDeadline}}
{{/each}}

Algorithmic Deductions/Bonuses:
{{#each deductions}}
- {{reason}}: -{{points}}
{{/each}}
{{#each bonuses}}
- {{reason}}: +{{points}}
{{/each}}

Your task is to produce a concise, actionable natural-language explanation and a list of recommendations based strictly on the data above.

RULES:
1. Provide a short "explanation" (3-4 sentences max) summarizing the project state, emphasizing the critical bottlenecks and sprint impacts.
2. Provide an array of "recommendations" (1-2 sentences each). E.g., "Reassign work from the overloaded developer" or "Adjust Sprint 3 timeline".
3. Do not invent tasks or metrics that are not in the prompt.
4. Return ONLY the JSON object specified by the schema.
```

---

## Gemini API Call Configuration

```ts
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
```

Using `responseSchema` (identical to `aiController.ts`) forces Gemini to return
structured JSON, eliminating the need for client-side parsing/validation.

---

## Example Output (from Gemini)

```json
{
  "explanation": "The project is currently at High risk with a score of 50/100, driven primarily by a 3-day delay on the critical path task 'Database Optimisation'. This bottleneck is blocking two downstream tasks and introduces a 73% chance that Sprint 3 will miss its deadline. Additionally, high-priority tasks remain stuck in progress, compounding the overall schedule risk.",
  "recommendations": [
    "Reassign 'Database Optimisation' to a senior developer immediately to clear the critical path blocker.",
    "Adjust the scope of Sprint 3 to account for the expected 3-day delay.",
    "Review high-priority tasks currently in progress to ensure no other hidden blockers exist."
  ]
}
```

---

## Failure Handling

| Failure mode | Behaviour |
|---|---|
| `GEMINI_API_KEY` not set | Log warning at startup; service returns `aiExplanation: "AI unavailable..."` |
| Gemini returns empty/invalid response | `aiExplanation: "Failed to generate AI explanation."`, `recommendations: []` |
| Gemini throws network error | Caught in `try/catch`; returns `Failed to generate explanation: <error>` |
| Concurrent request for same project | `activeRequests` Set throws immediately; controller returns 500 |

The deterministic `prediction` block is **always** returned regardless of AI failures, so the UI always has accurate risk metrics, affected tasks, and delays to display.

---

## Prompt Engineering Rationale

| Decision | Rationale |
|---|---|
| Structured JSON output | Eliminates regex parsing and ensures type safety |
| AI explains, does not score | Keeps AI output deterministic in spirit; the algorithm is auditable and testable |
| Aggregated input metrics | Reduces token size by filtering out on-track noise and avoiding passing the raw V+E graph |
