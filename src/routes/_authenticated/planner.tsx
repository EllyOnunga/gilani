import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { getRateLimitStatus } from "@/lib/rate-limit.server";
import { getErrorMessage, withTimeout } from "@/lib/async";
import { loadPlan, generatePlan, StudyPlan, PlanTask } from "@/lib/planner.server-fns";
import {
  CalendarDays,
  CheckSquare,
  Square,
  Loader2,
  Sparkles,
  RefreshCw,
  Clock,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import MarkdownRenderer from "@/components/tutor/MarkdownRenderer";

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [{ title: "Study Planner — GilaniAI" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: PlannerPage,
});

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25 backdrop-blur-sm font-semibold",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 backdrop-blur-sm font-semibold",
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 backdrop-blur-sm font-semibold",
};

// ─── Helper Functions ──────────────────────────────────────────────────────────

function formatTime(s: number) {
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function useRateLimitCountdown(errorMsg: string | null) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!errorMsg) {
      setSecondsLeft(0);
      return;
    }

    let secs = 0;
    let daily = errorMsg.toLowerCase().includes("daily") || errorMsg.toLowerCase().includes("midnight");

    try {
      const parsed = JSON.parse(errorMsg);
      if (parsed.retryAfterMs) secs = Math.ceil(parsed.retryAfterMs / 1000);
      if (parsed.isDaily !== undefined) daily = !!parsed.isDaily;
    } catch {
      const match = errorMsg.match(/(?:Try again|Resets|try again) in (\d+)s/);
      if (match) secs = parseInt(match[1], 10);
    }

    setIsDaily(daily);
    if (secs > 0) {
      setSecondsLeft(secs);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [errorMsg]);

  return { secondsLeft, isDaily };
}

// ─── Sub-Components ────────────────────────────────────────────────────────────

function PlannerHeader({
  plan,
  loading,
  isRateLimited,
  onGenerate,
}: {
  plan: StudyPlan | null;
  loading: boolean;
  isRateLimited: boolean;
  onGenerate: () => void;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="text-center sm:text-left">
        <p className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary mb-1">
          Study Planner
        </p>
        <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl">Your Study Planner</h2>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-2xl">
          {plan?.plan_metadata?.weekly_goal ||
            "AI-generated daily study tasks based on your quiz performance and weak topics."}
        </p>
      </div>
      <button
        onClick={onGenerate}
        disabled={loading || isRateLimited}
        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 active:scale-[0.98] transition-all"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : plan ? (
          <RefreshCw className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        <span className="whitespace-nowrap">{plan ? "Regenerate Plan" : "Generate My Plan"}</span>
      </button>
    </header>
  );
}

