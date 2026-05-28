import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { CalendarDays, CheckSquare, Square, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getErrorMessage, withTimeout } from "@/lib/async";

// ─── Types ─────────────────────────────────────────────────────────────────────

type PlanTask = {
  date: string; // ISO date e.g. "2025-06-02"
  subject: string;
  task: string;
  duration: string; // e.g. "45 min"
  priority: "high" | "medium" | "low";
};

type StudyPlan = {
  id: string;
  exam_name: string;
  items: PlanTask[];
  created_at: string;
};

// ─── Server Functions ──────────────────────────────────────────────────────────

const loadPlan = createServerFn({ method: "GET" })
  .inputValidator(z.string())
  .handler(async ({ data: userId }) => {
    const { data } = await supabaseAdmin
      .from("study_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });

const generatePlan = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { userId } = data;

    // Get the last 3 quiz attempts to find weak topics
    const { data: attempts } = await supabaseAdmin
      .from("quiz_attempts")
      .select("score, weak_topics")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    const weakTopics: string[] = [];
    if (attempts) {
      for (const a of attempts) {
        if (Array.isArray(a.weak_topics)) {
          weakTopics.push(...(a.weak_topics as string[]));
        }
      }
    }

    const LOVABLE_API_KEY = process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY || "";
    const model = createLovableAiGatewayProvider(LOVABLE_API_KEY).chatModel(
      "gemini-2.5-flash",
    );
    const { generateText } = await import("ai");

    const today = new Date().toISOString().split("T")[0];
    const { text } = await generateText({
      model,
      prompt: `You are a Kenyan KCSE/CBC study counsellor generating a 7-day personalised study plan.
Today is ${today}. The student's recent weak topics are: ${weakTopics.length ? weakTopics.slice(0, 10).join("; ") : "No recent quiz data — create a balanced general plan"}.

Return ONLY valid JSON (no markdown fences) in this exact shape:
[{"date":"YYYY-MM-DD","subject":"...","task":"...","duration":"45 min","priority":"high|medium|low"}]

Generate exactly 14 tasks spread across the next 7 days (2 tasks per day). Focus on the weak topics but also include revision of strong subjects. Make tasks specific and actionable.`,
    });

    let items: PlanTask[] = [];
    try {
      const clean = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      items = JSON.parse(clean);
      if (!Array.isArray(items)) throw new Error();
    } catch {
      throw new Error("AI returned invalid plan format. Please try again.");
    }

    const { data: plan, error } = await supabaseAdmin
      .from("study_plans")
      .insert({
        user_id: userId,
        exam_name: "Weekly Personal Study Plan",
        items: items as any,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return plan as any;
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Study Planner — GilaniAI" }] }),
  component: PlannerPage,
});

const PRIORITY_COLOR = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

function PlannerPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Lazy-load on first render
  const init = async () => {
    if (initialised) return;
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const existing = await withTimeout(
        loadPlan({ data: session.user.id }),
        20000,
        "Loading study plan timed out.",
      );
      if (existing) setPlan(existing as any);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not load your plan"));
    } finally {
      setLoading(false);
      setInitialised(true);
    }
  };

  // Call init on mount via useState initializer trick
  useState(() => {
    init();
  });

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not signed in");
        return;
      }
      const newPlan = await withTimeout(
        generatePlan({ data: { userId: session.user.id } }),
        60000,
        "Generating study plan timed out.",
      );
      setPlan(newPlan as any);
      setCompleted(new Set());
      toast.success("Study plan generated!");
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Failed to generate plan");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (key: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Group tasks by date
  const grouped: Record<string, PlanTask[]> = {};
  if (plan?.items) {
    for (const task of plan.items as PlanTask[]) {
      if (!grouped[task.date]) grouped[task.date] = [];
      grouped[task.date].push(task);
    }
  }

  const sortedDates = Object.keys(grouped).sort();
  const totalTasks = plan?.items?.length ?? 0;
  const doneTasks = completed.size;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8 lg:p-12">
      {/* Header */}
      <header className="animate-in-slide flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            Study Planner
          </p>
          <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Your Weekly Plan</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-generated study schedule based on your quiz performance and weak topics.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : plan ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {plan ? "Regenerate Plan" : "Generate My Plan"}
        </button>
      </header>

      {/* Progress bar */}
      {plan && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Weekly Progress
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {doneTasks} / {totalTasks} tasks
            </p>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: totalTasks ? `${(doneTasks / totalTasks) * 100}%` : "0%" }}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!plan && !loading && (
        <div className="rounded-xl border border-dashed border-border p-8 sm:p-16 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-serif text-xl text-muted-foreground">No plan yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click "Generate My Plan" and GilaniAI will build a personalised 7-day schedule for you.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !plan && (
        <div className="flex flex-col items-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-serif text-lg text-muted-foreground">Building your plan…</p>
        </div>
      )}

      {/* Calendar grid */}
      {plan && (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const tasks = grouped[date];
            const d = new Date(date + "T00:00:00");
            const dayLabel = d.toLocaleDateString("en-KE", {
              weekday: "long",
              day: "numeric",
              month: "short",
            });
            return (
              <div key={date} className="animate-in-slide">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                  {dayLabel}
                </p>
                <div className="space-y-2">
                  {tasks.map((task, i) => {
                    const key = `${date}-${i}`;
                    const done = completed.has(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleTask(key)}
                        className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                          done
                            ? "border-border/40 bg-muted/40 opacity-60"
                            : "border-border bg-card shadow-sm hover:shadow-md"
                        }`}
                      >
                        {done ? (
                          <CheckSquare className="h-5 w-5 flex-shrink-0 text-primary" />
                        ) : (
                          <Square className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p
                              className={`text-sm font-semibold ${done ? "line-through text-muted-foreground" : ""}`}
                            >
                              {task.subject}
                            </p>
                            <span
                              className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${PRIORITY_COLOR[task.priority]}`}
                            >
                              {task.priority}
                            </span>
                          </div>
                          <p
                            className={`text-xs ${done ? "line-through text-muted-foreground" : "text-muted-foreground"}`}
                          >
                            {task.task}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">
                          {task.duration}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}