import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/client/supabase";
import { GilaniLoader } from "@/client/components/GilaniLoader";
import { toast } from "sonner";
import { Flame, BookOpen, Timer as TimerIcon } from "lucide-react";
import { AppHeader } from "@/client/components/layout/AppHeader";
import { QuizProgressBar } from "@/client/components/tutor/quiz/QuizProgressBar";
import { QuizQuestionCard } from "@/client/components/tutor/quiz/QuizQuestionCard";
import { QuizResultSummary } from "@/client/components/tutor/quiz/QuizResultSummary";
import { submitQuizAttemptFn, type QuizQuestion } from "@/fns/quiz.server-fns";

export const Route = createFileRoute("/_authenticated/tutor/quizzes_/$quizId")({
  component: QuizTakeRoute,
});

interface AnsweredEntry {
  question: QuizQuestion;
  selectedIndex: number;
  correct: boolean;
}

function QuizTakeRoute() {
  const { quizId } = Route.useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered] = useState<AnsweredEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<QuizQuestion[] | null>(null);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [mode, setMode] = useState<"practice" | "test" | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from("quizzes")
          .select("id, topic, questions, user_id")
          .eq("id", quizId)
          .eq("user_id", user.id)
          .single();
        if (error || !data) throw error || new Error("Quiz not found");
        if (mounted) {
          setQuestions((data.questions as unknown as QuizQuestion[]) || []);
          setTopic(data.topic);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load quiz");
        navigate({ to: "/tutor/quizzes" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [quizId]);

  const activeQuestions = pendingQuestions ?? questions ?? [];
  const currentQuestion = activeQuestions[currentIndex];

  const handleAnswer = (selectedIndex: number, correct: boolean) => {
    if (hasAnsweredCurrent) return;
    setHasAnsweredCurrent(true);
    setAnswered((prev) => [...prev, { question: currentQuestion, selectedIndex, correct }]);
    setStreak((s) => (correct ? s + 1 : 0));
  };

  const handleNext = async () => {
    if (currentIndex + 1 < activeQuestions.length) {
      setCurrentIndex((i) => i + 1);
      setHasAnsweredCurrent(false);
      return;
    }

    setShowResult(true);

    if (!pendingQuestions) {
      try {
        await submitQuizAttemptFn({
          data: {
            quizId,
            answers: answered.map((a) => ({
              questionId: a.question.id,
              selectedIndex: a.selectedIndex,
              correct: a.correct,
              topic: a.question.topic,
            })),
          },
        } as any);
      } catch (err) {
        console.error("Failed to record quiz attempt:", err);
      }
    }
  };

  const resetState = () => {
    setCurrentIndex(0);
    setAnswered([]);
    setStreak(0);
    setShowResult(false);
    setHasAnsweredCurrent(false);
    setMode(null);
  };

  const handleRetryAll = () => {
    setPendingQuestions(null);
    resetState();
  };

  const handleRetryMissed = () => {
    const missed = answered.filter((a) => !a.correct).map((a) => a.question);
    setPendingQuestions(missed);
    resetState();
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <AppHeader title="Quiz" subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <GilaniLoader />
        </div>
      </div>
    );
  }

  if (!activeQuestions.length) {
    return (
      <div className="h-full flex flex-col">
        <AppHeader title="Quiz" subtitle={topic} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          This quiz has no questions.
        </div>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="h-full flex flex-col bg-background">
        <AppHeader title={topic} subtitle="Choose a mode" />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <button
              onClick={() => setMode("practice")}
              className="w-full flex items-start gap-3 p-5 rounded-2xl border-2 border-border bg-card hover:border-primary/50 transition-colors text-left"
            >
              <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Practice Mode</p>
                <p className="text-sm text-muted-foreground">
                  See if you're right and read the explanation after each question.
                </p>
              </div>
            </button>
            <button
              onClick={() => setMode("test")}
              className="w-full flex items-start gap-3 p-5 rounded-2xl border-2 border-border bg-card hover:border-primary/50 transition-colors text-left"
            >
              <TimerIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Test Mode</p>
                <p className="text-sm text-muted-foreground">
                  Answer every question first — see your full results and explanations only at the
                  end, like a real exam.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <AppHeader
        title={topic}
        subtitle={
          showResult ? "Results" : `Question ${currentIndex + 1} of ${activeQuestions.length}`
        }
        actions={
          !showResult && streak > 1 ? (
            <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
              <Flame className="h-4 w-4" />
              {streak} streak
            </span>
          ) : undefined
        }
      />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-2xl mx-auto">
          {!showResult && (
            <>
              <div className="mb-8">
                <QuizProgressBar current={currentIndex} total={activeQuestions.length} />
              </div>
              <QuizQuestionCard
                key={currentQuestion.id}
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                onAnswer={handleAnswer}
                mode={mode}
              />
              {hasAnsweredCurrent && (
                <button
                  onClick={handleNext}
                  className="mt-6 w-full bg-primary text-primary-foreground px-4 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  {currentIndex + 1 < activeQuestions.length ? "Next Question" : "See Results"}
                </button>
              )}
            </>
          )}
          {showResult && (
            <QuizResultSummary
              answered={answered}
              onRetryAll={handleRetryAll}
              onRetryMissed={handleRetryMissed}
              onExit={() => navigate({ to: "/tutor/quizzes" })}
              mode={mode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
