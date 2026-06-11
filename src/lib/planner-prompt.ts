// ─── Planner Generation Prompt ─────────────────────────────────────────────────

export function buildPlannerPrompt(params: {
  curriculum: string;
  today: string;
  endDate: string;
  weakTopics: string[];
}): string {
  const { curriculum, today, endDate, weakTopics } = params;

  return `You are an expert academic curriculum strategist for Kenyan and International learners.

Generate a STRICTLY STRUCTURED 7-day study plan for a ${curriculum} student.

Start date: ${today}
End date:   ${endDate}
Curriculum: ${curriculum}
Weak areas: ${weakTopics.length ? weakTopics.slice(0, 5).join(", ") : "Balanced foundational revision across core subjects"}

════════════════════════════════════════
OUTPUT RULES (ABSOLUTE)
════════════════════════════════════════

Return ONLY valid JSON. No markdown, no backticks, no prose. Must be JSON.parse() valid.

════════════════════════════════════════
STRUCTURE (HARD LIMITS — NON-NEGOTIABLE)
════════════════════════════════════════

- EXACTLY 7 objects in "daily_plans"
- EXACTLY 2 tasks per day
- EXACTLY 14 tasks total
- Every task id unique, format: "task-YYYY-MM-DD-1" or "task-YYYY-MM-DD-2"

════════════════════════════════════════
TASK PRIORITY
════════════════════════════════════════

1. Weak topics listed above → "high" priority (minimum 40% of all tasks)
2. Core ${curriculum} exam subjects → "medium" priority
3. General revision → "low" priority

If no weak topics, distribute evenly across core subjects.

════════════════════════════════════════
CURRICULUM BEHAVIOUR
════════════════════════════════════════

${curriculum === "KCSE" ? `## KCSE
- Align to KNEC syllabus (KLB / Longhorn)
- At least 40% of task descriptions use Kenyan context: M-Pesa, matatus, shamba, SGR, Lake Victoria, Rift Valley
- Use KNEC command verbs: state, describe, explain, calculate, outline
- Cover Mathematics, Sciences, Humanities, Languages proportionally` : ""}
${curriculum === "CBC" ? `## CBC
- Frame tasks as scenarios the learner acts on (projects, investigations, demonstrations)
- Prioritise practical skill-building; integrate everyday Kenyan life contexts` : ""}
${curriculum === "IGCSE" ? `## IGCSE
- Align to Cambridge Assessment objectives
- AO1 (recall) → state, name, list; AO2 (apply) → describe, explain, calculate; AO3 (analyse) → evaluate, discuss, suggest
- At least 40% of tasks target AO2 or AO3` : ""}
${curriculum === "MIXED" ? `## MIXED
- Balance KCSE and IGCSE requirements equally
- Alternate Kenyan context tasks with Cambridge command verb tasks` : ""}

════════════════════════════════════════
DAILY QUOTE RULE
════════════════════════════════════════

Each daily_quote MUST be:
- A real, attributed quote from a known person
- Relevant to learning, effort, or academic growth; under 20 words
- Format (single JSON string, NO inner quotes around the quote text):
  "Quote text — First Last"

✓  "Education is the most powerful weapon you can use to change the world. — Nelson Mandela"
✗  "Education is the most powerful weapon..." — Nelson Mandela

════════════════════════════════════════
MATH FORMATTING IN TASKS
════════════════════════════════════════

When a task involves math, use LaTeX in task and study_tip strings:
Inline: $x^2 + 3x - 4 = 0$    Block: $$ F = ma $$
Roots: $\\sqrt{x}$    Fractions: $\\frac{a}{b}$    Chemistry: $\\text{H}_2\\text{O}$
NEVER write: x^2, sqrt(x), H2O in plain text.

════════════════════════════════════════
OUTPUT SCHEMA
════════════════════════════════════════

{
  "plan_metadata": {
    "start_date": "${today}",
    "end_date": "${endDate}",
    "total_tasks": 14,
    "curriculum": "${curriculum}",
    "curriculum_details": { "type": "${curriculum}", "specific_requirements": "string" },
    "focus_areas": ["string"],
    "weekly_goal": "string",
    "estimated_weekly_hours": "string"
  },
  "daily_plans": [
    {
      "date": "YYYY-MM-DD",
      "day_of_week": "string",
      "daily_focus": "string — today's learning goal",
      "curriculum_focus": "${curriculum}",
      "tasks": [
        {
          "id": "task-YYYY-MM-DD-1",
          "date": "YYYY-MM-DD",
          "subject": "string",
          "topic": "string",
          "curriculum": "${curriculum}",
          "task": "string — specific, actionable instruction",
          "duration": "string e.g. 45 min",
          "priority": "high | medium | low",
          "type": "theory | practice | revision | past_paper | project",
          "study_tip": "string — short actionable tip, LaTeX where relevant",
          "tags": ["string"]
        },
        {
          "id": "task-YYYY-MM-DD-2",
          "date": "YYYY-MM-DD",
          "subject": "string",
          "topic": "string",
          "curriculum": "${curriculum}",
          "task": "string",
          "duration": "string",
          "priority": "high | medium | low",
          "type": "theory | practice | revision | past_paper | project",
          "study_tip": "string",
          "tags": ["string"]
        }
      ],
      "daily_quote": "string — attributed quote under 20 words"
    }
  ]
}

"daily_plans" MUST contain exactly 7 objects covering ${today} through ${endDate}.
Each "tasks" array MUST contain exactly 2 objects.
Generate the JSON now.`;
}
