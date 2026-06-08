// app/routes/_authenticated/quizzes.tsx
import { useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  ListChecks,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Trophy,
  RotateCcw,
  Loader2,
  BookOpen,
  GraduationCap,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getErrorMessage, withTimeout } from "@/lib/async";
import { MathText } from "@/components/math-text";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";

// ─── Types ─────────────────────────────────────────────────────────────────────

type CurriculumType = "KCSE" | "CBC" | "IGCSE";

type MCQ = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  subtopic: string;
  curriculum: CurriculumType;
};

// ─── Server Functions ──────────────────────────────────────────────────────────

const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      topic: z.string(),
      count: z.number(),
      curriculum: z.string(),
      // userId removed
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;
    const { topic, count, curriculum } = data;
    if (!topic.trim()) throw new Error("Topic is required");
    if (count < 1 || count > 50) throw new Error("Question count must be between 1 and 50");

    const gateway = createLovableAiGatewayProvider();
    const models = (gateway as any).getAllChatModels();
    const { generateObject } = await import("ai");

    let object: any = null;
    let lastError: any = null;

    for (const model of models) {
      try {
        console.log(`[Quiz Generation] Attempting with model: ${model.provider}/${model.modelId}`);
        const result = await generateObject({
          model,
          schema: z.object({
            questions: z.array(
              z.object({
                question: z.string(),
                options: z.array(z.string()).min(4).max(4),
                correct: z.union([z.number(), z.string()]).optional(),
                answer: z.union([z.number(), z.string()]).optional(),
                explanation: z.string().optional().default(""),
                difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
                subtopic: z.string().optional().default(""),
                curriculum: z.string().optional().default(""),
              }),
            ),
          }),
          prompt: `You are a senior curriculum examiner for ${curriculum}.

Generate EXACTLY ${count} multiple-choice questions on: "${topic}"

════════════════════════════════════════
OUTPUT RULES (ABSOLUTE)
════════════════════════════════════════

Return ONLY valid JSON matching the schema.
- No markdown, no backticks, no prose outside JSON
- No trailing commas, no comments
- Output must be JSON.parse() valid

════════════════════════════════════════
ANSWER INDEX (CRITICAL)
════════════════════════════════════════

"correct" MUST be an integer 0–3 only:
  0 = option A   1 = option B   2 = option C   3 = option D

✓  "correct": 2
✗  "correct": "C"
✗  "correct": "option C"
✗  "correct": "2"

════════════════════════════════════════
QUESTION RULES
════════════════════════════════════════

Each question MUST:
- Be unambiguous and exam-ready
- Have exactly 4 options (A–D)
- Have exactly one correct answer
- Include distractors based on real student misconceptions
- Include an explanation covering: why the correct answer is right, why distractors are wrong, and the underlying concept

════════════════════════════════════════
DIFFICULTY SLOTS
════════════════════════════════════════

Assign difficulties in this order across all ${count} questions:
- First 30%  → "easy"
- Middle 50% → "medium"
- Last 20%   → "hard"

Do not randomise. Fill slots in order.

════════════════════════════════════════
CURRICULUM BEHAVIOUR
════════════════════════════════════════

${
  curriculum === "KCSE"
    ? `
## KCSE
- Align strictly to KNEC syllabus (KLB / Longhorn logic)
- Use Kenyan real-world context in at least 40% of questions:
  M-Pesa transactions, matatu journeys, shamba farming,
  SGR railway, Lake Victoria, Rift Valley geography
- Use KNEC command verbs: state, describe, explain, calculate, outline, give

EXAMPLE 1 (Mathematics, easy):
{
  "question": "A matatu charges Ksh 150 per trip. If the fare increases by 20%, what is the new fare?",
  "options": ["Ksh 160", "Ksh 170", "Ksh 180", "Ksh 200"],
  "correct": 2,
  "explanation": "20% of 150 = 30. New fare = 150 + 30 = 180. Option A adds only 10. Option B adds 20 flat. Option D doubles the fare.",
  "difficulty": "easy",
  "subtopic": "Percentages",
  "curriculum": "KCSE"
}

EXAMPLE 2 (Mathematics, medium):
{
  "question": "Simplify $\\sqrt{144} + 3^2$",
  "options": ["21", "25", "27", "18"],
  "correct": 0,
  "explanation": "$\\sqrt{144} = 12$ and $3^2 = 9$. So $12 + 9 = 21$. Option B assumes $\\sqrt{144} = 16$. Option C assumes $3^2 = 6$. Option D subtracts instead of adds.",
  "difficulty": "medium",
  "subtopic": "Indices and Surds",
  "curriculum": "KCSE"
}`
    : ""
}
${
  curriculum === "CBC"
    ? `
## CBC
- Focus on competencies and real-life reasoning
- Frame questions as scenarios the learner must analyse
- Prioritise application over recall
- Connect to everyday Kenyan contexts

EXAMPLE (Science, medium):
{
  "question": "Achieng wants to grow maize on her shamba during the dry season. Which method would BEST conserve soil moisture?",
  "options": ["Deep ploughing every week", "Mulching with dry grass", "Watering at noon", "Adding sand to the topsoil"],
  "correct": 1,
  "explanation": "Mulching reduces evaporation by covering the soil surface. Deep ploughing increases moisture loss. Watering at noon causes rapid evaporation. Adding sand increases drainage.",
  "difficulty": "medium",
  "subtopic": "Soil and Water Conservation",
  "curriculum": "CBC"
}`
    : ""
}
${
  curriculum === "IGCSE"
    ? `
## IGCSE
- Align to Cambridge Assessment structure
- Use command verbs correctly:
  AO1 (recall) → state, name, list
  AO2 (apply) → describe, explain, calculate
  AO3 (analyse) → evaluate, discuss, suggest, compare
- At least 40% of questions should be AO2 or AO3

EXAMPLE (Biology, hard):
{
  "question": "Which statement BEST evaluates the effect of increasing $\\text{CO}_2$ concentration on the rate of photosynthesis in a C3 plant?",
  "options": [
    "Rate increases indefinitely as $\\text{CO}_2$ rises",
    "Rate increases until limited by light intensity or temperature",
    "Rate decreases because excess $\\text{CO}_2$ inhibits RuBiSCO",
    "Rate is unaffected because $\\text{CO}_2$ is not the limiting factor"
  ],
  "correct": 1,
  "explanation": "Photosynthesis rate rises with $\\text{CO}_2$ until another factor (light or temperature) becomes limiting — the law of limiting factors. Option A ignores limiting factors. Option C is incorrect; RuBiSCO is not inhibited by $\\text{CO}_2$. Option D is false when $\\text{CO}_2$ is the current limiting factor.",
  "difficulty": "hard",
  "subtopic": "Photosynthesis — Limiting Factors",
  "curriculum": "IGCSE"
}`
    : ""
}
════════════════════════════════════════
ANSWER DISTRIBUTION RULE
════════════════════════════════════════

Across all ${count} questions, distribute correct answers:
- correct: 0  → approximately 25% of questions
- correct: 1  → approximately 25% of questions
- correct: 2  → approximately 25% of questions
- correct: 3  → approximately 25% of questions

Do NOT put the correct answer in position 0 for more than 3 consecutive questions.
Do NOT make option A always correct or always wrong.

════════════════════════════════════════
MANDATORY SELF-VERIFICATION (CRITICAL FOR MATH/SCIENCE)
════════════════════════════════════════

For EVERY question involving numbers, formulas, or calculations:

BEFORE writing the JSON, you MUST:
1. Solve the problem yourself completely.
2. Identify the correct numerical/factual answer.
3. Place that answer at options[correct] ONLY.
4. Verify: re-read options[correct] and confirm it matches your answer.
5. Write the explanation showing:
   a. The formula used (in LaTeX)
   b. The substitution with values
   c. The step-by-step calculation
   d. The final answer and which option index it corresponds to
   e. Why each wrong option is incorrect (common misconception)

The explanation MUST reference the content of options[correct] by value.
NEVER write an explanation that describes a different option as correct.

════════════════════════════════════════
FORMATTING
════════════════════════════════════════

Math — always wrap in LaTeX:
- Inline: $x = 2a + b$
- Block: $$ F = ma $$
- Powers: $x^2$ (squared), $x^3$ (cubed), $x^n$ (nth power)
- Roots: $\\sqrt{x}$, $\\sqrt[3]{x}$, $\\sqrt[n]{x}$
- Nested roots: $\\sqrt{b^2 - 4ac}$ — always use braces
- Fractions: $\\frac{a}{b}$
- Quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
- Area of circle: $A = \\pi r^2$
- Volume of sphere: $V = \\frac{4}{3}\\pi r^3$
- Pythagorean theorem: $a^2 + b^2 = c^2$

Chemistry — always use subscripts/superscripts:
- $\\text{H}_2\\text{O}$, $\\text{CO}_2$, $\\text{SO}_4^{2-}$, $\\text{H}_2\\text{SO}_4$

NEVER write: x^2, sqrt(x), x**2, ²x, H2O in plain text — always use $...$
Options must be plain strings — no "A)", "1.", or letter prefixes

════════════════════════════════════════
REQUIRED OUTPUT
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
correct MUST always be 0, 1, 2, or 3 — integer only.
`,
          temperature: 0.15,
        });
        object = result.object;
        if (object && Array.isArray(object.questions) && object.questions.length > 0) {
          console.log(`[Quiz Generation] Success with model: ${model.provider}/${model.modelId}`);
          break;
        }
      } catch (err) {
        console.warn(`[Quiz Generation] Model ${model.provider}/${model.modelId} failed:`, err);
        lastError = err;
      }
    }

    if (!object) {
      throw lastError || new Error("Failed to generate quiz with all configured providers.");
    }

    const resolveCorrectIndex = (raw: MCQ["correct"] | string | undefined | null): number => {
      if (typeof raw === "number" && raw >= 0 && raw <= 3) return raw;
      if (typeof raw === "string") {
        const map: Record<string, number> = {
          A: 0,
          B: 1,
          C: 2,
          D: 3,
          "0": 0,
          "1": 1,
          "2": 2,
          "3": 3,
        };
        const result = map[raw.trim().toUpperCase()];
        if (result !== undefined) return result;
      }
      console.warn(`[Quiz] Could not resolve correct index from:`, raw, "— defaulting to 0");
      return 0;
    };

    const questions: MCQ[] = (
      (object.questions || []) as Array<{
        question: string;
        options: string[];
        correct?: number | string;
        answer?: number | string;
        explanation?: string;
        difficulty?: string;
        subtopic?: string;
        curriculum?: string;
      }>
    ).map((q) => {
      const rawCorrect = q.correct ?? q.answer;
      return {
        question: q.question,
        options: q.options,
        correct: resolveCorrectIndex(rawCorrect),
        explanation: q.explanation ?? "",
        difficulty: (q.difficulty ?? "medium") as "easy" | "medium" | "hard",
        subtopic: q.subtopic || topic,
        curriculum: (q.curriculum || curriculum) as CurriculumType,
      };
    });

    if (questions.length === 0) {
      throw new Error("No questions were generated by the AI agent.");
    }

    // ── Server-side answer integrity check ──────────────────────────────────────
    // Warn when explanation doesn't mention the correct option text.
    // This catches the most common AI hallucination on math questions.
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const correctOption = q.options[q.correct] ?? "";
      const expl = q.explanation ?? "";
      const plainOption = correctOption
        .replace(/\$[^$]*\$/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (plainOption.length > 2 && expl && !expl.includes(plainOption)) {
        console.warn(
          `[Quiz QA] Q${i + 1}: explanation may not match correct option. ` +
            `correct=${q.correct} => "${correctOption.slice(0, 60)}" not found in explanation.`,
        );
      }
    }

    const { data: quiz, error } = await supabaseAdmin
      .from("quizzes")
      .insert({
        topic: `${topic} (${curriculum})`,
        questions: questions as any,
        difficulty: "medium",
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to persist generated quiz:", error);
      throw new Error("Failed to save generated quiz: " + error.message);
    }

    return { quizId: quiz.id, questions };
  });

