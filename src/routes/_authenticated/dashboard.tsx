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
  isFallback?: boolean;
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
  .validator(z.object({ localDate: z.string() }))
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
  .validator(z.object({ curriculum: z.string(), streak: z.number() }))
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
      isFallback: true,
    } satisfies DailyInsights;

    try {
      const provider = createGoogleAiProvider();
      const model = provider.chatModel("gemini-2.5-flash");
      const { text } = await generateText({
        model,
        prompt: `Today is ${new Date().toISOString().slice(0, 10)}. Seed: ${Math.floor(Math.random() * 999983)}. You are an educational assistant for ${curriculum} students in Kenya. Generate 4 UNIQUE pieces of educational content different from previous days. Respond ONLY with valid JSON, no markdown, no backticks.

{
  "tip": "A practical study tip for ${curriculum} students (1-2 sentences)",
  "topicOfDay": "A specific ${curriculum} syllabus topic with a one-sentence explanation of a key concept",
  "didYouKnow": "A fascinating educational fact relevant to ${curriculum} subjects (1-2 sentences)",
  "streakMotivation": "${streak > 0 ? `An encouraging message about maintaining a ${streak}-day study streak` : "An encouraging message to start a study streak today"} (1 sentence)"
}`,
        maxOutputTokens: 1200,
      });

      const clean = text.replace(/```json|```/g, "").trim();
      let parsedJson;

      try {
        parsedJson = JSON.parse(clean);
      } catch {
        // Robust extraction: find the first complete JSON object by counting braces
        let depth = 0;
        let start = -1;
        for (let i = 0; i < clean.length; i++) {
          if (clean[i] === "{") {
            if (depth === 0) start = i;
            depth++;
          } else if (clean[i] === "}") {
            depth--;
            if (depth === 0 && start !== -1) {
              try {
                parsedJson = JSON.parse(clean.slice(start, i + 1));
                break;
              } catch {
                start = -1;
              }
            }
          }
        }
      }

      if (!parsedJson) throw new Error("No JSON found in response");
      return parsedJson as DailyInsights;
    } catch (err) {
      console.error(
        "[Dashboard Server] Gemini insights fetch failed:",
        err instanceof Error ? err.message : JSON.stringify(err),
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
        // Clear old cache keys (Bumped to v3 to clear poisoned v2 keys)
        Object.keys(localStorage).forEach((k) => {
          if (
            k.startsWith("gilani_daily_insights_") &&
            !k.startsWith("gilani_daily_insights_v3_")
          ) {
            localStorage.removeItem(k);
          }
        });

        const cacheKey = `gilani_daily_insights_v3_${res.userId}_${localDate}`;
        const cached = localStorage.getItem(cacheKey);
        let loadedInsights = null;

        if (cached) {
          try {
            loadedInsights = JSON.parse(cached);
            // Discard if it's the static fallback
            if (loadedInsights.isFallback) {
              loadedInsights = null;
              localStorage.removeItem(cacheKey);
            } else {
              setInsights(loadedInsights);
              setInsightsLoading(false);
            }
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

            // Only cache if it's NOT the fallback
            if (!ins.isFallback) {
              localStorage.setItem(cacheKey, JSON.stringify(ins));
            }
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
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      {/* ── Header ── */}
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
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
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                {getGreeting()}, <span className="capitalize">{displayName}</span>.
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold font-mono tracking-wide border transition-all ${isFree
                    ? "bg-muted/40 border-border/40 text-muted-foreground"
                    : "bg-primary/10 border-primary/20 text-primary shadow-sm"
                    }`}
                >
                  {planLabel}
                </span>
                {memberSince && (
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground/50 font-mono">
                    since {memberSince}
                  </span>
                )}
              </div>
            </div>
            {isFree && (
              <button
                onClick={() => setShowPlans(true)}
                className="self-start sm:self-auto inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary/90 px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground hover:from-primary/90 hover:to-primary transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Upgrade Plan
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── Stats + Quick Actions with dashboard bg image ── */}
      <div className="relative rounded-2xl overflow-hidden min-h-[400px] sm:min-h-[450px] lg:min-h-[500px]">
        {/* Background Image */}
        <img
          src="/dashboard.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
          loading="lazy"
        />

        {/* Dark overlay with better gradient */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        {/* Content */}
        <div className="relative z-[2] p-4 sm:p-6 lg:p-8 space-y-6">
          {/* ── Stats row ── */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              {
                label: "Study Streak",
                value: isLoading ? null : `${streak}`,
                unit: "days",
                icon: Flame,
                color: streak > 0 ? "text-orange-400" : "text-muted-foreground/40",
                glow: streak > 0 ? "shadow-orange-500/20" : "",
              },
              {
                label: "Total Messages",
                value: isLoading ? null : `${messagesCount}`,
                unit: "sent",
                icon: MessageCircle,
                color: "text-blue-400",
                glow: "shadow-blue-500/20",
              },
              {
                label: "Today's Usage",
                value: isLoading ? null : `${dailyUsed}/${dailyMax}`,
                unit: "msgs",
                icon: TrendingUp,
                color: usagePct >= 80 ? "text-red-400" : "text-green-400",
                glow: usagePct >= 80 ? "shadow-red-500/20" : "shadow-green-500/20",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-xl border border-white/10 p-4 sm:p-5 flex flex-col gap-2 hover:bg-white/15 transition-all duration-300 shadow-lg ${s.glow}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg bg-black/20 ${s.color}`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-white/80 font-semibold">
                    {s.label}
                  </p>
                </div>
                {s.value === null ? (
                  <div className="h-7 w-20 rounded bg-white/10 animate-pulse mt-1" />
                ) : (
                  <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {s.value}{" "}
                    <span className="text-xs sm:text-sm font-normal text-white/60 ml-1">
                      {s.unit}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* ── Daily usage bar ── */}
          {!isLoading && (
            <div className="space-y-2 bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-white/80 font-semibold">
                  Daily message quota
                </p>
                <p className="text-[10px] sm:text-[11px] font-mono text-primary font-semibold">
                  {dailyUsed} / {dailyMax}
                </p>
              </div>
              <div className="h-2 w-full rounded-full bg-black/30 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${usagePct >= 90
                    ? "bg-gradient-to-r from-red-500 to-red-400"
                    : usagePct >= 70
                      ? "bg-gradient-to-r from-amber-500 to-amber-400"
                      : "bg-gradient-to-r from-primary to-primary/80"
                    }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              {usagePct >= 80 && (
                <p className="text-[10px] text-amber-300/80 font-medium">
                  ⚠️ You're approaching your daily limit
                </p>
              )}
            </div>
          )}

          {/* ── Quick actions ── */}
          <section className="space-y-3">
            <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-white/80 font-semibold">
              Study Suite
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/tutor"
                className="group flex items-center justify-between rounded-xl bg-white/10 hover:bg-white/20 border border-[#FF9500] p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-lg transition-colors">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-orange-400">New Chat</p>
                    {/*<p className="text-[11px] sm:text-xs text-white/70 mt-0.5">
                      Start a fresh tutoring session
                    </p>*/}
                  </div>
                </div>
              </Link>
              {data?.lastSessionId && (
                <Link
                  to="/tutor/$threadId"
                  params={{ threadId: data.lastSessionId }}
                  className="group flex items-center justify-between rounded-xl bg-white/10 hover:bg-white/20 border border-[#FF9500] p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-lg transition-colors">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-bold text-orange-400">
                        Resume Chat
                      </p>
                      {/*<p className="text-[11px] sm:text-xs text-white/70 mt-0.5 truncate max-w-[180px] sm:max-w-[220px]">
                        {data.lastSessionTitle ?? "Last session"}
                      </p>*/}
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ── Daily Insights ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary" />
            <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-foreground font-semibold">
              Daily Learning Insights
            </p>
          </div>
          <span className="font-mono text-[10px] sm:text-[11px] text-muted-foreground/60">
            {new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[
            {
              label: "Study Tip",
              icon: Zap,
              content: insights?.tip,
              accent: "border-l-blue-500",
              iconBg: "bg-blue-500/10",
              iconColor: "text-blue-500",
            },
            {
              label: "Topic of the Day",
              icon: Target,
              content: insights?.topicOfDay,
              accent: "border-l-purple-500",
              iconBg: "bg-purple-500/10",
              iconColor: "text-purple-500",
            },
            {
              label: "Did You Know?",
              icon: BookOpenText,
              content: insights?.didYouKnow,
              accent: "border-l-green-500",
              iconBg: "bg-green-500/10",
              iconColor: "text-green-500",
            },
            {
              label: streak > 0 ? `${streak}-Day Streak` : "Start Your Streak",
              icon: Flame,
              content: insights?.streakMotivation,
              accent: "border-l-orange-500",
              iconBg: "bg-orange-500/10",
              iconColor: "text-orange-500",
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`group rounded-xl border border-border/40 border-l-4 ${card.accent} bg-card p-4 sm:p-5 flex flex-col gap-3 hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-lg ${card.iconBg} transition-colors group-hover:scale-110`}
                >
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
                <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest font-semibold text-foreground/70">
                  {card.label}
                </p>
              </div>
              {insightsLoading ? (
                <div className="space-y-2">
                  <div
                    className="h-3 w-full rounded bg-muted/50 animate-pulse"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="h-3 w-4/5 rounded bg-muted/50 animate-pulse"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="h-3 w-3/5 rounded bg-muted/50 animate-pulse"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              ) : (
                <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground animate-in fade-in duration-500 slide-in-from-bottom-1">
                  {card.content}
                </p>
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
