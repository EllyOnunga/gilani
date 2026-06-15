import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Flame, Trophy, BookOpen, AlertTriangle, MessageCircle, CalendarDays } from "lucide-react";
import { z } from "zod";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { getErrorMessage, withTimeout } from "@/lib/async";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";

// ─── Types ─────────────────────────────────────────────────────────────────────

type AnalyticsData = {
  attemptsCount: number;
  averageScore: number;
  attemptsHistory: { date: string; score: number }[];
  weakTopics: { name: string; count: number }[];
  subjectMastery: { subject: string; score: number }[];
  streak: number;
  notesCount: number;
  messagesCount: number;
  plansCount: number;
  totalCorrectAnswers: number;
  totalIncorrectAnswers: number;
  totalQuestionsCount: number;
  profile: {
    full_name: string;
    plan: string;
    curriculum: string;
    created_at: string;
  };
};

// ─── Server Functions ──────────────────────────────────────────────────────────

const fetchAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  let authResult;
  try {
    authResult = await authenticateRequest(request);
  } catch (err) {
    throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
  }
  const userId = authResult.userId;

  // Fetch attempts
  const { data: attempts } = await supabaseAdmin
    .from("quiz_attempts")
    .select("score, created_at, weak_topics, quiz_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  // Fetch profile details
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name, plan, curriculum, created_at")
    .eq("id", userId)
    .maybeSingle();

  // Fetch total messages sent
  const { count: messagesCount } = await supabaseAdmin
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Fetch total study plans
  const { count: plansCount } = await supabaseAdmin
    .from("study_plans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const profileData = {
    full_name: profile?.display_name || "Student",
    plan: profile?.plan || "Free",
    curriculum: profile?.curriculum || "KCSE",
    created_at: profile?.created_at || new Date().toISOString(),
  };

  if (!attempts || attempts.length === 0) {
    const { calculateUserStreakAndStats } = await import("@/lib/analytics-utils.server");
    const { streak, notesCount } = await calculateUserStreakAndStats(userId);
    return {
      attemptsCount: 0,
      averageScore: 0,
      attemptsHistory: [],
      weakTopics: [],
      subjectMastery: [],
      streak,
      notesCount,
      messagesCount: messagesCount || 0,
      plansCount: plansCount || 0,
      totalCorrectAnswers: 0,
      totalIncorrectAnswers: 0,
      totalQuestionsCount: 0,
      profile: profileData,
    };
  }

  // 2. Fetch associated quizzes to determine subject and questions count
  const quizIds = attempts.map((a) => a.quiz_id);
  const { data: quizzes } = await supabaseAdmin
    .from("quizzes")
    .select("id, topic, questions")
    .in("id", quizIds);

  const quizTopicMap: Record<string, string> = {};
  const quizLengthMap: Record<string, number> = {};
  if (quizzes) {
    for (const q of quizzes) {
      quizTopicMap[q.id] = q.topic;
      const qList = Array.isArray(q.questions) ? q.questions : [];
      quizLengthMap[q.id] = qList.length || 10;
    }
  }

  // Process attempts count and average
  const attemptsCount = attempts.length;
  let totalScorePercent = 0;
  let totalCorrect = 0;
  let totalQuestions = 0;

  for (const a of attempts) {
    const qLen = quizLengthMap[a.quiz_id] || 10;
    totalCorrect += a.score;
    totalQuestions += qLen;
    totalScorePercent += Math.round((a.score / qLen) * 100);
  }
  const averageScore = attemptsCount > 0 ? Math.round(totalScorePercent / attemptsCount) : 0;

  // History chart data
  const attemptsHistory = attempts.map((a) => {
    const qLen = quizLengthMap[a.quiz_id] || 10;
    return {
      date: new Date(a.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
      score: Math.round((a.score / qLen) * 100),
    };
  });

  // Weak topics aggregation
  const topicCounts: Record<string, number> = {};
  const subjectsMap: Record<string, { totalScore: number; count: number }> = {};

  for (const a of attempts) {
    const topic = quizTopicMap[a.quiz_id] || "General";
    const subject = topic.split(" — ")[0] || "General";
    const qLen = quizLengthMap[a.quiz_id] || 10;
    const percentScore = Math.round((a.score / qLen) * 100);

    // Subject mastery
    if (!subjectsMap[subject]) {
      subjectsMap[subject] = { totalScore: 0, count: 0 };
    }
    subjectsMap[subject].totalScore += percentScore;
    subjectsMap[subject].count += 1;

    // Weak topics
    if (Array.isArray(a.weak_topics)) {
      for (const wt of a.weak_topics as string[]) {
        const cleanWt = wt.length > 30 ? wt.slice(0, 30) + "…" : wt;
        topicCounts[cleanWt] = (topicCounts[cleanWt] || 0) + 1;
      }
    }
  }

  const weakTopics = Object.entries(topicCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const subjectMastery = Object.entries(subjectsMap).map(([subject, data]) => ({
    subject,
    score: Math.round(data.totalScore / data.count),
  }));

  const { calculateUserStreakAndStats } = await import("@/lib/analytics-utils.server");
  const { streak, notesCount } = await calculateUserStreakAndStats(userId);

  return {
    attemptsCount,
    averageScore,
    attemptsHistory,
    weakTopics,
    subjectMastery,
    streak,
    notesCount,
    messagesCount: messagesCount || 0,
    plansCount: plansCount || 0,
    totalCorrectAnswers: totalCorrect,
    totalIncorrectAnswers: Math.max(0, totalQuestions - totalCorrect),
    totalQuestionsCount: totalQuestions,
    profile: profileData,
  };
});

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [{ title: "Analytics — GilaniAI" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AnalyticsPage,
});

// ─── Confetti Engine ───────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
}

