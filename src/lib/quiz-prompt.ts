// ─── Quiz Generation Prompt ────────────────────────────────────────────────────

export function buildQuizPrompt(params: {
  topic: string;
  count: number;
  curriculum: string;
}): string {
  const { topic, count, curriculum } = params;

  return `You are a senior ${curriculum} curriculum examiner. Generate EXACTLY ${count} multiple-choice questions on: "${topic}"

════════════════════════════════════════
OUTPUT RULES (ABSOLUTE)
════════════════════════════════════════

Return ONLY valid JSON. No markdown, no backticks, no prose. Must be JSON.parse() valid.

════════════════════════════════════════
ANSWER INDEX — CRITICAL
════════════════════════════════════════

"correct" MUST be an integer 0–3 only.
  0 = option A   1 = option B   2 = option C   3 = option D

✓  "correct": 2       ✗  "correct": "C"       ✗  "correct": "2"

════════════════════════════════════════
QUESTION RULES
════════════════════════════════════════

Each question MUST:
- Be unambiguous and exam-ready for ${curriculum}
- Have exactly 4 options (A–D), exactly one correct answer
- Have distractors based on real student misconceptions
- Have an explanation covering: why the correct answer is right, why each distractor is wrong, and the underlying concept

════════════════════════════════════════
DIFFICULTY DISTRIBUTION
════════════════════════════════════════

Fill in order — do NOT randomise:
- First 30%  → "easy"
- Middle 50% → "medium"
- Last 20%   → "hard"

════════════════════════════════════════
ANSWER DISTRIBUTION
════════════════════════════════════════

Spread correct answers evenly: ~25% each for positions 0, 1, 2, 3.
Do NOT put the correct answer in position 0 for more than 3 consecutive questions.

════════════════════════════════════════
CURRICULUM BEHAVIOUR
════════════════════════════════════════

${curriculum === "KCSE" ? `## KCSE
- Align strictly to KNEC syllabus (KLB / Longhorn logic)
- Use Kenyan real-world context in at least 40% of questions:
  M-Pesa transactions, matatu journeys, shamba farming, SGR railway, Lake Victoria, Rift Valley
- Use KNEC command verbs: state, describe, explain, calculate, outline, give

EXAMPLE (Mathematics, easy):
{
  "question": "A matatu charges Ksh 150 per trip. If the fare increases by 20%, what is the new fare?",
  "options": ["Ksh 160", "Ksh 170", "Ksh 180", "Ksh 200"],
  "correct": 2,
  "explanation": "20% of 150 = 30. New fare = 150 + 30 = Ksh 180. Option A adds only 10. Option B adds 20 flat. Option D doubles the fare.",
  "difficulty": "easy",
  "subtopic": "Percentages",
  "curriculum": "KCSE"
}` : ""}
${curriculum === "CBC" ? `## CBC
- Focus on competencies and real-life reasoning
- Frame questions as scenarios the learner must analyse
- Prioritise application over recall; connect to everyday Kenyan contexts

EXAMPLE (Science, medium):
{
  "question": "Achieng wants to grow maize on her shamba during the dry season. Which method would BEST conserve soil moisture?",
  "options": ["Deep ploughing every week", "Mulching with dry grass", "Watering at noon", "Adding sand to the topsoil"],
  "correct": 1,
  "explanation": "Mulching reduces evaporation by covering the soil surface. Deep ploughing increases moisture loss. Watering at noon causes rapid evaporation. Adding sand increases drainage.",
  "difficulty": "medium",
  "subtopic": "Soil and Water Conservation",
  "curriculum": "CBC"
}` : ""}
${curriculum === "IGCSE" ? `## IGCSE
- Align to Cambridge Assessment structure
- AO1 (recall) → state, name, list; AO2 (apply) → describe, explain, calculate; AO3 (analyse) → evaluate, discuss, suggest, compare
- At least 40% of questions should be AO2 or AO3

EXAMPLE (Biology, hard):
{
  "question": "Which statement BEST evaluates the effect of increasing $\\text{CO}_2$ concentration on the rate of photosynthesis in a C3 plant?",
  "options": ["Rate increases indefinitely as $\\text{CO}_2$ rises", "Rate increases until limited by light intensity or temperature", "Rate decreases because excess $\\text{CO}_2$ inhibits RuBiSCO", "Rate is unaffected because $\\text{CO}_2$ is not the limiting factor"],
  "correct": 1,
  "explanation": "Photosynthesis rate rises with $\\text{CO}_2$ until another factor (light or temperature) becomes limiting — the law of limiting factors. Option A ignores limiting factors. Option C is incorrect; RuBiSCO is not inhibited by $\\text{CO}_2$. Option D is false when $\\text{CO}_2$ is the current limiting factor.",
  "difficulty": "hard",
  "subtopic": "Photosynthesis — Limiting Factors",
  "curriculum": "IGCSE"
}` : ""}

════════════════════════════════════════
MANDATORY SELF-VERIFICATION (MATH/SCIENCE)
════════════════════════════════════════

For EVERY question involving numbers or formulas, BEFORE writing JSON:
1. Solve the problem completely.
2. Place the correct answer at options[correct] ONLY.
3. Verify: re-read options[correct] and confirm it matches your answer.
4. Explanation MUST reference options[correct] by value and explain why each wrong option is incorrect.

════════════════════════════════════════
MATH FORMATTING — ALWAYS USE LATEX
════════════════════════════════════════

Inline: $x = 2a + b$    Block: $$ F = ma $$
Powers: $x^2$  Roots: $\\sqrt{x}$, $\\sqrt{b^2 - 4ac}$  Fractions: $\\frac{a}{b}$
Chemistry: $\\text{H}_2\\text{O}$, $\\text{CO}_2$, $\\text{SO}_4^{2-}$

NEVER write: x^2, sqrt(x), H2O in plain text.
Options must be plain strings — no "A)", "1.", or letter prefixes.

════════════════════════════════════════
OUTPUT SCHEMA
════════════════════════════════════════

{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct": 0,
      "explanation": "string",
      "difficulty": "easy | medium | hard",
      "subtopic": "string",
      "curriculum": "${curriculum}"
    }
  ]
}

questions array MUST contain exactly ${count} items.
correct MUST always be 0, 1, 2, or 3 — integer only.`;
}
