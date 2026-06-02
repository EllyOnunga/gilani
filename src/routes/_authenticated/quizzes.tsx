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
      userId: z.string(),
      curriculum: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const { topic, count, userId, curriculum } = data;

    // SECURITY: Validate inputs
    if (!topic.trim()) {
      throw new Error("Topic is required");
    }
    if (count < 1 || count > 50) {
      throw new Error("Question count must be between 1 and 50");
    }

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
              })
            ),
          }),
          prompt: `You are a senior curriculum examiner specialized in ${curriculum}. Generate exactly ${count} unique multiple-choice questions on the topic: "${topic}".

## OUTPUT FORMAT
CRITICAL: You must return the output strictly as a valid json object matching the provided structural validation schema. Do not wrap the response in markdown code blocks or backticks (e.g., do not use \`\`\`json). The response must be clean, raw json payload.

## STUDENT CONTEXT
- Target Curriculum: ${curriculum}
- Purpose: Formative assessment identifying knowledge gaps.
- Difficulty mix: 30% easy, 50% medium, 20% hard.

## CURRICULUM-SPECIFIC GUIDELINES
- **KCSE**: Align to KNEC syllabus/past papers (Form 1-4). Use Kenyan textbook references (KLB, Longhorn) and localized contexts (e.g., M-Pesa, localized geography, agriculture).
- **CBC**: Focus on the 7 core competencies, scenario-based problem solving, and grade-appropriate practical tasks.
- **IGCSE**: Use Cambridge command words (describe, explain, evaluate). Structure questions across Core/Extended tier logic matching assessments objectives AO1, AO2, and AO3.

## QUESTION & OPTION DESIGN
1. **JSON Array Payload**: Ensure your generated response maps accurately onto the structured json questions schema definitions.
2. **Formatting**: Wrap ALL math, chemical notation, and formulas cleanly using single-dollar sign delimiters like $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$ or block expression delimiters $F = ma$. Do NOT use markdown code blocks or brackets [ ] for equations inside the json text keys.
3. **Options**: Provide exactly 4 options (A, B, C, D). Ensure all distractors are plausible, tracking common misconceptions (calculation errors, reversed processes, or grammar slips).
4. **Answers**: Exactly one clearly correct answer. Use a "correct" field with a 0-based integer index (0=A, 1=B, 2=C, 3=D). Never use "All of the above" or "None of the above".
5. **Explanation**: Format explanations strictly with:
   - ✅ Correct Answer Explanation
   - ❌ Distractor Breakdown
   - 📚 Key Rule / Textbook reference`,
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

    // Helper: resolve correct answer index from letter OR number
    const resolveCorrectIndex = (raw: MCQ["correct"] | string | undefined | null, fallback = 0): number => {
      if (typeof raw === "number") return Math.max(0, Math.min(3, raw));
      if (typeof raw === "string") {
        const upper = raw.trim().toUpperCase();
        const map: Record<string, number> = { "A": 0, "B": 1, "C": 2, "D": 3, "0": 0, "1": 1, "2": 2, "3": 3 };
        return map[upper] ?? fallback;
      }
      return fallback;
    };

    const questions: MCQ[] = ((object.questions || []) as Array<{
      question: string; options: string[]; correct?: number | string;
      answer?: number | string; explanation?: string;
      difficulty?: string; subtopic?: string; curriculum?: string;
    }>).map((q) => {
      // Accept either "correct" (numeric) or "answer" (letter/number) from various models
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

    // Insert the generated quiz into the `quizzes` table
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

    return {
      quizId: quiz.id,
      questions,
    };
  });

const saveAttempt = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      quizId: z.string(),
      score: z.number(),
      answers: z.array(z.number()),
      weakTopics: z.array(z.string()),
    }),
  )
  .handler(async ({ data }) => {
    const { userId, quizId, score, answers, weakTopics } = data;
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
  head: () => ({ meta: [{ title: "Practice Quizzes — GilaniAI" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    topic: (search.topic as string) || "",
  }),
  component: QuizzesPage,
});

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

  // Fetch user's curriculum preference
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
    if (topicFromUrl) {
      setCustomTopic(topicFromUrl);
    }
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
            userId: session.user.id,
            curriculum: curriculum,
          },
        }),
        90000, // 90 seconds timeout
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
    const wrongTopics = questions
      .filter((_, i) => userAnswers[i] !== questions[i].correct)
      .map((q) => q.subtopic || q.question.slice(0, 60));

    try {
      const res = await supabase.auth.getSession();
      const session = res?.data?.session;
      if (session && quizId) {
        await withTimeout(
          saveAttempt({
            data: {
              userId: session.user.id,
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
  }, [userAnswers, questions, quizId]);

  const score = userAnswers.filter((a, i) => a === questions[i]?.correct).length;
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const q = questions[current];

  // ── Setup screen ──────────────────────────────────────────────────────────
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
            <ListChecks className="h-4 w-4" /> {isGenerating ? "Generating…" : "Generate Quiz"}
          </button>
        </div>
      </div>
    );
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full py-40 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-serif text-xl text-muted-foreground">Generating your quiz…</p>
        <p className="text-sm text-muted-foreground font-mono">
          Crafting {questionCount} {curriculum}-aligned questions on {activeTopic}
        </p>
        <p className="text-xs text-muted-foreground">
          This can take up to 90 seconds during high load.
        </p>
        <button
          onClick={() => {
            setIsGenerating(false);
            setPhase("setup");
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ── Results screen ─────────────────────────────────────────────────────────
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
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {correct ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{q.question}</p>
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
                      <span className="font-semibold text-red-700">
                        {q.options[userAnswers[i]]}
                      </span>
                      {" • "}
                      Correct:{" "}
                      <span className="font-semibold text-green-700">{q.options[q.correct]}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 italic">{q.explanation}</p>
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

  // ── Quiz screen ────────────────────────────────────────────────────────────
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
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-xl leading-snug">{q.question}</h3>
            {q.difficulty && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${
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
                  cls += "border-green-500 bg-green-50 text-green-800 font-semibold";
                else if (i === userAnswers[current] && i !== q.correct)
                  cls += "border-red-400 bg-red-50 text-red-700";
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
                  {opt}
                </button>
              );
            })}
          </div>

          {showExplain && (
            <div className="rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-sm text-muted-foreground italic animate-in-slide">
              💡 {q.explanation}
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