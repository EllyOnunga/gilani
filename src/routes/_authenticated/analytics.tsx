import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Calendar, Trophy, BookOpen, AlertTriangle } from "lucide-react";
import { z } from "zod";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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

// ─── Types ─────────────────────────────────────────────────────────────────────

type AnalyticsData = {
  attemptsCount: number;
  averageScore: number;
  attemptsHistory: { date: string; score: number }[];
  weakTopics: { name: string; count: number }[];
  subjectMastery: { subject: string; score: number }[];
};

// ─── Server Functions ──────────────────────────────────────────────────────────

const fetchAnalytics = createServerFn({ method: "GET" })
  .inputValidator(z.string())
  .handler(async ({ data: userId }) => {
    // 1. Fetch attempts
    const { data: attempts } = await supabaseAdmin
      .from("quiz_attempts")
      .select("score, created_at, weak_topics, quiz_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (!attempts || attempts.length === 0) {
      const { calculateUserStreakAndStats } = await import("@/lib/analytics-utils");
      const { streak, notesCount } = await calculateUserStreakAndStats(userId);
      return {
        attemptsCount: 0,
        averageScore: 0,
        attemptsHistory: [],
        weakTopics: [],
        subjectMastery: [],
        streak,
        notesCount,
      };
    }

    // 2. Fetch associated quizzes to determine subject
    const quizIds = attempts.map((a) => a.quiz_id);
    const { data: quizzes } = await supabaseAdmin
      .from("quizzes")
      .select("id, topic")
      .in("id", quizIds);

    const quizTopicMap: Record<string, string> = {};
    if (quizzes) {
      for (const q of quizzes) quizTopicMap[q.id] = q.topic;
    }

    // Process attempts count and average
    const attemptsCount = attempts.length;
    const averageScore = Math.round(
      (attempts.reduce((sum, a) => sum + a.score, 0) / (attemptsCount * 10)) * 100,
    ); // Assuming 10 questions per quiz

    // History chart data
    const attemptsHistory = attempts.map((a) => ({
      date: new Date(a.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
      score: Math.round((a.score / 10) * 100),
    }));

    // Weak topics aggregation
    const topicCounts: Record<string, number> = {};
    const subjectsMap: Record<string, { totalScore: number; count: number }> = {};

    for (const a of attempts) {
      const topic = quizTopicMap[a.quiz_id] || "General";
      const subject = topic.split(" — ")[0] || "General";

      // Subject mastery
      if (!subjectsMap[subject]) {
        subjectsMap[subject] = { totalScore: 0, count: 0 };
      }
      subjectsMap[subject].totalScore += Math.round((a.score / 10) * 100);
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

    const { calculateUserStreakAndStats } = await import("@/lib/analytics-utils");
    const { streak, notesCount } = await calculateUserStreakAndStats(userId);

    return {
      attemptsCount,
      averageScore,
      attemptsHistory,
      weakTopics,
      subjectMastery,
      streak,
      notesCount,
    };
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — GilaniAI" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialised, setInitialised] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const init = async () => {
    if (initialised) return;
    try {
      const authRes = await supabase.auth.getSession();
      const session = authRes?.data?.session;
      if (session) {
        const res = await withTimeout(
          fetchAnalytics({ data: session.user.id }),
          12000,
          "Analytics request timed out.",
        );
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
      <div className="flex flex-col items-center justify-center h-full py-40 gap-4">
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
  const attemptsCount = hasData ? data.attemptsCount : 5;
  const averageScore = hasData ? data.averageScore : 78;
  const streak = data ? (data as any).streak : 3;
  const notesCount = data ? (data as any).notesCount : 4;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8 lg:p-12">
      {/* Header */}
      <header className="animate-in-slide">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          Analytics
        </p>
        <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Performance Insights</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Track your learning trajectory, practice quiz performance, and mastery levels across syllabus
          subjects.
        </p>
      </header>

      {!hasData && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-800">Viewing Demonstration Analytics</p>
            <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
              You haven't completed enough practice quizzes yet. Take a few quizzes under **Practice
              Quizzes** to populate your real-time academic dashboard.
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
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in-slide">
        {[
          {
            label: "Quizzes Completed",
            value: attemptsCount,
            icon: Trophy,
            desc: "Total attempts",
          },
          {
            label: "Average Score",
            value: `${averageScore}%`,
            icon: BarChart3,
            desc: "Concept mastery",
          },
          { label: "Study Streak", value: `${streak} Day${streak === 1 ? "" : "s"}`, icon: Calendar, desc: "Active consistency" },
          { label: "Notes Uploaded", value: `${notesCount} Note${notesCount === 1 ? "" : "s"}`, icon: BookOpen, desc: "Syllabus grounding" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {c.label}
              </p>
              <c.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="font-serif text-3xl font-bold leading-none">{c.value}</p>
            <p className="mt-2 font-mono text-[9px] text-muted-foreground uppercase">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Chart Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* area progress chart */}
        <div className="lg:col-span-8 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-serif text-xl">Revision Progress Over Time</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Average score percentages for recent quizzes.
            </p>
          </div>
          <div className="h-[280px] w-full">
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
        <div className="lg:col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-serif text-xl">Subject Mastery</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Strengths across different syllabus branches.
            </p>
          </div>
          <div className="h-[280px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={activeSubjectMastery}>
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
        <div className="lg:col-span-12 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="font-serif text-xl">Syllabus Weak Topics</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Specific concepts with most incorrect answers during quizzes.
            </p>
          </div>
          <div className="h-[240px] w-full">
            {activeWeakTopics.length === 0 ? (
              <div className="h-full flex items-center justify-center font-serif text-muted-foreground text-sm">
                No weak topics found yet. Perfect score record!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeWeakTopics}
                  layout="vertical"
                  margin={{ top: 0, right: 10, left: 40, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="rgba(0,0,0,0.06)"
                  />
                  <XAxis type="number" style={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" style={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="hsl(22, 75%, 48%)"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