const saveAttempt = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      quizId: z.string(),
      score: z.number(),
      answers: z.any(),
      weakTopics: z.array(z.string()),
      // userId removed
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;
    const { quizId, score, answers, weakTopics } = data;
    const { error } = await supabaseAdmin.from("quiz_attempts").insert({
      user_id: userId,
      quiz_id: quizId,
      score,
      answers: answers as any,
      weak_topics: weakTopics as any,
    });
    if (error) {
      console.error("Failed to save quiz attempt:", error);
      throw new Error(error.message);
    }
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/quizzes")({
  head: () => ({
    meta: [
      { title: "Practice Quizzes — GilaniAI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    topic: (search.topic as string) || "",
  }),
  component: QuizzesPage,
});

// ─── Constants ─────────────────────────────────────────────────────────────────

const TOPICS = [
  "Mathematics — Algebra",
  "Mathematics — Geometry",
  "Mathematics — Calculus",
  "Biology — Photosynthesis",
  "Biology — Cell Division",
  "Biology — Genetics",
  "Chemistry — Periodic Table",
  "Chemistry — Acids & Bases",
  "Chemistry — Organic Chemistry",
  "Physics — Mechanics",
  "Physics — Electricity",
  "Physics — Waves",
  "History & Government",
  "Geography — Physical Features",
  "Geography — Human Geography",
  "English — Grammar",
  "English — Comprehension",
  "Kiswahili — Fasihi",
  "Kiswahili — Sarufi",
  "Computer Studies",
  "Business Studies",
  "Agriculture",
  "Home Science",
  "Religious Education (CRE/IRE)",
];

