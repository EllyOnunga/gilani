import { useState, useEffect, lazy, Suspense } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";

import { MarkdownRenderer } from "@/components/tutor/MarkdownRenderer";

import { NewsletterSubscribe } from "@/components/NewsletterSubscribe";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import {
  MessageCircle,
  BookOpenText,
  ListChecks,
  CalendarDays,
  Flame,
  Award,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Clock,
  Target,
  Zap,
  ChevronRight,
  User,
  BookOpen,
  FileText,
} from "lucide-react";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";

// ─── Types ─────────────────────────────────────────────────────────────────────

type RevisionTopic = {
  subject: string;
  topic: string;
};

type DashboardData = {
  // Profile
  userId: string;
  email: string;
  displayName: string;
  curriculum: string;
  plan: string;
  memberSince: string;
  // Stats
  streak: number;
  quizzesCompleted: number;
  messagesCount: number;
  notesCount: number;
  // Content
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

    // 1. Fetch dashboard data in parallel (profile, quiz attempts, messages, notes, study plans, and streak)
    const [
      profileRes,
      attemptsRes,
      messagesRes,
      notesRes,
      planRes,
      streakAndStats,
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("display_name, plan, curriculum, created_at")
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("quiz_attempts")
        .select("id")
        .eq("user_id", userId),
      supabaseAdmin
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabaseAdmin
        .from("notes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabaseAdmin
        .from("study_plans")
        .select("items")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      import("@/lib/analytics-utils.server").then(({ calculateUserStreakAndStats }) =>
        calculateUserStreakAndStats(userId)
      ),
    ]);

    const profile = profileRes.data;
    const attempts = attemptsRes.data;
    const quizCount = attempts?.length ?? 0;
    const messagesCount = messagesRes.count;
    const notesCount = notesRes.count;
    const plan = planRes.data;
    const { streak } = streakAndStats;

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

      // Fallback: if no tasks match today, take the first 3 tasks of the plan
      const displayTasks = dateFiltered.length > 0 ? dateFiltered : allTasks;

      plannerTasks = displayTasks.slice(0, 3).map((item: any) => ({
        subject: item.subject || "Study Session",
        task: item.task || "Revision",
        duration: item.duration || "45 min",
      }));

      // Extract unique subject+topic pairs
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
      revisionTopics = revisionTopics.slice(0, 5);
    }


    // Format member since date
    const memberSince = profile?.created_at
      ? new Date(profile.created_at).toLocaleDateString("en-KE", { month: "long", year: "numeric" })
      : "";

    return {
      userId: userId,
      email: authResult.user?.email || "",
      displayName: profile?.display_name || authResult.user?.email?.split("@")[0] || "Student",
      curriculum: profile?.curriculum || "KCSE",
      plan: profile?.plan || "Free",
      memberSince,
      streak,
      quizzesCompleted: quizCount,
      messagesCount: messagesCount ?? 0,
      notesCount: notesCount ?? 0,
      revisionTopics,
      plannerTasks,
    };
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — GilaniAI" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      if (roleRow?.role === "admin") throw redirect({ to: "/admin/users" as any });
      if (roleRow?.role === "teacher") throw redirect({ to: "/teacher/escalations" as any });
    }
  },
  component: Dashboard,
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Habari za asubuhi";
  if (h < 17) return "Habari za mchana";
  return "Habari za jioni";
}

// ─── Component ─────────────────────────────────────────────────────────────────

