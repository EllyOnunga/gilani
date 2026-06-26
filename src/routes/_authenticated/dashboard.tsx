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
  const curriculum = data?.curriculum ?? "";
  const plan = data?.plan ?? "";
  const memberSince = data?.memberSince ?? "";

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
                      {plan === "Free" ? "Free Plan" : `${plan} Plan`}
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
      <section className="animate-in-slide [animation-delay:40ms]">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-serif text-lg font-semibold">Your Study Suite</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get curriculum-accurate help the moment you're stuck — no waiting for office hours.
            </p>
          </div>
        </div>
        <div className="max-w-md">
          <Link
            to="/tutor"
            className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-foreground/30 hover:-translate-y-0.5"
          >
            <div>
              <div className="p-2 rounded-lg w-fit bg-muted text-muted-foreground mb-3">
                <MessageCircle className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold">AI Tutor</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                Curriculum-precise answers, worked proofs & teacher escalation.
              </p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-muted-foreground">Start session</span>
              <ChevronRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-muted-foreground" />
            </div>
          </Link>
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
              className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <card.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="font-mono text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
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