function PlannerProgress({ doneTasks, totalTasks }: { doneTasks: number; totalTasks: number }) {
  if (totalTasks === 0) return null;

  const percentage = Math.round((doneTasks / totalTasks) * 100);
  const isComplete = doneTasks === totalTasks;

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 lg:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-muted-foreground">
          {isComplete ? "🎉 All done!" : "Weekly Progress"}
        </p>
        <p className="font-mono text-[10px] sm:text-[11px] font-bold text-foreground">
          {doneTasks} / {totalTasks}
          <span className="text-muted-foreground font-normal ml-1">({percentage}%)</span>
        </p>
      </div>
      <div className="h-2 sm:h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isComplete ? "bg-green-500" : "bg-primary"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function PlannerDayTabs({
  sortedDates,
  grouped,
  completed,
  selectedDate,
  onSelectDate,
}: {
  sortedDates: string[];
  grouped: Record<string, PlanTask[]>;
  completed: Set<string>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  if (sortedDates.length === 0) return null;

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1 min-w-[280px]">
        {sortedDates.map((date) => {
          const d = new Date(date + "T00:00:00");
          const isToday = date === todayStr();
          const isSelected = date === selectedDate;
          const dayTasks = grouped[date] ?? [];
          const dayDone = dayTasks.filter((t) => completed.has(t.id)).length;
          const hasProgress = dayDone > 0;

          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className={`flex flex-col items-center rounded-lg px-1 py-1.5 sm:py-2 border transition-all ${isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
                }`}
            >
              <span className="font-mono text-[7px] sm:text-[8px] uppercase">
                {d.toLocaleDateString("en-KE", { weekday: "short" })}
              </span>
              <span className="font-bold text-xs sm:text-sm leading-none mt-0.5">
                {d.getDate()}
              </span>
              {isToday && <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />}
              {hasProgress && !isSelected && (
                <span className="mt-0.5 text-[8px] font-mono text-primary/70">
                  {dayDone}/{dayTasks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlannerTaskCard({
  task,
  done,
  onToggle,
}: {
  task: PlanTask;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-start gap-2 sm:gap-3 rounded-xl border p-3 sm:p-4 lg:p-5 text-left transition-all active:scale-[0.99] ${done
        ? "border-border/40 bg-muted/40 opacity-60"
        : "border-border bg-card shadow-sm hover:shadow-md"
        }`}
    >
      {done ? (
        <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary mt-0.5" />
      ) : (
        <Square className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-muted-foreground mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
          <div className={`text-xs sm:text-sm font-bold leading-tight ${done ? "line-through text-muted-foreground" : ""}`}>
            <MarkdownRenderer content={task.subject} />
          </div>
          {task.topic && (
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              — <MarkdownRenderer content={task.topic} />
            </span>
          )}
          <span
            className={`rounded-full border px-1.5 sm:px-2 py-0.5 font-mono text-[8px] sm:text-[9px] uppercase tracking-wider ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium
              }`}
          >
            <MarkdownRenderer content={task.priority} />
          </span>
          {task.type && (
            <span className="font-mono text-[8px] sm:text-[9px] text-muted-foreground border border-border rounded-full px-1.5 sm:px-2 py-0.5">
              <MarkdownRenderer content={task.type} />
            </span>
          )}
        </div>
        <div className={`text-xs sm:text-sm ${done ? "line-through text-muted-foreground" : "text-foreground/80"}`}>
          <MarkdownRenderer content={task.task} />
        </div>
        {task.study_tip && (
          <div className="text-[10px] sm:text-xs text-primary/80 mt-2 bg-primary/5 border border-primary/15 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 leading-relaxed flex items-start gap-1">
            <span className="flex-shrink-0">💡</span>
            <MarkdownRenderer content={task.study_tip} />
          </div>
        )}
      </div>
      <span className="font-mono text-[9px] sm:text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap bg-muted/60 rounded-full px-1.5 sm:px-2 py-0.5">
        {task.duration}
      </span>
    </button>
  );
}

function PlannerDailyView({
  plan,
  activeDate,
  completed,
  onToggleTask,
}: {
  plan: StudyPlan;
  activeDate: string;
  completed: Set<string>;
  onToggleTask: (taskId: string) => void;
}) {
  const tasks = (plan.items ?? []).filter((t) => t.date === activeDate);
  if (tasks.length === 0) return null;

  const d = new Date(activeDate + "T00:00:00");
  const dayLabel = d.toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dayPlan = plan.daily_plans?.find((dp) => dp.date === activeDate);
  const dayFocus = dayPlan?.daily_focus;
  const dailyQuote = dayPlan?.daily_quote;

  return (
    <div className="space-y-3">
      <div>
        <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-muted-foreground">
          {dayLabel}
        </p>
        {dayFocus && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 italic">🎯 {dayFocus}</p>
        )}
      </div>

      <div className="space-y-2 sm:space-y-3">
        {tasks.map((task) => (
          <PlannerTaskCard
            key={task.id}
            task={task}
            done={completed.has(task.id)}
            onToggle={() => onToggleTask(task.id)}
          />
        ))}
      </div>

      {dailyQuote && (
        <div className="mt-3 text-[10px] sm:text-[11px] text-muted-foreground italic text-center border-t border-border/40 pt-3 px-2 sm:px-4">
          <MarkdownRenderer content={dailyQuote} />
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────

function PlannerPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());

  const isRateLimited = !!(
    error?.toLowerCase().includes("limit") ||
    error?.toLowerCase().includes("rate")
  );
  const { secondsLeft, isDaily } = useRateLimitCountdown(isRateLimited ? error : null);

  // Restore rate limit warning after page refresh
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await getRateLimitStatus({ data: "planner" });
        if (mounted && status.isRateLimited && !error) {
          const secs = Math.ceil(status.retryAfterMs / 1000);
          setError(
            status.isDaily
              ? `Daily planner limit reached. Resets in ${secs}s.`
              : `Rate limit exceeded. Please try again in ${secs}s.`
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    if (!user) return;

    initRef.current = true;

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const existing = await withTimeout(loadPlan(), 20000, "Loading study plan timed out.");
        if (existing) {
          setPlan(existing);
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Could not load your plan"));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Not signed in");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const newPlan = await withTimeout(generatePlan(), 120000, "Generating study plan timed out.");
      setPlan(newPlan);
      setCompleted(new Set());
      setSelectedDate(todayStr());
      toast.success("Study plan generated!");
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Failed to generate plan");
      setError(message);
      if (message.toLowerCase().includes("limit")) {
        toast.error(message, {
          action: {
            label: "Upgrade",
            onClick: () => window.dispatchEvent(new CustomEvent("custom:open-plans")),
          },
        });
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Group tasks by date
  const grouped: Record<string, PlanTask[]> = {};
  if (plan?.items && plan.items.length > 0) {
    for (const task of plan.items) {
      if (!task.date) continue;
      if (!grouped[task.date]) grouped[task.date] = [];
      grouped[task.date].push(task);
    }
  }

  const sortedDates = Object.keys(grouped).sort();
  const totalTasks = plan?.items?.length ?? 0;
  const doneTasks = completed.size;

  const activeDate =
    grouped[selectedDate] && grouped[selectedDate].length > 0
      ? selectedDate
      : sortedDates[0] ?? selectedDate;

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5 p-3 sm:p-4 lg:p-6 xl:p-10">
      {/* Header */}
      <PlannerHeader
        plan={plan}
        loading={loading}
        isRateLimited={isRateLimited}
        onGenerate={handleGenerate}
      />

      {/* Progress */}
      <PlannerProgress doneTasks={doneTasks} totalTasks={totalTasks} />

      {/* Empty state */}
      {!plan && !loading && (
        <div className="rounded-xl border border-dashed border-border p-4 sm:p-6 lg:p-10 text-center">
          <CalendarDays className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40 mb-3" />
          <p className="font-serif text-lg sm:text-xl text-muted-foreground">No plan yet</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Click "Generate My Plan" and GilaniAI will build a personalised 7-day schedule.
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div
          className={`rounded-xl border overflow-hidden ${isRateLimited
            ? "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/30"
            : "border-destructive/30 bg-destructive/10"
            }`}
        >
          <div className="flex items-start gap-2 sm:gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex-shrink-0 mt-0.5">
              {isRateLimited ? (
                secondsLeft > 0 ? (
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                )
              ) : (
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-[10px] sm:text-xs font-semibold ${isRateLimited ? "text-amber-800 dark:text-amber-300" : "text-destructive"
                  }`}
              >
                {isRateLimited
                  ? isDaily
                    ? "Daily planner limit reached"
                    : "Slow down a little…"
                  : "Plan generation failed"}
              </p>
              <p
                className={`text-[9px] sm:text-[11px] mt-0.5 ${isRateLimited ? "text-amber-700/80 dark:text-amber-400/80" : "text-destructive/80"
                  }`}
              >
                {isRateLimited
                  ? isDaily
                    ? `You've used your daily plan generation allowance.${secondsLeft > 0 ? ` Resets in ${formatTime(secondsLeft)}.` : " Resets at midnight (EAT)."
                    }`
                    : `You're generating plans too fast. Take a short break.${secondsLeft > 0 ? ` Try again in ${formatTime(secondsLeft)}.` : ""
                    }`
                  : error}
              </p>
            </div>
            {isRateLimited && secondsLeft > 0 && (
              <div className="flex-shrink-0 flex items-center">
                <div className="inline-flex items-center gap-1 rounded-md sm:rounded-lg bg-amber-500/20 px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold text-amber-900 dark:text-amber-300 tabular-nums border border-amber-500/30">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {formatTime(secondsLeft)}
                </div>
              </div>
            )}
            {isRateLimited && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("custom:open-plans"))}
                className="flex-shrink-0 inline-flex items-center gap-1 rounded-md sm:rounded-lg bg-primary px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
              >
                <CreditCard className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">Upgrade</span>
              </button>
            )}
          </div>
          {isRateLimited && secondsLeft > 0 && (
            <div className="h-0.5 bg-amber-200/50 dark:bg-amber-800/50">
              <div
                className="h-full bg-amber-400 dark:bg-amber-500 transition-all duration-1000 ease-linear"
                style={{ width: `${Math.min(100, (secondsLeft / (isDaily ? 86400 : 60)) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && !plan && (
        <div className="flex flex-col items-center py-8 sm:py-12 lg:py-16 gap-3">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
          <p className="font-serif text-base sm:text-lg text-muted-foreground">
            Building your personalised plan…
          </p>
        </div>
      )}

      {/* Day tabs */}
      {plan && sortedDates.length > 0 && (
        <PlannerDayTabs
          sortedDates={sortedDates}
          grouped={grouped}
          completed={completed}
          selectedDate={activeDate}
          onSelectDate={setSelectedDate}
        />
      )}

      {/* Daily view */}
      {plan && totalTasks > 0 && (
        <PlannerDailyView
          plan={plan}
          activeDate={activeDate}
          completed={completed}
          onToggleTask={toggleTask}
        />
      )}

      {/* Fallback */}
      {plan && totalTasks === 0 && (
        <div className="rounded-xl border border-dashed border-border p-4 sm:p-6 lg:p-8 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Plan loaded but no tasks found. Try regenerating the plan.
          </p>
        </div>
      )}
    </div>
  );
}