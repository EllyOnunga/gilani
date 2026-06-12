import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  CalendarDays,
  CheckSquare,
  Square,
  Loader2,
  Sparkles,
  RefreshCw,
  BookOpen,
  GraduationCap,
  Globe,
  Clock,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getErrorMessage, withTimeout } from "@/lib/async";
import { lazy, Suspense } from "react";
const LazyMarkdownRenderer = lazy(() =>
  import("@/components/tutor/MarkdownRenderer").then((m) => ({ default: m.MarkdownRenderer }))
);
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { checkPlanRateLimit, getRateLimitStatus } from "@/lib/rate-limit.server";
import { buildPlannerPrompt } from "@/lib/planner-prompt";
import { sanitizeUntrustedInput } from "@/lib/tutor-prompt";

// ─── Types ─────────────────────────────────────────────────────────────────────

type CurriculumType = "KCSE" | "CBC" | "IGCSE" | "MIXED";

interface PlanTask {
  id: string;
  date: string;
  subject: string;
  topic: string;
  curriculum: CurriculumType | "BOTH";
  task: string;
  duration: string;
  priority: "high" | "medium" | "low";
  type: "theory" | "practice" | "revision" | "past_paper" | "project";
  study_tip?: string;
  tags?: string[];
}

interface PlanMetadata {
  start_date: string;
  end_date: string;
  total_tasks: number;
  curriculum: string;
  curriculum_details: {
    type: CurriculumType;
    specific_requirements: string;
  };
  focus_areas: string[];
  weekly_goal: string;
  estimated_weekly_hours: string;
}

interface DailyPlan {
  date: string;
  day_of_week: string;
  daily_focus: string;
  curriculum_focus: CurriculumType;
  tasks: PlanTask[];
  daily_quote?: string;
}

interface WeeklyPlanResponse {
  plan_metadata: PlanMetadata;
  daily_plans: DailyPlan[];
  flexible_tasks?: PlanTask[];
}

interface StudyPlan {
  id: string;
  exam_name: string;
  items: PlanTask[];
  plan_metadata?: PlanMetadata;
  daily_plans?: DailyPlan[];
  created_at: string;
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function formatTime(s: number) {
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

function useRateLimitCountdown(errorMsg: string | null) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!errorMsg) { setSecondsLeft(0); return; }

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
          if (s <= 1) { clearInterval(timerRef.current!); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [errorMsg]);

  return { secondsLeft, isDaily };
}

function convertToStudyPlan(data: any): StudyPlan | null {
  if (!data) return null;

  let items: PlanTask[] = [];
  let planMetadata: PlanMetadata | undefined;
  let dailyPlans: DailyPlan[] | undefined;

  try {
    if (data.items) {
      const parsedItems = typeof data.items === "string" ? JSON.parse(data.items) : data.items;

      // Check if it's the wrapped format
      if (parsedItems && typeof parsedItems === "object" && !Array.isArray(parsedItems)) {
        if (parsedItems.items && Array.isArray(parsedItems.items)) {
          items = parsedItems.items;
          planMetadata = parsedItems.plan_metadata;
          dailyPlans = parsedItems.daily_plans;
        }
      } else if (Array.isArray(parsedItems)) {
        // Direct array of tasks
        items = parsedItems;
      }
    }
  } catch (e) {
    console.error("Error parsing study plan items:", e);
  }

  return {
    id: data.id || "",
    exam_name: data.exam_name || "",
    items: items,
    plan_metadata: planMetadata,
    daily_plans: dailyPlans,
    created_at: data.created_at || new Date().toISOString(),
  };
}

// ─── JSON Repair Helper ───────────────────────────────────────────────────────

/**
 * Attempts to repair common LLM JSON defects before parsing:
 * 1. Strips markdown code fences (```json ... ```)
 * 2. Removes trailing commas before ] or }
 * 3. Escapes lone backslashes in string values (e.g. LaTeX \sqrt → \\sqrt)
 */