const CONFETTI_COLORS = [
  "#d9531e",
  "#f59e0b",
  "#10b981",
  "#6366f1",
  "#ec4899",
  "#3b82f6",
  "#a78bfa",
  "#f97316",
];

function createConfettiParticle(canvasWidth: number): Particle {
  return {
    x: Math.random() * canvasWidth,
    y: -10 - Math.random() * 40,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 6,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 8,
    alpha: 1,
  };
}

function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialised, setInitialised] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const confettiFiredRef = useRef(false);

  const stopConfetti = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    particlesRef.current = [];
  }, []);

  const launchConfetti = useCallback(() => {
    if (confettiFiredRef.current) return;
    confettiFiredRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Spawn 180 particles in bursts over 600ms
    let spawned = 0;
    const spawnInterval = setInterval(() => {
      for (let i = 0; i < 30; i++) {
        particlesRef.current.push(createConfettiParticle(canvas.width));
      }
      spawned += 30;
      if (spawned >= 180) clearInterval(spawnInterval);
    }, 120);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0.05);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.vx += (Math.random() - 0.5) * 0.1; // horizontal drift
        p.rotation += p.rotationSpeed;
        if (p.y > canvas.height * 0.7) {
          p.alpha -= 0.025; // fade out near bottom
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      if (particlesRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        stopConfetti();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // Auto-stop after 3.5 seconds to avoid lingering
    setTimeout(() => {
      clearInterval(spawnInterval);
      stopConfetti();
    }, 3500);
  }, [stopConfetti]);

  // Trigger confetti when streak data arrives
  useEffect(() => {
    if (!data) return;
    const streak = (data as any).streak ?? 0;
    if (streak >= 1) {
      // Small delay so charts can paint first
      const t = setTimeout(launchConfetti, 600);
      return () => clearTimeout(t);
    }
  }, [data, launchConfetti]);

  // Cleanup on unmount
  useEffect(() => () => stopConfetti(), [stopConfetti]);

  const init = async () => {
    if (initialised) return;
    try {
      const authRes = await supabase.auth.getSession();
      const session = authRes?.data?.session;
      if (session) {
        const res = await withTimeout(fetchAnalytics(), 12000, "Analytics request timed out.");
        setData(res);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not load analytics"));
      console.error(err);
    } finally {
      setLoading(false);
      setInitialised(true);
    }
  };

  useEffect(() => {
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 sm:py-32 gap-4">
        <TrendingUp className="h-10 w-10 animate-pulse text-primary" />
        <p className="font-serif text-xl text-muted-foreground">Loading analytics dashboard…</p>
      </div>
    );
  }

  // Fallback default if no history or data exists
  const hasData = data && data.attemptsCount > 0;
  const mockHistory = [
    { date: "May 20", score: 60 },
    { date: "May 21", score: 70 },
    { date: "May 23", score: 65 },
    { date: "May 25", score: 85 },
    { date: "May 27", score: 90 },
  ];
  const mockWeakTopics = [
    { name: "Photosynthesis Dark Stage", count: 4 },
    { name: "Quadratic Equations", count: 3 },
    { name: "Organic Chemistry II", count: 2 },
    { name: "Newton's Second Law", count: 2 },
  ];
  const mockSubjectMastery = [
    { subject: "Mathematics", score: 75 },
    { subject: "Biology", score: 65 },
    { subject: "Chemistry", score: 80 },
    { subject: "Physics", score: 85 },
    { subject: "English", score: 90 },
  ];

  const activeHistory = hasData ? data.attemptsHistory : mockHistory;
  const activeWeakTopics = hasData ? data.weakTopics : mockWeakTopics;
  const activeSubjectMastery = hasData ? data.subjectMastery : mockSubjectMastery;
  const attemptsCount = data ? data.attemptsCount : 0;
  const averageScore = data ? data.averageScore : 0;
  const streak = data ? data.streak : 0;
  const notesCount = data ? data.notesCount : 0;
  const messagesCount = data ? data.messagesCount : 0;
  const plansCount = data ? data.plansCount : 0;
  const totalCorrectAnswers = data ? data.totalCorrectAnswers : 0;
  const totalIncorrectAnswers = data ? data.totalIncorrectAnswers : 0;
  const totalQuestionsCount = data ? data.totalQuestionsCount : 0;
  const profile = data ? data.profile : {
    full_name: "Student",
    plan: "Free",
    curriculum: "KCSE",
    created_at: new Date().toISOString(),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-3 sm:p-6 lg:p-10">
      {/* Confetti canvas — fixed, full-screen, pointer-events-none */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 z-50 pointer-events-none"
        style={{ width: "100vw", height: "100vh" }}
      />
      {/* Header & Student Profile Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center border-b border-border/40 pb-6 animate-in-slide">
        <div className="md:col-span-7 space-y-2 text-center md:text-left">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary flex items-center justify-center md:justify-start gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> Analytics
          </p>
          <h2 className="font-serif text-xl sm:text-3xl lg:text-5xl font-black">Performance Insights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed text-center md:text-left">
            Track your learning trajectory, practice quiz performance, and mastery levels across all subjects.
          </p>
        </div>
        
        {/* Student Profile Card */}
        <div className="md:col-span-5 rounded-2xl border border-border bg-card/60 backdrop-blur-md p-4 sm:p-5 shadow-sm flex items-center gap-4 transition-all duration-300 hover:border-primary/30">
          <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center text-primary-foreground font-serif text-lg font-black shadow-md shrink-0 select-none">
            {profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-serif font-bold text-base text-foreground truncate">{profile.full_name}</h3>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
              <span className="rounded-full bg-primary/10 text-primary px-1.5 py-px border border-primary/20 uppercase tracking-wide">
                {profile.plan}
              </span>
            </div>
            <p className="font-mono text-[9px] text-muted-foreground/85 leading-tight">
              Member since: {new Date(profile.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {!hasData && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Viewing demonstration analytics</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed mt-0.5">
              You haven't completed enough practice quizzes yet. Take a few practice quizzes to populate your real-time academic dashboard.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 animate-in-slide">
        {[
          {
            label: "Quizzes Completed",
            value: attemptsCount,
            icon: Trophy,
            desc: "Total attempts",
          },
          {
            label: "Average Accuracy",
            value: `${averageScore}%`,
            icon: BarChart3,
            desc: "Concept mastery",
          },
          {
            label: "Study Streak",
            value: `${streak} Day${streak === 1 ? "" : "s"}`,
            icon: Flame,
            desc: "Consecutive active",
            highlight: true,
          },
          {
            label: "Notes Uploaded",
            value: `${notesCount}`,
            icon: BookOpen,
            desc: "Syllabus resources",
          },
          {
            label: "Tutor Chats",
            value: `${messagesCount}`,
            icon: MessageCircle,
            desc: "AI conversations",
          },
          {
            label: "Schedules Built",
            value: `${plansCount}`,
            icon: CalendarDays,
            desc: "Revision plans",
          },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl p-3.5 sm:p-5 flex flex-col justify-between min-h-[90px] sm:min-h-[120px] transition-all duration-300 hover:scale-[1.01] ${c.highlight ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-850 shadow-sm shadow-amber-500/5" : "bg-secondary border border-border/40 bg-secondary/50"}`}>
            <div className="flex items-center justify-between gap-1 mb-2">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground truncate">
                {c.label}
              </p>
              <c.icon className={`h-4 w-4 shrink-0 ${c.highlight ? "text-amber-600 dark:text-amber-400" : "text-primary/70"}`} />
            </div>
            <div>
              <p className={`font-serif text-2xl sm:text-3xl font-black leading-none tracking-tight ${c.highlight ? "text-amber-800 dark:text-amber-300" : ""}`}>{c.value}</p>
              <p className="mt-2 font-mono text-[9px] sm:text-[10px] text-muted-foreground uppercase leading-none">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* area progress chart */}
        <div className="lg:col-span-8 rounded-xl border border-border bg-card p-3 sm:p-5 lg:p-7 flex flex-col justify-between relative overflow-hidden">
          {!hasData && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1.5px] flex flex-col items-center justify-center z-10 p-4 text-center">
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Demo Mode
              </span>
              <p className="mt-2 text-xs font-semibold text-foreground">No Quiz Attempts Yet</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground max-w-[200px]">
                Complete your first practice quiz to see your real progress chart.
              </p>
            </div>
          )}
          <div className="mb-4">
            <h3 className="font-serif text-xl">Revision Progress Over Time</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Average score percentages for recent quizzes.
            </p>
          </div>
          <div className="h-[220px] sm:h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(22, 75%, 48%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(22, 75%, 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" fontStyle="italic" style={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} style={{ fontSize: 10 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(22, 75%, 48%)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#scoreColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* radar subject mastery */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-card p-3 sm:p-5 lg:p-7 flex flex-col justify-between relative overflow-hidden">
          {!hasData && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1.5px] flex flex-col items-center justify-center z-10 p-4 text-center">
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Demo Mode
              </span>
              <p className="mt-2 text-xs font-semibold text-foreground">Mastery Profile Locked</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground max-w-[180px]">
                We need quiz attempts across different subjects to map your mastery.
              </p>
            </div>
          )}
          <div className="mb-4">
            <h3 className="font-serif text-xl">Subject Mastery</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Strengths across different subject areas.
            </p>
          </div>
          <div className="h-[240px] sm:h-[280px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={activeSubjectMastery}>
                <PolarGrid stroke="rgba(0,0,0,0.08)" />
                <PolarAngleAxis dataKey="subject" style={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} style={{ fontSize: 8 }} />
                <Radar
                  name="Mastery"
                  dataKey="score"
                  stroke="hsl(22, 75%, 48%)"
                  fill="hsl(22, 75%, 48%)"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* weak topics bar chart */}
        <div className="lg:col-span-6 rounded-xl border border-border bg-card p-3 sm:p-5 lg:p-7 relative overflow-hidden">
          {!hasData && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1.5px] flex flex-col items-center justify-center z-10 p-4 text-center">
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Demo Mode
              </span>
              <p className="mt-2 text-xs font-semibold text-foreground">Syllabus Weak Spots</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground max-w-[300px]">
                Your incorrect answers will be categorized here to target your study.
              </p>
            </div>
          )}
          <div className="mb-6">
            <h3 className="font-serif text-xl">Syllabus Weak Topics</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Specific concepts with most incorrect answers during quizzes.
            </p>
          </div>
          {activeWeakTopics.length === 0 ? (
            <div className="flex items-center justify-center py-5 sm:py-8 font-serif text-muted-foreground text-sm">
              No weak topics found yet — perfect score record!
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-3 lg:gap-4">
              {(() => {
                const max = Math.max(...activeWeakTopics.map((t) => t.count), 1);
                return activeWeakTopics.map((t) => (
                  <div key={t.name} className="flex items-center gap-3">
                    <span className="w-24 sm:w-32 shrink-0 truncate font-mono text-[11px] text-muted-foreground" title={t.name}>
                      {t.name}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${Math.round((t.count / max) * 100)}%` }}
                      />
                    </div>
                    <span className="w-4 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                      {t.count}
                    </span>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Practice Accuracy Breakdown */}
        <div className="lg:col-span-6 rounded-xl border border-border bg-card p-3 sm:p-5 lg:p-7 relative overflow-hidden flex flex-col justify-between">
          {!hasData && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1.5px] flex flex-col items-center justify-center z-10 p-4 text-center">
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Demo Mode
              </span>
              <p className="mt-2 text-xs font-semibold text-foreground">Accuracy Locked</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground max-w-[200px]">
                Complete quizzes to analyze correct vs incorrect question distributions.
              </p>
            </div>
          )}
          <div>
            <h3 className="font-serif text-xl">Practice Question Accuracy</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Distribution of correct vs incorrect answers across all quiz attempts.
            </p>
          </div>

          <div className="my-4 space-y-3">
            {/* Accuracy Summary */}
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <p className="font-serif text-2xl sm:text-3xl font-black text-foreground">
                  {totalQuestionsCount > 0 ? Math.round((totalCorrectAnswers / totalQuestionsCount) * 100) : 0}%
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">Overall Accuracy Rate</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold text-foreground">{totalQuestionsCount}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">Total Attempted</p>
              </div>
            </div>

            {/* Progress Bar Distribution */}
            <div className="space-y-3">
              {/* Correct Answers Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono font-medium">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" /> Correct Answers
                  </span>
                  <span className="text-muted-foreground">
                    {totalCorrectAnswers} ({totalQuestionsCount > 0 ? Math.round((totalCorrectAnswers / totalQuestionsCount) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${totalQuestionsCount > 0 ? Math.round((totalCorrectAnswers / totalQuestionsCount) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Incorrect Answers Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono font-medium">
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" /> Incorrect Answers
                  </span>
                  <span className="text-muted-foreground">
                    {totalIncorrectAnswers} ({totalQuestionsCount > 0 ? Math.round((totalIncorrectAnswers / totalQuestionsCount) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all duration-500"
                    style={{ width: `${totalQuestionsCount > 0 ? Math.round((totalIncorrectAnswers / totalQuestionsCount) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground/80 leading-normal bg-secondary/50 rounded-lg p-2.5 border border-border/30">
            💡 <strong>Study Tip:</strong> Focus on weak topics to turn red bars green. Use note summaries to review.
          </div>
        </div>
      </div>
    </div>
  );
}