function Dashboard() {
  const { roles, loading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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
    };

    fetchData();

    // Refresh on window focus
    window.addEventListener("focus", fetchData);
    return () => window.removeEventListener("focus", fetchData);
  }, []);

  // Block admin/teacher from rendering student dashboard
  if (!loading && roles.length > 0 && (roles.includes("admin") || roles.includes("teacher"))) {
    return null;
  }

  const isLoading = !data;

  const streak = data?.streak ?? 0;
  const quizzesCompleted = data?.quizzesCompleted ?? 0;
  const messagesCount = data?.messagesCount ?? 0;
  const notesCount = data?.notesCount ?? 0;
  const revisionTopics = data?.revisionTopics ?? [];
  const plannerTasks = data?.plannerTasks ?? [];

  const displayName = data?.displayName ?? "";
  const curriculum = data?.curriculum ?? "";
  const plan = data?.plan ?? "";
  const memberSince = data?.memberSince ?? "";

  // Curriculum pill colours
  const curriculumColor =
    curriculum === "CBC"
      ? "bg-teal-500/10 text-teal-600 border-teal-300/60"
      : curriculum === "IGCSE"
        ? "bg-violet-500/10 text-violet-600 border-violet-300/60"
        : "bg-blue-500/10 text-blue-600 border-blue-300/60";

  const planColor =
    plan === "Free"
      ? "bg-muted text-muted-foreground border-border"
      : "bg-amber-500/10 text-amber-600 border-amber-300/60";

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-10">

      {/* ── Hero Header ── */}
      <header className="animate-in-slide rounded-2xl border border-border bg-card p-4 sm:p-6">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-primary mb-1 text-center sm:text-left">
          Dashboard
        </p>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between items-center sm:items-start">
          {/* Greeting */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-48 rounded-lg bg-white/20 animate-pulse" />
                <div className="h-4 w-32 rounded-lg bg-white/20 animate-pulse" />
              </div>
            ) : (
              <>
                <h2 className="font-serif text-xl sm:text-3xl lg:text-4xl text-balance leading-tight text-foreground text-center sm:text-left">
                  {getGreeting()},{" "}
                  <span className="capitalize">{displayName}</span>. Ready to study?
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                  {plan && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-1.5 py-px font-mono text-[10px] font-bold uppercase tracking-wider text-foreground"
                    >
                      {plan === "Free" ? "Free Plan" : `⭐ ${plan}`}
                    </span>
                  )}
                  {memberSince && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Member since {memberSince}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Stat pills */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 mx-auto sm:mx-0">
            {/* Streak */}
            <div className="flex flex-col items-center gap-1 rounded-lg border border-border px-1 sm:px-4 py-2 min-w-0">
              <Flame className="h-4 w-4 text-primary" />
              <p className="font-serif text-base sm:text-lg leading-none font-bold text-foreground">
                {isLoading ? "—" : streak}
              </p>
              <p className="font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-muted-foreground text-center truncate w-full">
                day streak
              </p>
            </div>
            {/* Quizzes */}
            <div className="flex flex-col items-center gap-1 rounded-lg border border-border px-1 sm:px-4 py-2 min-w-0">
              <Award className="h-4 w-4 text-primary" />
              <p className="font-serif text-base sm:text-lg leading-none font-bold text-foreground">
                {isLoading ? "—" : quizzesCompleted}
              </p>
              <p className="font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-muted-foreground text-center truncate w-full">
                quizzes
              </p>
            </div>
            {/* Messages */}
            <div className="flex flex-col items-center gap-1 rounded-lg border border-border px-1 sm:px-4 py-2 min-w-0">
              <MessageCircle className="h-4 w-4 text-primary" />
              <p className="font-serif text-base sm:text-lg leading-none font-bold text-foreground">
                {isLoading ? "—" : messagesCount}
              </p>
              <p className="font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-muted-foreground text-center truncate w-full">
                messages
              </p>
            </div>
            {/* Notes */}
            <div className="flex flex-col items-center gap-1 rounded-lg border border-border px-1 sm:px-4 py-2 min-w-0">
              <FileText className="h-4 w-4 text-primary" />
              <p className="font-serif text-base sm:text-lg leading-none font-bold text-foreground">
                {isLoading ? "—" : notesCount}
              </p>
              <p className="font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-muted-foreground text-center truncate w-full">
                notes
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Quick Actions ── */}
      <section className="animate-in-slide [animation-delay:40ms] rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-serif text-lg font-semibold text-foreground">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Ask the Tutor", icon: MessageCircle, to: "/tutor" },
            { label: "Take a Quiz", icon: ListChecks, to: "/quizzes" },
            { label: "Upload Notes", icon: BookOpenText, to: "/notes" },
            { label: "Study Planner", icon: CalendarDays, to: "/planner" },
          ].map(({ label, icon: Icon, to }) => (
            <Link
              key={to}
              to={to as any}
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background p-2.5 sm:p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50"
            >
              <div className="rounded-lg p-2.5 bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Study Suite ── */}
      <section className="animate-in-slide [animation-delay:80ms]">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-serif text-lg font-semibold">Your Study Suite</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All your study tools in one place</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {[
            { title: "AI Tutor", description: "Curriculum-precise answers, worked proofs & teacher escalation.", icon: MessageCircle, to: "/tutor", cta: "Start session" },
            { title: "Study Notes", description: "Upload notes, get AI summaries, key concepts & flashcards.", icon: BookOpenText, to: "/notes", cta: "Add notes" },
            { title: "Quizzes", description: "AI-generated MCQs with explanations and difficulty tiers.", icon: ListChecks, to: "/quizzes", cta: "Practice now" },
            { title: "Planner", description: "7-day schedule built from your quiz history and weak areas.", icon: CalendarDays, to: "/planner", cta: "View plan" },
            { title: "Analytics", description: "Track mastery scores, streaks and focus concepts over time.", icon: BarChart3, to: "/analytics", cta: "View stats" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-2.5 sm:p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5"
              >
                <div>
                  <div className="p-2 rounded-lg w-fit bg-primary/10 text-primary mb-3 transition-transform duration-200 group-hover:scale-105">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-bold group-hover:text-primary transition-colors">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{item.description}</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-primary">{item.cta}</span>
                  <ChevronRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-primary" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Widgets Grid ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 animate-in-slide [animation-delay:120ms]">

        {/* Today's Schedule */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="font-serif text-base font-semibold">Today's Schedule</h3>
            </div>
            <Link to="/planner" className="font-mono text-[10px] uppercase tracking-widest text-primary hover:underline">
              Full plan →
            </Link>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />)}
              </div>
            ) : plannerTasks.length === 0 ? (
              <div className="py-5 sm:py-8 text-center flex flex-col items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No tasks scheduled</p>
                  <Link to="/planner" className="text-xs text-primary hover:underline mt-1 inline-block">Generate a study plan →</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {plannerTasks.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <Target className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-tight">{t.subject}</p>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-full">

                        <MarkdownRenderer content={t.task} />

                      </div>
                    </div>
                    <span className="flex-shrink-0 font-mono text-[10px] text-muted-foreground bg-background border border-border/50 rounded-md px-1.5 py-0.5">
                      {t.duration}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Focus Topics */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="font-serif text-base font-semibold">Focus Topics</h3>
            </div>
            <Link to="/planner" className="font-mono text-[10px] uppercase tracking-widest text-primary hover:underline">
              View plan →
            </Link>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />)}
              </div>
            ) : revisionTopics.length === 0 ? (
              <div className="py-5 sm:py-8 text-center flex flex-col items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No revision targets yet</p>
                  <Link to="/quizzes" search={{} as any} className="text-xs text-primary hover:underline mt-1 inline-block">Take a quiz to find weak areas →</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {revisionTopics.map((rt, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                    <span className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-mono text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-tight">{rt.subject}</p>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-full">

                        <MarkdownRenderer content={rt.topic} />

                      </div>
                    </div>
                    <Link
                      to="/quizzes" search={{ topic: rt.topic } as any}
                      className="flex-shrink-0 font-mono text-[10px] text-primary border border-primary/30 rounded-md px-2 py-0.5 hover:bg-primary/10 transition-colors"
                    >
                      Quiz
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Newsletter Banner */}
      <NewsletterSubscribe
        variant="banner"
        userId={data?.userId}
        userEmail={data?.email}
        userName={data?.displayName}
      />
    </div>
  );
}
