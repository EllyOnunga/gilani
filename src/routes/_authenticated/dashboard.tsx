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
  messagesCount: number;
  // Content
  revisionTopics: RevisionTopic[];
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

    // 1. Fetch dashboard data in parallel
    const [
      profileRes,
      messagesRes,
      streakAndStats,
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("display_name, plan, curriculum, created_at")
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      import("@/lib/analytics-utils.server").then(({ calculateUserStreakAndStats }) =>
        calculateUserStreakAndStats(userId)
      ),
    ]);

    const profile = profileRes.data;
    const messagesCount = messagesRes.count;
    const { streak } = streakAndStats;

    const memberSince = profile?.created_at
      ? new Date(profile.created_at).toLocaleDateString("en-KE", {
          month: "short",
          year: "numeric",
        })
      : "";

    return {
      userId: userId,
      email: authResult.user?.email || "",
      displayName: profile?.display_name || authResult.user?.email?.split("@")[0] || "Student",
      curriculum: profile?.curriculum || "KCSE",
      plan: profile?.plan || "Free",
      memberSince,
      streak,
      messagesCount: messagesCount ?? 0,
      revisionTopics: [],
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

        // Retrieve/save AI insights daily cache
        const cacheKey = `gilani_daily_insights_${res.userId}_${localDate}`;
        const cached = localStorage.getItem(cacheKey);
        let loadedInsights = null;
        if (cached) {
          try {
            loadedInsights = JSON.parse(cached);
            setInsights(loadedInsights);
            setInsightsLoading(false);
          } catch {
            localStorage.removeItem(cacheKey);
          }
        }

        if (!loadedInsights) {
          try {
            const ins = await fetchDailyInsights({
              data: { curriculum: res.curriculum || "KCSE", streak: res.streak || 0 },
            });
            setInsights(ins);
            localStorage.setItem(cacheKey, JSON.stringify(ins));
          } catch (e) {
            console.error("[Dashboard] insights error:", e);
          } finally {
            setInsightsLoading(false);
          }
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
  const messagesCount = data?.messagesCount ?? 0;

  const displayName = data?.displayName ?? "";
  const plan = data?.plan ?? "";
  const memberSince = data?.memberSince ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-12 p-4 sm:p-6 lg:p-8">

      {/* ── Hero Header ── */}
      <header className="animate-in-slide flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between items-start">
        {/* Greeting */}
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
            Workspace / Dashboard
          </p>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-9 w-64 rounded bg-muted/60 animate-pulse" />
              <div className="h-4 w-40 rounded bg-muted/60 animate-pulse" />
            </div>
          ) : (
            <>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
                {getGreeting()},{" "}
                <span className="capitalize text-foreground font-bold">{displayName}</span>. Ready to study?
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {plan && (
                  <span
                    className="inline-flex items-center rounded-md bg-muted/30 border border-border/40 px-2 py-0.5 font-mono text-[9px] font-medium text-foreground"
                  >
                    {plan === "Free" ? "Free Tier" : `${plan} Member`}
                  </span>
                )}
                {memberSince && (
                  <span className="font-mono text-[9px] text-muted-foreground/60">
                    Joined {memberSince}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Stat pills */}
        <div className="flex items-center gap-4 divide-x divide-border/20 w-full sm:w-auto shrink-0 border border-border/40 rounded-xl bg-muted/10 p-3 sm:px-4 sm:py-3">
          {/* Streak */}
          <div className="flex flex-col items-start gap-0.5 px-2 min-w-[90px]">
            <div className="flex items-center gap-1.5 text-muted-foreground/60">
              <Flame className="h-3.5 w-3.5" />
              <p className="font-mono text-[9px] uppercase tracking-widest font-semibold">
                Streak
              </p>
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground mt-1">
              {isLoading ? "—" : `${streak} days`}
            </p>
          </div>
          {/* Messages */}
          <div className="flex flex-col items-start gap-0.5 pl-6 pr-2 min-w-[90px]">
            <div className="flex items-center gap-1.5 text-muted-foreground/60">
              <MessageCircle className="h-3.5 w-3.5" />
              <p className="font-mono text-[9px] uppercase tracking-widest font-semibold">
                Messages
              </p>
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground mt-1">
              {isLoading ? "—" : messagesCount}
            </p>
          </div>
        </div>
      </header>

      {/* ── Study Suite ── */}
      <section className="animate-in-slide [animation-delay:40ms] space-y-4">
        <div>
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground/60">Your Study Suite</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Get curriculum-accurate assistance instantly without any wait.
          </p>
        </div>
        <div className="max-w-md">
          <Link
            to="/tutor"
            className="group flex flex-col justify-between rounded-xl border border-dashed border-border/60 bg-muted/5 p-5 transition-all duration-200 hover:border-border hover:bg-muted/10 hover:-translate-y-0.5"
          >
            <div>
              <div className="p-2.5 rounded-lg w-fit bg-muted/40 text-muted-foreground mb-4">
                <MessageCircle className="h-4 w-4 text-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">AI Tutor Session</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/80">
                Detailed step-by-step guidance, curriculum matches, and expert support.
              </p>
            </div>
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/20">
              <span className="text-[9px] font-mono uppercase tracking-widest font-bold text-muted-foreground">Start new session</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-40 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-foreground" />
            </div>
          </Link>
        </div>
      </section>

      {/* ── Daily Educational Insights ── */}
      <section className="animate-in-slide [animation-delay:80ms] space-y-4">
        <div>
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground/60">Daily Learning Insights</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              label: "Study Tip",
              icon: Zap,
              content: insights?.tip,
            },
            {
              label: "Topic of the Day",
              icon: Target,
              content: insights?.topicOfDay,
            },
            {
              label: "Did You Know?",
              icon: BookOpenText,
              content: insights?.didYouKnow,
            },
            {
              label: streak > 0 ? `${streak}-Day Streak` : "Start Your Streak",
              icon: Flame,
              content: insights?.streakMotivation,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-border/30 bg-muted/5 p-5 flex flex-col gap-3 hover:bg-muted/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <card.icon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                <p className="font-mono text-[9px] uppercase tracking-widest font-semibold text-muted-foreground/60">
                  {card.label}
                </p>
              </div>
              {insightsLoading ? (
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-muted/60 animate-pulse" />
                  <div className="h-3 w-4/5 rounded bg-muted/60 animate-pulse" />
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">{card.content}</p>
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
