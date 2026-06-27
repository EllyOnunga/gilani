import { useState, useEffect } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";

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
  ArrowRight,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { getPlanLimits } from "@/lib/plans";
import { getRequest } from "@tanstack/react-start/server";
import { generateText } from "ai";
import { createGoogleAiProvider } from "@/lib/ai-gateway.server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { PlansModal } from "@/components/PlansModal";

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
  dailyUsed: number;
  dailyMax: number;
  lastSessionId: string | null;
  lastSessionTitle: string | null;
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
    const [profileRes, messagesRes, streakAndStats, lastSessionRes, rateLimitRes] =
      await Promise.all([
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
          calculateUserStreakAndStats(userId),
        ),
        supabaseAdmin
          .from("conversations")
          .select("id, title")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("rate_limits")
          .select("count, max_count")
          .eq("key", `${userId}:chat:day`)
          .gt("reset_at", new Date().toISOString())
          .maybeSingle(),
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
      dailyUsed: (rateLimitRes.data as any)?.count ?? 0,
      dailyMax:
        (rateLimitRes.data as any)?.max_count ??
        (profile?.plan === "basic"
          ? 50
          : profile?.plan === "premium" || profile?.plan === "school"
            ? 999_999
            : 10),
      lastSessionId: lastSessionRes.data?.id ?? null,
      lastSessionTitle: lastSessionRes.data?.title ?? null,
      revisionTopics: [],
    };
  });

// ─── Daily Insights Server Function ───────────────────────────────────────────

const fetchDailyInsights = createServerFn({ method: "GET" })
  .inputValidator(z.object({ curriculum: z.string(), streak: z.number() }))
  .handler(async ({ data }) => {
    const { curriculum, streak } = data;
    const fallback = {
      tip: "Break your study sessions into 25-minute focused blocks with 5-minute breaks for maximum retention.",
      topicOfDay:
        "Photosynthesis: Plants convert sunlight, water and CO₂ into glucose and oxygen via the Calvin cycle.",
      didYouKnow:
        "The human brain can store approximately 2.5 petabytes of information — equivalent to 3 million hours of TV.",
      streakMotivation:
        streak > 0
          ? `${streak} days strong — consistency is the foundation of excellence!`
          : "Every expert was once a beginner — start your streak today!",
    } satisfies DailyInsights;

    try {
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
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean) as DailyInsights;
    } catch (err) {
      console.error(
        "[Dashboard Server] Gemini insights fetch failed, returning static fallback:",
        err,
      );
      return fallback;
    }
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — GilaniAI" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("__gilani_role");
      if (cached === "admin") throw redirect({ to: "/admin/users" as any });
      if (cached === "teacher") throw redirect({ to: "/teacher/escalations" as any });
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      if (roleRow?.role) sessionStorage.setItem("__gilani_role", roleRow.role);
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
  const dailyUsed = data?.dailyUsed ?? 0;
  const dailyMax =
    data?.dailyMax ?? getPlanLimits(data?.plan?.toLowerCase() ?? "free").dailyMessages;
  const usagePct = dailyMax > 0 ? Math.min(100, Math.round((dailyUsed / dailyMax) * 100)) : 0;

  const displayName = data?.displayName ?? "";
  const plan = data?.plan ?? "";
  const memberSince = data?.memberSince ?? "";
  const planLabel = plan === "free" || plan === "Free" ? "Free Plan" : `${plan} Plan`;
  const isFree = plan === "free" || plan === "Free";
  const [showPlans, setShowPlans] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* ── Header ── */}
      <header className="flex flex-col gap-1">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          {new Date().toLocaleDateString("en-KE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        {isLoading ? (
          <div className="space-y-2 mt-1">
            <div className="h-8 w-72 rounded-lg bg-muted/60 animate-pulse" />
            <div className="h-4 w-40 rounded bg-muted/40 animate-pulse" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {getGreeting()}, <span className="capitalize">{displayName}</span>.
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold font-mono tracking-wide border ${isFree ? "bg-muted/40 border-border/40 text-muted-foreground" : "bg-primary/10 border-primary/20 text-primary"}`}
                >
                  {planLabel}
                </span>
                {memberSince && (
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    since {memberSince}
                  </span>
                )}
              </div>
            </div>
            {isFree && (
              <button
                onClick={() => setShowPlans(true)}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Zap className="h-3 w-3" /> Upgrade Plan
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Study Streak",
            value: isLoading ? null : `${streak}`,
            unit: "days",
            icon: Flame,
            color: streak > 0 ? "text-orange-500" : "text-muted-foreground/40",
          },
          {
            label: "Total Messages",
            value: isLoading ? null : `${messagesCount}`,
            unit: "sent",
            icon: MessageCircle,
            color: "text-blue-500",
          },
          {
            label: "Today's Usage",
            value: isLoading ? null : `${dailyUsed}/${dailyMax}`,
            unit: "msgs",
            icon: TrendingUp,
            color: usagePct >= 80 ? "text-red-500" : "text-green-500",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border/40 bg-card p-3 sm:p-4 flex flex-col gap-1"
          >
            <div className="flex items-center gap-1.5">
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
                {s.label}
              </p>
            </div>
            {s.value === null ? (
              <div className="h-6 w-16 rounded bg-muted/60 animate-pulse mt-1" />
            ) : (
              <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {s.value}{" "}
                <span className="text-xs font-normal text-muted-foreground/50">{s.unit}</span>
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Daily usage bar ── */}
      {!isLoading && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 font-semibold">
              Daily message quota
            </p>
            <p className="text-[10px] font-mono text-muted-foreground/60">
              {dailyUsed} / {dailyMax}
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <section className="space-y-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
          Study Suite
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/tutor"
            className="group flex items-center justify-between rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:bg-primary/5 p-4 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">New AI Session</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Start a fresh tutoring session
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
          {data?.lastSessionId && (
            <Link
              to="/tutor/$threadId"
              params={{ threadId: data.lastSessionId }}
              className="group flex items-center justify-between rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:bg-primary/5 p-4 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/40">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Continue Session</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[160px]">
                    {data.lastSessionTitle ?? "Last session"}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          )}
        </div>
      </section>

      {/* ── Daily Insights ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
            Daily Learning Insights
          </p>
          <span className="font-mono text-[9px] text-muted-foreground/40">
            {new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Study Tip", icon: Zap, content: insights?.tip, accent: "border-l-blue-500" },
            {
              label: "Topic of the Day",
              icon: Target,
              content: insights?.topicOfDay,
              accent: "border-l-purple-500",
            },
            {
              label: "Did You Know?",
              icon: BookOpenText,
              content: insights?.didYouKnow,
              accent: "border-l-green-500",
            },
            {
              label: streak > 0 ? `${streak}-Day Streak` : "Start Your Streak",
              icon: Flame,
              content: insights?.streakMotivation,
              accent: "border-l-orange-500",
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border border-border/30 border-l-2 ${card.accent} bg-card p-4 flex flex-col gap-2`}
            >
              <div className="flex items-center gap-1.5">
                <card.icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <p className="font-mono text-[9px] uppercase tracking-widest font-semibold text-muted-foreground/60">
                  {card.label}
                </p>
              </div>
              {insightsLoading ? (
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded bg-muted/50 animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-muted/50 animate-pulse" />
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">{card.content}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSubscribe
        variant="banner"
        userId={data?.userId}
        userEmail={data?.email}
        userName={data?.displayName}
      />
      {showPlans && <PlansModal onClose={() => setShowPlans(false)} />}
    </div>
  );
}