function repairAndParseJson(raw: string): any {
  // 1. Strip markdown fences
  let s = raw.trim();
  s = s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // 2. Extract outermost { ... }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }

  // 3. Pre-repair: Fix "daily_quote": "Quote text." — First Last (author outside quotes)
  s = s
    .split("\n")
    .map((line) => {
      const quoteMatch = line.match(
        /^(\s*"daily_quote"\s*:\s*")(.*)"\s*[—–-]\s*([^",]+)(\s*,?\s*)$/,
      );
      if (quoteMatch) {
        const prefix = quoteMatch[1];
        const quoteText = quoteMatch[2];
        const author = quoteMatch[3].trim();
        const suffix = quoteMatch[4];
        return `${prefix}${quoteText} — ${author}"${suffix}`;
      }
      return line;
    })
    .join("\n");

  // 4. Escape unescaped double quotes inside all JSON string values (line-by-line)
  s = s
    .split("\n")
    .map((line) => {
      const match = line.match(/^(\s*"[a-zA-Z_0-9]+"\s*:\s*")(.*)("\s*,?\s*)$/);
      if (match) {
        const prefix = match[1];
        const val = match[2];
        const suffix = match[3];
        // Escape any unescaped double quotes inside the value
        const escapedVal = val.replace(/(?<!\\)"/g, '\\"');
        return prefix + escapedVal + suffix;
      }
      return line;
    })
    .join("\n");

  // 5. Remove trailing commas before ] or } (handles ,\n} and ,})
  s = s.replace(/,\s*([}\]])/g, "$1");

  // 6. Fix lone backslashes inside JSON string values:
  //    Scans each JSON string token and escapes backslashes that are not
  //    part of a valid escape sequence (\\, \", \n, \uXXXX).
  //    This repairs LaTeX sequences like \sqrt, \frac etc.
  s = s.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
    return match.replace(/\\(\\|"|n|r|t|b|f|u[0-9a-fA-F]{4})|\\/g, (m, g1) => {
      if (g1) return m; // already-valid escape — leave alone
      return "\\\\"; // lone backslash → double-escape
    });
  });

  // 7. Try direct parse first, fall back to control-char strip as last resort
  try {
    return JSON.parse(s);
  } catch (err: any) {
    const cleaned = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    try {
      return JSON.parse(cleaned);
    } catch (finalErr: any) {
      console.error("[JSON Repair] Failed to parse repaired JSON string!");
      console.error("[JSON Repair] Error:", finalErr.message);

      const posMatch = finalErr.message.match(/at position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const start = Math.max(0, pos - 120);
        const end = Math.min(cleaned.length, pos + 120);
        console.error(
          `[JSON Repair] Context around position ${pos}:\n...${cleaned.slice(start, end)}...`,
        );
      }

      try {
        const fs = require("fs");
        fs.writeFileSync("debug-bad-json.json", cleaned, "utf8");
      } catch (_) {
        /* silent */
      }

      throw finalErr;
    }
  }
}

// ─── Server Functions ──────────────────────────────────────────────────────────

const loadPlan = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  let authResult;
  try {
    authResult = await authenticateRequest(request);
  } catch (err) {
    throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
  }
  const userId = authResult.userId;
  const { data } = await supabaseAdmin
    .from("study_plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return convertToStudyPlan(data);
});

