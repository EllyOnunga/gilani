import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/client/supabase";
import { GilaniLoader } from "@/client/components/GilaniLoader";
import { PenTool, Brain, Calendar, CheckCircle2, Sparkles, X, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/shared/utils/async";
import { TutorPageHeader } from "@/client/components/tutor/TutorPageHeader";
import { generateQuizFn, getQuizFormOptionsFn, deleteQuizFn } from "@/fns/quiz.server-fns";
import { ConfirmDialog } from "@/client/components/shared/ConfirmDialog";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/_authenticated/tutor/quizzes")({
  component: QuizzesRoute,
});

function QuizzesRoute() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("mixed");
  const [questionCount, setQuestionCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [formOptions, setFormOptions] = useState<{
    maxQuestions: number;
    difficulties: string[];
    quizzesUsedToday: number;
    quizzesMaxToday: number;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const opts = await getQuizFormOptionsFn();
        const difficulties = (opts as any).difficulties as string[];
        const maxQuestions = (opts as any).maxQuestions as number;
        const quizzesUsedToday = (opts as any).quizzesUsedToday as number;
        const quizzesMaxToday = (opts as any).quizzesMaxToday as number;
        setFormOptions({ maxQuestions, difficulties, quizzesUsedToday, quizzesMaxToday });
        if (!difficulties.includes(difficulty)) {
          setDifficulty(difficulties[difficulties.length - 1] || "medium");
        }
        if (questionCount > maxQuestions) {
          setQuestionCount(maxQuestions);
        }
      } catch (err) {
        console.error("Failed to load quiz options:", err);
      }
    })();
  }, []);

  const fetchQuizzes = async (searchTerm: string, page: number, append: boolean) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      let query = supabase
        .from("quizzes")
        .select("id, topic, difficulty, questions, created_at, quiz_attempts(score)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (searchTerm.trim()) {
        query = query.ilike("topic", `%${searchTerm.trim()}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      const results = data || [];
      setQuizzes((prev) => (append ? [...prev, ...results] : results));
      setHasMore(results.length === PAGE_SIZE);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to load your quizzes."));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchQuizzes("", 0, false);
  }, []);

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setLoading(true);
      fetchQuizzes(value, 0, false);
    }, 350);
  };

  const onLoadMore = () => {
    setLoadingMore(true);
    fetchQuizzes(search, Math.floor(quizzes.length / PAGE_SIZE), true);
  };

  const onConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await deleteQuizFn({ data: { quizId: id } });
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      toast.success("Quiz deleted");
    } catch (err: any) {
      toast.error(friendlyError(err, "Couldn't delete this quiz. Please try again."));
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic to quiz yourself on");
      return;
    }
    setGenerating(true);
    try {
      const result = await generateQuizFn({
        data: { topic: topic.trim(), difficulty: difficulty as any, questionCount },
      } as any);
      toast.success("Quiz ready!");
      setShowForm(false);
      setTopic("");
      navigate({ to: "/tutor/quizzes/$quizId", params: { quizId: (result as any).quizId } });
    } catch (err: any) {
      toast.error(friendlyError(err, "Couldn't generate your quiz. Please try again."));
    } finally {
      setGenerating(false);
    }
  };

  if (loading)
    return (
      <div className="h-full flex flex-col">
        <TutorPageHeader title="Quiz Generator" subtitle="AI-generated assessments" />
        <div className="flex-1 flex items-center justify-center">
          <GilaniLoader />
        </div>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-background">
      <TutorPageHeader
        title="Quiz Generator"
        subtitle={
          quizzes.length > 0
            ? `${quizzes.length} quiz${quizzes.length !== 1 ? "zes" : ""}`
            : "Test your knowledge"
        }
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Brain className="h-4 w-4" />
            Generate Quiz
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {showForm && (
            <div className="border border-border bg-card rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    New Quiz
                  </h3>
                  {formOptions && formOptions.quizzesMaxToday < 999_999 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formOptions.quizzesUsedToday}/{formOptions.quizzesMaxToday} quizzes used
                      today
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Topic</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, Quadratic Equations, The French Revolution"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                />
              </div>
              <div className="flex flex-wrap gap-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Difficulty
                  </label>
                  <div className="flex gap-2">
                    {(formOptions?.difficulties ?? ["easy", "medium"]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          difficulty === d
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Questions
                  </label>
                  <div className="flex gap-2">
                    {Array.from(
                      new Set([5, 8, 10, 15].filter((n) => n <= (formOptions?.maxQuestions ?? 5))),
                    ).map((n) => (
                      <button
                        key={n}
                        onClick={() => setQuestionCount(n)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          questionCount === n
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {generating ? (
                  "Generating your quiz..."
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Generate Quiz
                  </>
                )}
              </button>
            </div>
          )}

          {quizzes.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20 mt-8">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <PenTool className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No quizzes yet</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Generate your first AI quiz to test your understanding of any topic.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-medium hover:bg-primary/20 transition-colors"
              >
                Generate a Quiz
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz) => {
                const attempts = quiz.quiz_attempts || [];
                const bestScore =
                  attempts.length > 0 ? Math.max(...attempts.map((a: any) => a.score || 0)) : null;
                const qCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;

                return (
                  <div
                    key={quiz.id}
                    className="w-full flex items-center gap-3 p-5 border border-border bg-card rounded-2xl shadow-sm hover:border-primary/40 transition-colors"
                  >
                    <button
                      onClick={() =>
                        navigate({ to: "/tutor/quizzes/$quizId", params: { quizId: quiz.id } })
                      }
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {quiz.topic || "Untitled Quiz"}
                        </h3>
                        <span className="px-2 py-0.5 bg-muted rounded text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {quiz.difficulty || "Standard"}
                        </span>
                        <span className="text-xs text-muted-foreground">{qCount} questions</span>
                        {bestScore !== null && (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Best: {bestScore}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(quiz.created_at).toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(quiz.id)}
                      disabled={deletingId === quiz.id}
                      title="Delete quiz"
                      className="shrink-0 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete this quiz?"
          description="This will permanently remove the quiz and any attempt history. This can't be undone."
          confirmLabel="Delete"
          onConfirm={onConfirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