type Phase = "setup" | "loading" | "quiz" | "results";

const CURRICULUM_BADGE: Record<string, { bg: string; text: string; icon: any }> = {
  KCSE: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    icon: BookOpen,
  },
  CBC: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    icon: GraduationCap,
  },
  IGCSE: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    icon: Globe,
  },
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function CurriculumBadge({ curriculum }: { curriculum: string }) {
  const badge = CURRICULUM_BADGE[curriculum] || CURRICULUM_BADGE.KCSE;
  const Icon = badge.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
    >
      <Icon className="h-3 w-3" />
      {curriculum}
    </span>
  );
}

function LoadingStep({ label, detail, index }: { label: string; detail: string; index: number }) {
  const [state, setState] = useState<"waiting" | "active" | "done">("waiting");

  useEffect(() => {
    const activateAt = index * 1400;
    const doneAt = activateAt + 1200;
    const t1 = setTimeout(() => setState("active"), activateAt);
    const t2 = setTimeout(() => setState("done"), doneAt);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [index]);

  return (
    <div
      className="flex items-center gap-3"
      style={{
        animation: `stepIn 0.35s ease forwards`,
        animationDelay: `${index * 0.08}s`,
        opacity: 0,
      }}
    >
      {/* Status icon */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {state === "done" ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : state === "active" ? (
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        ) : (
          <div className="h-4 w-4 rounded-full border-2 border-border" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-medium leading-tight transition-colors duration-300 ${
            state === "waiting" ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{detail}</p>
      </div>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────

function QuizzesPage() {
  const [questionCount, setQuestionCount] = useState(10);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState<boolean[]>([]);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showExplain, setShowExplain] = useState(false);
  const { topic: topicFromUrl } = Route.useSearch();
  const [phase, setPhase] = useState<Phase>("setup");
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState(topicFromUrl || "");
  const [curriculum, setCurriculum] = useState<CurriculumType>("KCSE");

  const activeTopic = customTopic.trim() || topic;

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const res = await supabase.auth.getSession();
        const session = res?.data?.session;
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("curriculum")
            .eq("id", session.user.id)
            .maybeSingle();
          if (profile?.curriculum) {
            setCurriculum(profile.curriculum as CurriculumType);
          }
        }
      } catch (err) {
        console.error("Failed to fetch curriculum:", err);
      }
    };
    fetchCurriculum();
  }, []);

  useEffect(() => {
    if (topicFromUrl) setCustomTopic(topicFromUrl);
  }, [topicFromUrl]);

  const startQuiz = async () => {
    if (isGenerating) return;
    setQuizError(null);
    setIsGenerating(true);
    setPhase("loading");
    try {
      const res = await supabase.auth.getSession();
      const session = res?.data?.session;
      if (!session) {
        toast.error("Not signed in");
        setIsGenerating(false);
        setPhase("setup");
        return;
      }
      const result = await withTimeout(
        generateQuiz({
          data: {
            topic: activeTopic,
            count: questionCount,
            curriculum,
          },
        }),
        90000,
        "Quiz generation timed out. Please try with fewer questions or a different topic.",
      );
      setQuizId(result.quizId);
      setQuestions(result.questions);
      setCurrent(0);
      setSelected(null);
      setAnswered(new Array(result.questions.length).fill(false));
      setUserAnswers(new Array(result.questions.length).fill(-1));
      setShowExplain(false);
      setPhase("quiz");
      toast.success(`Generated ${result.questions.length} questions!`);
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Failed to generate quiz");
      setQuizError(message);
      toast.error(message);
      setPhase("setup");
    } finally {
      setIsGenerating(false);
    }
  };

  const confirm = () => {
    if (selected === null) return;
    setAnswered((a) => {
      const copy = [...a];
      copy[current] = true;
      return copy;
    });
    setUserAnswers((a) => {
      const copy = [...a];
      copy[current] = selected;
      return copy;
    });
    setShowExplain(true);
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      finishQuiz();
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShowExplain(false);
    }
  };

  const finishQuiz = useCallback(async () => {
    setPhase("results");
    const score = userAnswers.filter((a, i) => a === questions[i]?.correct).length;
    const fallbackTopic = activeTopic.includes(" — ") ? activeTopic.split(" — ")[1] : activeTopic;
    const wrongTopics = questions
      .filter((_, i) => userAnswers[i] !== questions[i].correct)
      .map((q) => q.subtopic || fallbackTopic);
    try {
      const res = await supabase.auth.getSession();
      const session = res?.data?.session;
      if (session && quizId) {
        await withTimeout(
          saveAttempt({
            data: {
              quizId,
              score,
              answers: userAnswers,
              weakTopics: wrongTopics,
            },
          }),
          12000,
          "Saving quiz attempt timed out.",
        );
      }
    } catch (err: unknown) {
      console.error("Failed to save quiz attempt:", err);
      toast.error(getErrorMessage(err, "Could not save quiz attempt"));
    }
  }, [userAnswers, questions, quizId, activeTopic]);

  const score = userAnswers.filter((a, i) => a === questions[i]?.correct).length;
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const q = questions[current];

  // ── Setup screen ────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8 lg:p-12">
        <header className="animate-in-slide">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
              Practice Quizzes
            </p>
            <CurriculumBadge curriculum={curriculum} />
          </div>
          <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Test Your Knowledge</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            GilaniAI generates {curriculum}-aligned MCQ questions and tracks your weak topics.
          </p>
        </header>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          {quizError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              {quizError} If this keeps happening, reduce question count or try another topic.
            </div>
          )}

          {/* Curriculum Selector */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2 block">
              Curriculum
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["KCSE", "CBC", "IGCSE"] as CurriculumType[]).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurriculum(curr)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    curriculum === curr
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2 block">
              Choose Topic
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2 block">
              Or type a custom topic
            </label>
            <input
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="e.g. Kenyan Independence Movement"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2 block">
              Number of Questions: {questionCount}
            </label>
            <input
              type="range"
              min={5}
              max={20}
              step={5}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-[hsl(22,75%,48%)]"
            />
            <div className="flex justify-between font-mono text-[10px] text-muted-foreground mt-1">
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
            </div>
          </div>

          <button
            onClick={startQuiz}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            <ListChecks className="h-4 w-4" />
            {isGenerating ? "Generating…" : "Generate Quiz"}
          </button>
        </div>
      </div>
    );
  }

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (phase === "loading") {
    const steps = [
      { label: "Reading curriculum standards", detail: `Aligning to ${curriculum}` },
      { label: "Crafting questions", detail: `${questionCount} MCQs on ${activeTopic}` },
      { label: "Adding distractors", detail: "Based on common student mistakes" },
      { label: "Writing explanations", detail: "With Kenyan context where relevant" },
      { label: "Validating answers", detail: "Checking difficulty distribution" },
    ];

    return (
      <div className="flex items-center justify-center min-h-[70vh] p-4">
        <div className="w-full max-w-md space-y-4">
          {/* Main card */}
          <div className="rounded-2xl border border-border bg-card shadow-md overflow-hidden">
            {/* Animated shimmer bar */}
            <div className="h-1 w-full bg-muted overflow-hidden">
              <div className="h-full bg-primary w-1/3 animate-[shimmer_1.8s_ease-in-out_infinite]" />
            </div>

            <div className="p-6 space-y-5">
              {/* Icon + heading */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">Generating your quiz…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This can take up to 90 seconds
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Quiz detail chips */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <ListChecks className="h-3 w-3" />
                  {questionCount} questions
                </span>
                <CurriculumBadge curriculum={curriculum} />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground truncate max-w-[180px]">
                  {activeTopic}
                </span>
              </div>

              {/* Step list */}
              <div className="space-y-2.5">
                {steps.map((step, i) => (
                  <LoadingStep key={step.label} label={step.label} detail={step.detail} index={i} />
                ))}
              </div>
            </div>
          </div>

          {/* Cancel — outside card */}
          <button
            onClick={() => {
              setIsGenerating(false);
              setPhase("setup");
            }}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>

        <style>{`
          @keyframes shimmer {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
          @keyframes stepIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (phase === "results") {
    const grade =
      pct >= 80
        ? "Excellent!"
        : pct >= 60
          ? "Good work!"
          : pct >= 40
            ? "Keep practising."
            : "Need more revision.";

    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8 lg:p-12 text-center">
        <div className="animate-in-slide">
          <Trophy className="mx-auto h-14 w-14 text-primary mb-4" />
          <h2 className="font-serif text-3xl sm:text-4xl">{grade}</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Topic: <strong>{activeTopic}</strong> • <CurriculumBadge curriculum={curriculum} />
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
            Your Score
          </p>
          <p className="font-serif text-6xl font-bold text-primary">{pct}%</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {score} / {questions.length} correct
          </p>
          <div className="mt-6 h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Per-question breakdown */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm text-left space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Question Review
          </p>
          {questions.map((q, i) => {
            const correct = userAnswers[i] === q.correct;
            return (
              <div
                key={i}
                className={`flex gap-3 p-3 rounded-lg ${
                  correct
                    ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                }`}
              >
                {correct ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">
                      <MathText text={q.question} />
                    </p>
                    {q.difficulty && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase ${
                          q.difficulty === "easy"
                            ? "bg-green-100 text-green-700"
                            : q.difficulty === "hard"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    )}
                  </div>
                  {!correct && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Your answer:{" "}
                      <span className="font-semibold text-red-700 dark:text-red-400">
                        {q.options[userAnswers[i]]}
                      </span>
                      {" • "}
                      Correct:{" "}
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        {q.options[q.correct]}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    <MathText text={q.explanation} />
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            setPhase("setup");
            setQuestions([]);
            setQuizId(null);
          }}
          className="flex items-center gap-2 mx-auto rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-accent transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Try Another Quiz
        </button>
      </div>
    );
  }

  // ── Quiz screen ─────────────────────────────────────────────────────────────
  const progress = ((current + (answered[current] ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8 lg:p-12">
      {/* Progress */}
      <div className="animate-in-slide space-y-2">
        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
          <span>
            Question {current + 1} / {questions.length}
          </span>
          <div className="flex items-center gap-2">
            <span>{activeTopic}</span>
            <CurriculumBadge curriculum={curriculum} />
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      {q && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-serif text-xl leading-snug flex-1">
              <MathText text={q.question} />
            </h3>
            {q.difficulty && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase flex-shrink-0 ${
                  q.difficulty === "easy"
                    ? "bg-green-100 text-green-700"
                    : q.difficulty === "hard"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {q.difficulty}
              </span>
            )}
          </div>
          {q.subtopic && (
            <p className="text-xs text-muted-foreground -mt-3">Sub-topic: {q.subtopic}</p>
          )}

          <div className="space-y-3">
            {q.options.map((opt, i) => {
              let cls = "w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ";
              if (!answered[current]) {
                cls +=
                  selected === i
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:bg-accent";
              } else {
                if (i === q.correct)
                  cls +=
                    "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 font-semibold";
                else if (i === userAnswers[current] && i !== q.correct)
                  cls +=
                    "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400";
                else cls += "border-border text-muted-foreground";
              }
              return (
                <button
                  key={i}
                  className={cls}
                  disabled={answered[current]}
                  onClick={() => setSelected(i)}
                >
                  <span className="font-mono text-[11px] mr-2 uppercase">
                    {["A", "B", "C", "D"][i]}.
                  </span>
                  <MathText text={opt} />
                </button>
              );
            })}
          </div>

          {showExplain && (
            <div className="rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-sm text-muted-foreground italic animate-in-slide">
              💡 <MathText text={q.explanation} />
            </div>
          )}

          <div className="flex justify-end gap-3">
            {!answered[current] ? (
              <button
                onClick={confirm}
                disabled={selected === null}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                Confirm Answer
              </button>
            ) : (
              <button
                onClick={next}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {current + 1 >= questions.length ? "See Results" : "Next"}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