const generatePlan = createServerFn({ method: "POST" }).handler(async () => {
  const request = getRequest();
  let authResult;
  try {
    authResult = await authenticateRequest(request);
  } catch (err) {
    throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
  }
  const userId = authResult.userId;

  const rlPlan = await checkPlanRateLimit(userId, "planner");
  if (!rlPlan.allowed) {
    const s = Math.ceil(rlPlan.retryAfterMs / 1000);
    throw new Error(
      rlPlan.isDaily
        ? `Daily planner limit reached for your ${rlPlan.plan} plan. Resets in ${s}s.`
        : `Rate limit exceeded. Please try again in ${s}s.`
    );
  }
  // Fetch user's curriculum from profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("curriculum")
    .eq("id", userId)
    .maybeSingle();

  const curriculum = profile?.curriculum || "KCSE";

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
        const sanitized = (a.weak_topics as string[]).map((t) => sanitizeUntrustedInput(t || ""));
        weakTopics.push(...sanitized);
      }
    }
  }

  const { generateText } = await import("ai");
  const models = createLovableAiGatewayProvider().getAllChatModels();
  if (models.length === 0) throw new Error("No AI providers are configured.");

  const today = new Date().toISOString().split("T")[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 6);
  const endDateStr = endDate.toISOString().split("T")[0];

  const prompt = buildPlannerPrompt({
    curriculum,
    today,
    endDate: endDateStr,
    weakTopics,
  });
  let weeklyPlan: WeeklyPlanResponse | null = null;
  let items: PlanTask[] = [];
  let lastError: unknown;

  console.log("Generating plan with providers...");
  for (const model of models) {
    try {
      if (models.indexOf(model) > 0) {
        const { backoffDelay } = await import("@/lib/provider-backoff");
        await backoffDelay(models.indexOf(model));
      }
      console.log(`[Planner] Trying model: ${model.provider}/${model.modelId}`);
      const result = await generateText({
        model: model as any,
        prompt: prompt,
        temperature: 0.4,
        maxTokens: 4000,
      } as any);

      const textResult = result.text.trim();
      if (textResult) {
        const parsed = repairAndParseJson(textResult);

        if (parsed.daily_plans && Array.isArray(parsed.daily_plans)) {
          weeklyPlan = parsed as WeeklyPlanResponse;

          // Flatten tasks from daily_plans while strictly ensuring unique identifier integrity
          items = weeklyPlan.daily_plans.flatMap((day) =>
            day.tasks.map((task, idx) => ({
              ...task,
              date: task.date || day.date,
              id:
                task.id && task.id !== "task-1" && task.id !== "task-2"
                  ? task.id
                  : `${day.date}-task-${idx}-${crypto.randomUUID().slice(0, 8)}`,
            })),
          );
        } else if (Array.isArray(parsed)) {
          items = parsed;
          weeklyPlan = {
            plan_metadata: {
              start_date: today,
              end_date: endDateStr,
              total_tasks: items.length,
              curriculum: curriculum,
              curriculum_details: {
                type: curriculum as CurriculumType,
                specific_requirements: "Balanced study plan",
              },
              focus_areas: weakTopics.slice(0, 5),
              weekly_goal: "Improve understanding in weak areas",
              estimated_weekly_hours: `${Math.round(items.length * 0.75)} hours`,
            },
            daily_plans: [],
          };
        } else {
          throw new Error("Response schema does not align with valid structural patterns.");
        }

        console.log(`[Planner] Success with model: ${model.provider}/${model.modelId}`);
        break;
      }
    } catch (err) {
      console.warn(`[Planner] Model ${model.provider}/${model.modelId} failed:`, err);
      lastError = err;
    }
  }

  if (!weeklyPlan || items.length === 0) {
    throw lastError || new Error("Failed to generate plan with all configured providers.");
  }

  const wrappedData = {
    items: items,
    plan_metadata: weeklyPlan.plan_metadata,
    daily_plans: weeklyPlan.daily_plans,
  };

  const { data: plan, error } = await supabaseAdmin
    .from("study_plans")
    .insert({
      user_id: userId,
      exam_name: weeklyPlan.plan_metadata.weekly_goal || "Weekly Personal Study Plan",
      items: wrappedData as any,
    })
    .select()
    .single();

  if (error) {
    console.error("Database error:", error);
    throw new Error(error.message);
  }

  return convertToStudyPlan(plan);
});

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [{ title: "Study Planner — GilaniAI" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: PlannerPage,
});

const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25 backdrop-blur-sm font-semibold",
  medium:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 backdrop-blur-sm font-semibold",
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 backdrop-blur-sm font-semibold",
};



