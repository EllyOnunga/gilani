import { useState, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getErrorMessage, withTimeout } from "@/lib/async";

// ─── Types ─────────────────────────────────────────────────────────────────────

type MCQ = {
  question: string;
  options: string[]; // exactly 4
  correct: number; // 0-indexed
  explanation: string;
};

// ─── Server Functions ──────────────────────────────────────────────────────────

const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator(z.object({ topic: z.string(), count: z.number(), userId: z.string() }))
  .handler(async ({ data }) => {
    const { topic, count, userId } = data;
    
    // SECURITY: Validate inputs
    if (!topic.trim()) {
      throw new Error("Topic is required");
    }
    if (count < 1 || count > 50) {
      throw new Error("Question count must be between 1 and 50");
    }
    
    const LOVABLE_API_KEY = process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY || "";
    const model = createLovableAiGatewayProvider(LOVABLE_API_KEY).chatModel(
      "gemini-1.5-flash",
    );
    const { generateText } = await import("ai");
    const { text } = await generateText({
      model,
      prompt: `You are an expert KCSE/CBC examiner. Generate exactly ${count} multiple-choice questions on the topic: "${topic}".
Return ONLY valid JSON (no markdown fences) with this exact shape:
[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]
where "correct" is the 0-based index of the correct option.
Make questions challenging but fair. Explanations should be concise and educational.`,
    });

    let questions: MCQ[] = [];
    try {
      const clean = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      questions = JSON.parse(clean);
      if (!Array.isArray(questions)) throw new Error("not array");
    } catch {
      throw new Error("AI returned invalid quiz format. Please try again.");
    }

    // Insert the generated quiz into the `quizzes` table so we have a persistent record & ID
    const { data: quiz, error } = await supabaseAdmin
      .from("quizzes")
      .insert({
        topic,
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
  head: () => ({ meta: [{ title: "Mock Quizzes — GilaniAI" }] }),
  component: QuizzesPage,
});

const TOPICS = [
  "Mathematics — Algebra",
  "Mathematics — Geometry",
  "Biology — Photosynthesis",
  "Biology — Cell Division",
  "Chemistry — Periodic Table",
  "Chemistry — Acids & Bases",
  "Physics — Mechanics",
  "Physics — Electricity",
  "History & Government",
  "Geography — Physical Features",
  "English — Grammar",
  "Kiswahili — Fasihi",
  "Computer Studies",
  "Business Studies",
];

type Phase = "setup" | "loading" | "quiz" | "results";

function QuizzesPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState<boolean[]>([]);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showExplain, setShowExplain] = useState(false);

  const activeTopic = customTopic.trim() || topic;

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
      let resWithTimeout: { quizId: string; questions: MCQ[] } | null = null;
      const attempts = [45000, 60000];
      for (let i = 0; i < attempts.length; i += 1) {
        try {
          resWithTimeout = await withTimeout(
            generateQuiz({
              data: { topic: activeTopic, count: questionCount, userId: session.user.id },
            }),
            attempts[i],
            "Quiz generation timed out. Please try again.",
          );
          break;
        } catch (attemptErr) {
          if (i === attempts.length - 1) {
            throw attemptErr;
          }
          toast.message("Quiz is taking longer than expected, retrying once…");
        }
      }
      if (!resWithTimeout) {
        throw new Error("Quiz generation failed. Please try again.");
      }
      setQuizId(resWithTimeout.quizId);
      setQuestions(resWithTimeout.questions);
      setCurrent(0);
      setSelected(null);
      setAnswered(new Array(resWithTimeout.questions.length).fill(false));
      setUserAnswers(new Array(resWithTimeout.questions.length).fill(-1));
      setShowExplain(false);
      setPhase("quiz");
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
      .map((q) => q.question.slice(0, 60));

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
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            Mock Quizzes
          </p>
          <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Test Your Knowledge</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            GilaniAI generates KCSE/CBC aligned MCQ questions and tracks your weak topics.
          </p>
        </header>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          {quizError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              {quizError} If this keeps happening, reduce question count or try another topic.
            </div>
          )}
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
          Crafting {questionCount} questions on {activeTopic}
        </p>
        <p className="text-xs text-muted-foreground">
          This can take up to a minute during high load.
        </p>
        <button
          onClick={() => {
            setIsGenerating(false);
            setPhase("setup");
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
        >
          Cancel and edit topic
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
            Topic: <strong>{activeTopic}</strong>
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

          {/* Score bar */}
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
                className={`flex gap-3 p-3 rounded-lg ${correct ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
              >
                {correct ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{q.question}</p>
                  {!correct && (
                    <p className="text-xs text-muted-foreground mt-1">
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
          <span>{activeTopic}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h3 className="font-serif text-xl leading-snug">{q.question}</h3>

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
    </div>
  );
}
