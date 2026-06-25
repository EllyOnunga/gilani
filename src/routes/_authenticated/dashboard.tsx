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
  Flame,
  Target,
  Zap,
  ChevronRight,
} from "lucide-react";
import { getRequest } from "@tanstack/react-start/server";
import { generateText } from "ai";
import { createGoogleAiProvider } from "@/lib/ai-gateway.server";
import { authenticateRequest } from "@/lib/api-auth.server";

// ─── Types ─────────────────────────────────────────────────────────────────────

type RevisionTopic = {
  subject: string;
  topic: string;
};

type DailyInsights = {
  tip: string;
  topicOfDay: string;
  didYouKnow: string;
  streakMotivation: string;
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

// ─── Daily Insights Server Function ───────────────────────────────────────────

const fetchDailyInsights = createServerFn({ method: "GET" })
  .inputValidator(z.object({ curriculum: z.string(), streak: z.number() }))
  .handler(async ({ data }) => {
    const { curriculum, streak } = data;
    const provider = createGoogleAiProvider();
    const model = provider.chatModel("gemini-2.5-flash");
    const { text } = await generateText({
      model,
      prompt: `You are an educational assistant for ${curriculum} students in Kenya. Generate 4 short pieces of educational content. Respond ONLY with valid JSON, no markdown, no backticks.

{
  "tip": "A practical study tip for ${curriculum} students (1-2 sentences)",
  "topicOfDay": "A specific ${curriculum} syllabus topic with a one-sentence explanation of a key concept",
  "didYouKnow": "A fascinating educational fact relevant to ${curriculum} subjects (1-2 sentences)",
  "streakMotivation": "${streak > 0 ? `An encouraging message about maintaining a ${streak}-day study streak` : "An encouraging message to start a study streak today"} (1 sentence)"
}`,
      maxOutputTokens: 400,
    });
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean) as DailyInsights;
    } catch {
      return {
        tip: "Break your study sessions into 25-minute focused blocks with 5-minute breaks for maximum retention.",
        topicOfDay: "Photosynthesis: Plants convert sunlight, water and CO₂ into glucose and oxygen via the Calvin cycle.",
        didYouKnow: "The human brain can store approximately 2.5 petabytes of information — equivalent to 3 million hours of TV.",
        streakMotivation: streak > 0 ? `${streak} days strong — consistency is the foundation of excellence!` : "Every expert was once a beginner — start your streak today!",
      } satisfies DailyInsights;
    }
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
  const [insights, setInsights] = useState<DailyInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const d = new Date();
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate(),
        ).padStart(2, "0")}`;
        const res = await loadDashboardData({ data: { localDate } });
        setData(res);
        // Fetch AI insights using curriculum from loaded data
        try {
          const ins = await fetchDailyInsights({
            data: { curriculum: res.curriculum || "KCSE", streak: res.streak || 0 },
          });
          setInsights(ins);
        } catch (e) {
          console.error("[Dashboard] insights error:", e);
        } finally {
          setInsightsLoading(false);
        }
      } catch (err) {
        console.error("[Dashboard] load error:", err);
        setInsightsLoading(false);
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
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 mx-auto sm:mx-0">
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
          </div>
        </div>
      </header>

      {/* ── Study Suite ── */}
      <section className="animate-in-slide [animation-delay:20ms]">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-serif text-lg font-semibold">Your Study Suite</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All your study tools in one place</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          {[
            { title: "AI Tutor", description: "Curriculum-precise answers, worked proofs & teacher escalation.", icon: MessageCircle, to: "/tutor", cta: "Start session" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5"
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

      {/* ── Daily Educational Insights ── */}
      <section className="animate-in-slide [animation-delay:40ms]">
        <div className="mb-4">
          <h3 className="font-serif text-lg font-semibold">Today's Learning Insights</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Personalised for your {curriculum} curriculum</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              label: "Study Tip",
              icon: Zap,
              content: insights?.tip,
              accent: "text-primary",
              bg: "bg-primary/5 border-primary/20",
            },
            {
              label: "Topic of the Day",
              icon: Target,
              content: insights?.topicOfDay,
              accent: "text-violet-600 dark:text-violet-400",
              bg: "bg-violet-50 dark:bg-violet-950/20 border-violet-200/60 dark:border-violet-800/40",
            },
            {
              label: "Did You Know?",
              icon: BookOpenText,
              content: insights?.didYouKnow,
              accent: "text-teal-600 dark:text-teal-400",
              bg: "bg-teal-50 dark:bg-teal-950/20 border-teal-200/60 dark:border-teal-800/40",
            },
            {
              label: streak > 0 ? `${streak}-Day Streak` : "Start Your Streak",
              icon: Flame,
              content: insights?.streakMotivation,
              accent: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40",
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border p-4 sm:p-5 flex flex-col gap-3 ${card.bg}`}
            >
              <div className="flex items-center gap-2">
                <card.icon className={`h-4 w-4 shrink-0 ${card.accent}`} />
                <p className={`font-mono text-[10px] uppercase tracking-widest font-bold ${card.accent}`}>
                  {card.label}
                </p>
              </div>
              {insightsLoading ? (
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-current opacity-10 animate-pulse" />
                  <div className="h-3 w-4/5 rounded bg-current opacity-10 animate-pulse" />
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-foreground/80">{card.content}</p>
              )}
            </div>
          ))}
        </div>
      </section>

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
