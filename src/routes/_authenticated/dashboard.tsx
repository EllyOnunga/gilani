import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import {
  GraduationCap,
  MessageCircle,
  BookOpenText,
  ListChecks,
  CalendarDays,
  Flame,
  Award,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth";
// Carousel import removed — using CSS infinite scroll instead

// ─── Types ─────────────────────────────────────────────────────────────────────

// ─── Types ─────────────────────────────────────────────────────────────────────

type RevisionTopic = {
  subject: string;
  topic: string;
};

type DashboardData = {
  streak: number;
  quizzesCompleted: number;
  revisionTopics: RevisionTopic[];
  plannerTasks: { subject: string; task: string; duration: string }[];
};

// ─── Server Functions ──────────────────────────────────────────────────────────

const loadDashboardData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ localDate: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;
    const { localDate } = data;

    // 1. Fetch quiz attempts to get completed count
    const { data: attempts } = await supabaseAdmin
      .from("quiz_attempts")
      .select("id")
      .eq("user_id", userId);

    const quizCount = attempts?.length ?? 0;

    // 2. Fetch the latest study plan
    const { data: plan } = await supabaseAdmin
      .from("study_plans")
      .select("items")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let plannerTasks: { subject: string; task: string; duration: string }[] = [];
    let revisionTopics: { subject: string; topic: string }[] = [];

    if (plan && plan.items) {
      const parsedItems = typeof plan.items === "string" ? JSON.parse(plan.items) : plan.items;

      let allTasks: any[] = [];
      if (parsedItems && typeof parsedItems === "object" && !Array.isArray(parsedItems)) {
        if (Array.isArray(parsedItems.items)) {
          allTasks = parsedItems.items;
        }
      } else if (Array.isArray(parsedItems)) {
        allTasks = parsedItems;
      }

      // Filter tasks for the user's local date
      const dateFiltered = allTasks.filter((t: any) => t.date === localDate);

      // Fallback: if no tasks match today, just take the first 3 tasks of the plan
      const displayTasks = dateFiltered.length > 0 ? dateFiltered : allTasks;

      plannerTasks = displayTasks.slice(0, 3).map((item: any) => ({
        subject: item.subject || "Study Session",
        task: item.task || "Revision",
        duration: item.duration || "45 min",
      }));

      // Extract unique subject+topic pairs from today's tasks (or full plan as fallback)
      const topicSources = dateFiltered.length > 0 ? dateFiltered : allTasks;
      const seen = new Set<string>();
      for (const item of topicSources) {
        const subject = (item.subject || "").trim();
        const topic = (item.topic || item.subtopic || "").trim();
        if (!subject) continue;
        const key = `${subject}||${topic}`;
        if (!seen.has(key)) {
          seen.add(key);
          revisionTopics.push({ subject, topic: topic || "General Revision" });
        }
      }
      // Cap at 5 unique topic entries
      revisionTopics = revisionTopics.slice(0, 5);
    }

    const { calculateUserStreakAndStats } = await import("@/lib/analytics-utils");
    const { streak } = await calculateUserStreakAndStats(userId);

    return {
      streak,
      quizzesCompleted: quizCount,
      revisionTopics,
      plannerTasks,
    };
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — GilaniAI" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, roles, loading } = useAuth();

  // Block admin/teacher from seeing student dashboard
  if (!loading && roles.length > 0 && (roles.includes("admin") || roles.includes("teacher"))) {
    return null;
  }
  const name =
    (user?.user_metadata?.display_name as string) || user?.email?.split("@")[0] || "Student";

  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const d = new Date();
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate(),
        ).padStart(2, "0")}`;

        const res = await loadDashboardData({ data: { localDate } });
        setData(res);
      } catch (err) {
        console.error("[Dashboard] load error:", err);
      }
    })();
  }, [user?.id]);

  const streak = data?.streak ?? 0;
  const quizzesCompleted = data?.quizzesCompleted ?? 0;
  const revisionTopics = data?.revisionTopics ?? [];
  const plannerTasks = data?.plannerTasks ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8 lg:p-12 sm:space-y-8 lg:space-y-12">
      {/* Welcome Header */}
      <header className="animate-in-slide flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            Dashboard
          </p>
          <h2 className="mt-1 font-serif text-2xl sm:text-3xl lg:text-4xl text-balance">
            Habari, <span className="capitalize">{name}</span>. Ready to study?
          </h2>
        </div>
        {/* Stats row — sits below greeting on mobile, inline on sm+ */}
        <div className="flex gap-4 shrink-0">
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase text-muted-foreground flex items-center gap-1 justify-end">
              <Flame className="h-3 w-3 text-orange-500 fill-orange-500" /> Streak
            </p>
            <p className="font-serif text-2xl leading-none mt-1">{streak} days</p>
          </div>
          <div className="border-l border-border pl-4 text-right">
            <p className="font-mono text-[10px] uppercase text-muted-foreground flex items-center gap-1 justify-end">
              <Award className="h-3 w-3 text-yellow-500" /> Quizzes
            </p>
            <p className="font-serif text-2xl leading-none mt-1">{quizzesCompleted}</p>
          </div>
        </div>
      </header>

      {/* Study Suite — CSS infinite auto-scroll */}
      <section className="animate-in-slide [animation-delay:50ms] w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-serif text-2xl font-semibold">Your Study Suite</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore curriculum tools and practice systems
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:block">
            Hover to pause
          </span>
        </div>

        {/* Overflow mask + infinite scroll track */}
        <div className="suite-fade relative overflow-hidden">
          <div className="suite-track">
            {/* Cards rendered TWICE for seamless loop */}
            {[
              {
                title: "Socratic AI Tutor",
                description:
                  "Curriculum-precise AI tutor. Direct answers, worked proofs, teacher escalation.",
                icon: MessageCircle,
                to: "/tutor",
                accent: "from-blue-500/20 to-indigo-500/10",
                iconColor: "text-blue-600 dark:text-blue-400",
                cta: "Start a session",
                badge: "01",
              },
              {
                title: "Study Notes",
                description:
                  "Upload notes or paste text. Get AI-generated summaries, key concepts & flashcards.",
                icon: BookOpenText,
                to: "/notes",
                accent: "from-emerald-500/20 to-teal-500/10",
                iconColor: "text-emerald-600 dark:text-emerald-400",
                cta: "Summarise notes",
                badge: "02",
              },
              {
                title: "Practice Quizzes",
                description:
                  "AI-generated MCQs tuned to your weak topics, with full explanations and difficulty tiers.",
                icon: ListChecks,
                to: "/quizzes",
                accent: "from-orange-500/20 to-red-500/10",
                iconColor: "text-orange-600 dark:text-orange-400",
                cta: "Take a quiz",
                badge: "03",
              },
              {
                title: "Syllabus Planner",
                description:
                  "7-day personalised study schedule built from your quiz history and weak areas.",
                icon: CalendarDays,
                to: "/planner",
                accent: "from-violet-500/20 to-purple-500/10",
                iconColor: "text-violet-600 dark:text-violet-400",
                cta: "Manage calendar",
                badge: "04",
              },
              {
                title: "Performance Analytics",
                description:
                  "Track mastery scores, daily streaks, and flagged focus concepts over time.",
                icon: BarChart3,
                to: "/analytics",
                accent: "from-pink-500/20 to-rose-500/10",
                iconColor: "text-pink-600 dark:text-pink-400",
                cta: "View progress",
                badge: "05",
              },
            ]
              .concat([
                // Duplicate set for seamless wrap
                {
                  title: "Socratic AI Tutor",
                  description:
                    "Curriculum-precise AI tutor. Direct answers, worked proofs, teacher escalation.",
                  icon: MessageCircle,
                  to: "/tutor",
                  accent: "from-blue-500/20 to-indigo-500/10",
                  iconColor: "text-blue-600 dark:text-blue-400",
                  cta: "Start a session",
                  badge: "01",
                },
                {
                  title: "Study Notes",
                  description:
                    "Upload notes or paste text. Get AI-generated summaries, key concepts & flashcards.",
                  icon: BookOpenText,
                  to: "/notes",
                  accent: "from-emerald-500/20 to-teal-500/10",
                  iconColor: "text-emerald-600 dark:text-emerald-400",
                  cta: "Summarise notes",
                  badge: "02",
                },
                {
                  title: "Practice Quizzes",
                  description:
                    "AI-generated MCQs tuned to your weak topics, with full explanations and difficulty tiers.",
                  icon: ListChecks,
                  to: "/quizzes",
                  accent: "from-orange-500/20 to-red-500/10",
                  iconColor: "text-orange-600 dark:text-orange-400",
                  cta: "Take a quiz",
                  badge: "03",
                },
                {
                  title: "Syllabus Planner",
                  description:
                    "7-day personalised study schedule built from your quiz history and weak areas.",
                  icon: CalendarDays,
                  to: "/planner",
                  accent: "from-violet-500/20 to-purple-500/10",
                  iconColor: "text-violet-600 dark:text-violet-400",
                  cta: "Manage calendar",
                  badge: "04",
                },
                {
                  title: "Performance Analytics",
                  description:
                    "Track mastery scores, daily streaks, and flagged focus concepts over time.",
                  icon: BarChart3,
                  to: "/analytics",
                  accent: "from-pink-500/20 to-rose-500/10",
                  iconColor: "text-pink-600 dark:text-pink-400",
                  cta: "View progress",
                  badge: "05",
                },
              ])
              .map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="w-[280px] sm:w-[300px] flex-shrink-0 px-2">
                    <Link
                      to={item.to as any}
                      className={`group flex flex-col justify-between h-[200px] rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/60 hover:-translate-y-1 overflow-hidden`}
                    >
                      <div>
                        <div
                          className={`p-2.5 rounded-lg w-fit bg-gradient-to-br ${item.accent} ${item.iconColor} transition-transform duration-300 group-hover:scale-110`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <h4 className="mt-3 font-serif text-base font-bold group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {item.title}
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                        </h4>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-3">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-bold">
                          {item.cta}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {item.badge}
                        </span>
                      </div>
                    </Link>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 animate-in-slide [animation-delay:100ms]">
        {/* Dynamic Study Plan Widget */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Recent Planner Tasks
            </p>
            <h3 className="font-serif text-xl mt-2 mb-4">Today's Schedule</h3>

            {plannerTasks.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground italic">
                No active planner tasks. Generate a study plan to start organizing your week.
              </div>
            ) : (
              <div className="space-y-3">
                {plannerTasks.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5 text-muted-foreground/60 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">{t.subject}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{t.task}</p>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {t.duration}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {plannerTasks.length > 0 && (
            <Link
              to="/planner"
              className="text-xs font-semibold text-primary mt-4 inline-block hover:underline"
            >
              View full calendar plan →
            </Link>
          )}
        </div>

        {/* Revision Topics / Mastery Widget */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Today's Focus
            </p>
            <h3 className="font-serif text-xl mt-2 mb-4">Target Revision</h3>

            {revisionTopics.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground italic flex flex-col items-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground/50" />
                No revision targets yet. Generate a study plan to get started!
              </div>
            ) : (
              <div className="space-y-2">
                {revisionTopics.map((rt, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-background"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 text-primary font-mono text-[9px] font-bold">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground leading-tight">
                        {rt.subject}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {rt.topic}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {revisionTopics.length > 0 && (
            <Link
              to="/planner"
              className="text-xs font-semibold text-primary mt-4 inline-block hover:underline"
            >
              View full study plan →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