function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PlannerPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const isRateLimited = !!(
    error?.toLowerCase().includes("limit") ||
    error?.toLowerCase().includes("rate")
  );
  const { secondsLeft, isDaily } = useRateLimitCountdown(isRateLimited ? error : null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());

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
              ? `Daily planner limit reached. Resets at midnight.`
              : `Rate limit exceeded. Please try again in ${secs}s.`
          );
        }
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const init = async () => {
      if (initialised) return;
      setLoading(true);
      setError(null);
      try {
        const res = await supabase.auth.getSession();
        const session = res?.data?.session;
        if (!session) return;
        const existing = await withTimeout(loadPlan(), 20000, "Loading study plan timed out.");
        if (existing) {
          setPlan(existing);
          setDebugInfo(`Loaded plan with ${existing.items?.length || 0} tasks`);
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Could not load your plan"));
      } finally {
        setLoading(false);
        setInitialised(true);
      }
    };
    init();
  }, [initialised]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo("Generating...");
    try {
      const res = await supabase.auth.getSession();
      const session = res?.data?.session;
      if (!session) {
        toast.error("Not signed in");
        return;
      }
      const newPlan = await withTimeout(generatePlan(), 120000, "Generating study plan timed out.");
      setPlan(newPlan);
      setCompleted(new Set());
      setDebugInfo(`Generated plan with ${newPlan?.items?.length || 0} tasks`);
      toast.success("Study plan generated!");
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Failed to generate plan");
      setError(message);
      setDebugInfo(`Error: ${message}`);
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

  // Group tasks cleanly by validated calendar dates
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

  // If the selected date has no tasks (e.g. plan was regenerated), fall back to first date with tasks
  const activeDate =
    grouped[selectedDate] && grouped[selectedDate].length > 0
      ? selectedDate
      : (sortedDates[0] ?? selectedDate);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6 lg:p-10">
      {/* Header */}
      <header className="animate-in-slide flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
              Study Planner
            </p>
          </div>
          <h2 className="mt-1 font-serif text-2xl sm:text-4xl">Your Study Planner</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            {plan?.plan_metadata?.weekly_goal ||
              "AI-generated daily study tasks based on your quiz performance and weak topics."}
          </p>
        </div>
        <button
          onClick={handleGenerate}
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
          {plan ? "Regenerate Plan" : "Generate My Plan"}
        </button>
      </header>

      {/* Progress bar */}
      {plan && totalTasks > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {doneTasks === totalTasks && totalTasks > 0 ? "🎉 All done!" : "Weekly Progress"}
            </p>
            <p className="font-mono text-[11px] font-bold text-foreground">
              {doneTasks} / {totalTasks}
              <span className="text-muted-foreground font-normal ml-1">({totalTasks ? Math.round((doneTasks/totalTasks)*100) : 0}%)</span>
            </p>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${doneTasks === totalTasks && totalTasks > 0 ? "bg-green-500" : "bg-primary"}`}
              style={{ width: totalTasks ? `${(doneTasks / totalTasks) * 100}%` : "0%" }}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!plan && !loading && (
        <div className="rounded-xl border border-dashed border-border p-8 sm:p-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-serif text-xl text-muted-foreground">No plan yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click "Generate My Plan" and GilaniAI will build a personalised 7-day schedule tailored
            to your curriculum.
          </p>
        </div>
      )}

      {error && (
        <div className={`rounded-xl border overflow-hidden animate-in-slide ${
          isRateLimited
            ? "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/30"
            : "border-destructive/30 bg-destructive/10"
        }`}>
          <div className="flex items-start gap-2.5 px-4 py-3">
            <div className="flex-shrink-0 mt-0.5">
              {isRateLimited
                ? (secondsLeft > 0
                    ? <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    : <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />)
                : <AlertCircle className="h-4 w-4 text-destructive" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${
                isRateLimited ? "text-amber-800 dark:text-amber-300" : "text-destructive"
              }`}>
                {isRateLimited
                  ? (isDaily ? "Daily planner limit reached" : "Slow down a little…")
                  : "Plan generation failed"}
              </p>
              <p className={`text-[11px] mt-0.5 ${
                isRateLimited ? "text-amber-700/80 dark:text-amber-400/80" : "text-destructive/80"
              }`}>
                {isRateLimited
                  ? (isDaily
                      ? "You've used your daily plan generation allowance. It resets at midnight."
                      : "You're generating plans too fast. Take a short break.")
                  : error}
                {isRateLimited && secondsLeft > 0 && (
                  <span className="ml-1 font-mono font-bold text-amber-900 dark:text-amber-300 tabular-nums">
                    (retry in {formatTime(secondsLeft)})
                  </span>
                )}
              </p>
            </div>
            {/* Countdown ring for short rate limits */}
            {isRateLimited && secondsLeft > 0 && !isDaily && (
              <div className="flex-shrink-0 flex items-center justify-center">
                <div className="relative h-10 w-10">
                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                      className="text-amber-200 dark:text-amber-900" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                      className="text-amber-500 dark:text-amber-400"
                      strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 14}`}
                      strokeDashoffset={`${2 * Math.PI * 14 * (1 - secondsLeft / 60)}`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    {secondsLeft}
                  </span>
                </div>
              </div>
            )}
            {/* Upgrade CTA */}
            {isRateLimited && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("custom:open-plans"))}
                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
              >
                <CreditCard className="h-3 w-3" /> Upgrade
              </button>
            )}
          </div>
          {/* Draining progress bar for short rate limits */}
          {isRateLimited && secondsLeft > 0 && !isDaily && (
            <div className="h-0.5 bg-amber-200/50 dark:bg-amber-800/50">
              <div
                className="h-full bg-amber-400 dark:bg-amber-500 transition-all duration-1000 ease-linear"
                style={{ width: `${Math.min(100, (secondsLeft / 60) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {loading && !plan && (
        <div className="flex flex-col items-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-serif text-lg text-muted-foreground">
            Building your personalised plan…
          </p>
        </div>
      )}

      {/* Day tab strip */}
      {plan && sortedDates.length > 0 && (
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2 min-w-max">
            {sortedDates.map((date) => {
              const d = new Date(date + "T00:00:00");
              const isToday = date === todayStr();
              const isSelected = date === activeDate;
              const dayTasks = grouped[date] ?? [];
              const dayDone = dayTasks.filter((t) => completed.has(t.id)).length;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center rounded-xl px-3 py-2.5 min-w-[60px] border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className="font-mono text-[9px] uppercase tracking-wider">
                    {d.toLocaleDateString("en-KE", { weekday: "short" })}
                  </span>
                  <span className="font-serif text-lg font-bold leading-none mt-0.5">
                    {d.getDate()}
                  </span>
                  {isToday && <span className="mt-1 h-1 w-1 rounded-full bg-primary" />}
                  {dayTasks.length > 0 && (
                    <span className="font-mono text-[8px] mt-1 opacity-60">
                      {dayDone}/{dayTasks.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily task view */}
      {plan &&
        totalTasks > 0 &&
        (() => {
          const tasks = grouped[activeDate] ?? [];
          if (tasks.length === 0) return null;

          const d = new Date(activeDate + "T00:00:00");
          const dayLabel = d.toLocaleDateString("en-KE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });

          const dayPlan = plan?.daily_plans?.find((dp) => dp.date === activeDate);
          const dayFocus = dayPlan?.daily_focus;
          const curriculumFocus = dayPlan?.curriculum_focus;
          const dailyQuote = dayPlan?.daily_quote;

          return (
            <div className="animate-in-slide space-y-4">
              {/* Day header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {dayLabel}
                  </p>
                  {dayFocus && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">🎯 {dayFocus}</p>
                  )}
                </div>
              </div>

              {/* Task cards */}
              <div className="space-y-3">
                {tasks.map((task) => {
                  const done = completed.has(task.id);
                  return (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`w-full flex items-start gap-3 rounded-xl border p-4 sm:p-5 text-left transition-all active:scale-[0.99] ${
                        done
                          ? "border-border/40 bg-muted/40 opacity-60"
                          : "border-border bg-card shadow-sm hover:shadow-md"
                      }`}
                    >
                      {done ? (
                        <CheckSquare className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" />
                      ) : (
                        <Square className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p
                            className={`text-sm font-bold leading-tight ${done ? "line-through text-muted-foreground" : ""}`}
                          >
                            {task.subject}
                          </p>
                          {task.topic && (
                            <span className="text-xs text-muted-foreground">— {task.topic}</span>
                          )}
                          <span
                            className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium}`}
                          >
                            {task.priority}
                          </span>
                          {task.type && (
                            <span className="font-mono text-[9px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
                              {task.type}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm ${done ? "line-through text-muted-foreground" : "text-foreground/80"}`}
                        >
                          {task.task}
                        </p>
                        {task.study_tip && (
                          <p className="text-xs text-primary/80 mt-2 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2 leading-relaxed">
                            💡 <Suspense fallback={<span>{task.study_tip}</span>}><LazyMarkdownRenderer content={task.study_tip} /></Suspense>
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap bg-muted/60 rounded-full px-2 py-0.5">
                        {task.duration}
                      </span>
                    </button>
                  );
                })}
              </div>

              {dailyQuote && (
                <p className="mt-2 text-[11px] text-muted-foreground italic text-center border-t border-border/40 pt-3 px-4">
                  <Suspense fallback={<span>&ldquo;{dailyQuote}&rdquo;</span>}><LazyMarkdownRenderer content={dailyQuote} /></Suspense>
                </p>
              )}
            </div>
          );
        })()}

      {/* Fallback state inside valid data scopes */}
      {plan && totalTasks === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Plan loaded but no tasks found. Try regenerating the plan.
          </p>
        </div>
      )}
    </div>
  );
}
