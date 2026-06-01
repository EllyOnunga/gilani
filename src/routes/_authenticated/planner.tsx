import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getErrorMessage, withTimeout } from "@/lib/async";

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

    return convertToStudyPlan(data);
  });

const generatePlan = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { userId } = data;

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
          weakTopics.push(...(a.weak_topics as string[]));
        }
      }
    }

    const model = createLovableAiGatewayProvider().chatModel();
    const { generateText } = await import("ai");

    const today = new Date().toISOString().split("T")[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 6);
    const endDateStr = endDate.toISOString().split("T")[0];

    // Highly structural, robust prompt optimized to completely avoid parse failures
    const prompt = `You are an expert academic curriculum strategist. Create a highly structured 7-day study plan for a ${curriculum} student. 
Today's start date is ${today}.

Weak target areas requiring high-priority focus: ${weakTopics.length ? weakTopics.slice(0, 5).join(", ") : "General balanced study blueprint"}.

CRITICAL: Return output strictly as raw executable JSON matching the architecture signature below. Do not wrap inside code block fences. Do not output conversational explanations.

{
  "plan_metadata": {
    "start_date": "${today}",
    "end_date": "${endDateStr}",
    "total_tasks": 14,
    "curriculum": "${curriculum}",
    "curriculum_details": {
      "type": "${curriculum}",
      "specific_requirements": "Targeted optimization of diagnostic performance gaps."
    },
    "focus_areas": ["Introduce target subject matters here"],
    "weekly_goal": "Master foundational knowledge structures and enhance analytical execution.",
    "estimated_weekly_hours": "12 hours"
  },
  "daily_plans": [
    {
      "date": "${today}",
      "day_of_week": "Monday",
      "daily_focus": "Diagnostic subject alignment target",
      "curriculum_focus": "${curriculum}",
      "tasks": [
        {
          "id": "task-unique-hash-1",
          "date": "${today}",
          "subject": "Core Subject",
          "topic": "Target Sub-Topic Area",
          "curriculum": "${curriculum}",
          "task": "Fully descriptive actionable learning task objectives.",
          "duration": "45 min",
          "priority": "high",
          "type": "practice",
          "study_tip": "Strategic focus application strategy.",
          "tags": ["weak_area", "revision"]
        }
      ],
      "daily_quote": "Consistency anchors mastery."
    }
  ]
}

Task Requirements:
- Generate 14 tasks total distributed perfectly across the 7-day window (2 contextually coherent tasks per calendar day).
- All items inside the tasks must feature uniquely identifiable text strings for their "id" parameters.`;

    console.log("Generating plan with prompt...");
    const { text } = await generateText({
      model,
      prompt: prompt,
      temperature: 0.4, // Lowered temperature to heavily enforce structural compliance
    });

    // Advanced cleaning strategy to safely intercept string parsing anomalies
    let weeklyPlan: WeeklyPlanResponse;
    let items: PlanTask[] = [];

    try {
      let cleanJsonString = text.trim();

      // Clear any standard markdown wrapping artifacts
      if (cleanJsonString.includes("```")) {
        const firstMatch = cleanJsonString.indexOf("{");
        const lastMatch = cleanJsonString.lastIndexOf("}");
        if (firstMatch !== -1 && lastMatch !== -1) {
          cleanJsonString = cleanJsonString.substring(firstMatch, lastMatch + 1);
        }
      }

      const parsed = JSON.parse(cleanJsonString);

      if (parsed.daily_plans && Array.isArray(parsed.daily_plans)) {
        weeklyPlan = parsed as WeeklyPlanResponse;

        // Flatten tasks from daily_plans while strictly ensuring unique identifier integrity
        items = weeklyPlan.daily_plans.flatMap((day) =>
          day.tasks.map((task, idx) => ({
            ...task,
            date: task.date || day.date,
            id: task.id && task.id !== "task-1" && task.id !== "task-2" 
              ? task.id 
              : `${day.date}-task-${idx}-${Math.random().toString(36).substring(2, 7)}`,
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
    } catch (parseError) {
      console.error("Failed to parse plan JSON:", parseError);
      throw new Error("Failed to parse study schedule layout engine parameters.");
    }

    if (items.length === 0) {
      throw new Error("No tasks were generated. Please try again.");
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
  head: () => ({ meta: [{ title: "Study Planner — GilaniAI" }] }),
  component: PlannerPage,
});

const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25 backdrop-blur-sm font-semibold",
  medium:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 backdrop-blur-sm font-semibold",
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 backdrop-blur-sm font-semibold",
};

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
  MIXED: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    icon: BookOpen,
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

function PlannerPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      if (initialised) return;
      setLoading(true);
      setError(null);
      try {
        const res = await supabase.auth.getSession();
        const session = res?.data?.session;
        if (!session) return;
        const existing = await withTimeout(
          loadPlan({ data: session.user.id }),
          20000,
          "Loading study plan timed out.",
        );
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
      const newPlan = await withTimeout(
        generatePlan({ data: { userId: session.user.id } }),
        120000,
        "Generating study plan timed out.",
      );
      setPlan(newPlan);
      setCompleted(new Set());
      setDebugInfo(`Generated plan with ${newPlan?.items?.length || 0} tasks`);
      toast.success("Study plan generated!");
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Failed to generate plan");
      setError(message);
      setDebugInfo(`Error: ${message}`);
      toast.error(message);
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8 lg:p-12">
      {/* Header */}
      <header className="animate-in-slide flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
              Study Planner
            </p>
            {plan?.plan_metadata?.curriculum_details?.type && (
              <CurriculumBadge curriculum={plan.plan_metadata.curriculum_details.type} />
            )}
          </div>
          <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Your Weekly Plan</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            {plan?.plan_metadata?.weekly_goal ||
              "AI-generated study schedule based on your quiz performance and weak topics."}
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

      {/* Debug info */}
      {debugInfo && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">{debugInfo}</div>
      )}

      {/* Progress bar */}
      {plan && totalTasks > 0 && (
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
            Click "Generate My Plan" and GilaniAI will build a personalised 7-day schedule tailored
            to your curriculum.
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
          <p className="font-serif text-lg text-muted-foreground">
            Building your personalised plan…
          </p>
        </div>
      )}

      {/* Calendar grid */}
      {plan && totalTasks > 0 && (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const tasks = grouped[date];
            if (!tasks || tasks.length === 0) return null;

            const d = new Date(date + "T00:00:00");
            const dayLabel = d.toLocaleDateString("en-KE", {
              weekday: "long",
              day: "numeric",
              month: "short",
            });

            const dayPlan = plan?.daily_plans?.find((dp) => dp.date === date);
            const dayFocus = dayPlan?.daily_focus;
            const curriculumFocus = dayPlan?.curriculum_focus;
            const dailyQuote = dayPlan?.daily_quote;

            return (
              <div key={date} className="animate-in-slide">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    {dayLabel}
                  </p>
                  {curriculumFocus && <CurriculumBadge curriculum={curriculumFocus} />}
                </div>
                {dayFocus && (
                  <p className="text-xs text-muted-foreground mb-2 italic">Focus: {dayFocus}</p>
                )}
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const uniqueTaskId = task.id;
                    const done = completed.has(uniqueTaskId);
                    return (
                      <button
                        key={uniqueTaskId}
                        onClick={() => toggleTask(uniqueTaskId)}
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
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p
                              className={`text-sm font-semibold ${done ? "line-through text-muted-foreground" : ""}`}
                            >
                              {task.subject}
                            </p>
                            <span
                              className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium}`}
                            >
                              {task.priority}
                            </span>
                            {task.curriculum && (
                              <span className="font-mono text-[9px] text-muted-foreground">
                                {task.curriculum}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs ${done ? "line-through text-muted-foreground" : "text-muted-foreground"}`}
                          >
                            {task.task}
                          </p>
                          {task.study_tip && (
                            <p className="text-xs text-primary/70 mt-1">💡 {task.study_tip}</p>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">
                          {task.duration}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {dailyQuote && (
                  <p className="mt-2 text-[10px] text-muted-foreground italic text-center">
                    "{dailyQuote}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

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