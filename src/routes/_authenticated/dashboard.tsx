import { useState } from "react";
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
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type DashboardData = {
  streak: number;
  quizzesCompleted: number;
  weakTopics: string[];
  plannerTasks: { subject: string; task: string; duration: string }[];
};

// ─── Server Functions ──────────────────────────────────────────────────────────

const loadDashboardData = createServerFn({ method: "GET" })
  .inputValidator(z.string())
  .handler(async ({ data: userId }) => {
    // 1. Fetch quiz attempts to get completed count and weak topics
    const { data: attempts } = await supabaseAdmin
      .from("quiz_attempts")
      .select("weak_topics")
      .eq("user_id", userId);

    const quizCount = attempts?.length ?? 0;
    const weakSet = new Set<string>();
    if (attempts) {
      for (const a of attempts) {
        if (Array.isArray(a.weak_topics)) {
          for (const wt of a.weak_topics as string[]) {
            weakSet.add(wt.length > 28 ? wt.slice(0, 28) + "…" : wt);
          }
        }
      }
    }

    // 2. Fetch the latest study plan
    const { data: plan } = await supabaseAdmin
      .from("study_plans")
      .select("items")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let plannerTasks: { subject: string; task: string; duration: string }[] = [];
    if (plan && Array.isArray(plan.items)) {
      plannerTasks = (plan.items as any[]).slice(0, 3).map((item) => ({
        subject: item.subject || "Study Session",
        task: item.task || "Revision",
        duration: item.duration || "45 min",
      }));
    }

    return {
      streak: quizCount > 0 ? 3 : 0, // simple streak simulation based on active use
      quizzesCompleted: quizCount,
      weakTopics: Array.from(weakSet).slice(0, 4),
      plannerTasks,
    };
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — GilaniAI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const name = (user?.user_metadata?.display_name as string) || user?.email?.split("@")[0] || "Student";

  const [data, setData] = useState<DashboardData | null>(null);
  const [initialised, setInitialised] = useState(false);

  const init = async () => {
    if (initialised) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const res = await loadDashboardData({ data: session.user.id });
        setData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInitialised(true);
    }
  };

  useState(() => { init(); });

  const streak = data?.streak ?? 0;
  const quizzesCompleted = data?.quizzesCompleted ?? 0;
  const weakTopics = data?.weakTopics ?? [];
  const plannerTasks = data?.plannerTasks ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8 lg:p-12">
      {/* Welcome Header */}
      <header className="animate-in-slide flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Dashboard</p>
          <h2 className="mt-1 max-w-2xl font-serif text-4xl text-balance">
            Habari, <span className="capitalize">{name}</span>. Ready to study?
          </h2>
        </div>
        <div className="flex gap-4">
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Core CTA */}
        <Link
          to="/tutor"
          className="animate-in-slide group lg:col-span-8 flex flex-col justify-between rounded-xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Start a session
            </p>
            <h3 className="mt-2 font-serif text-2xl group-hover:text-primary transition-colors flex items-center gap-2">
              Ask the AI tutor <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Curriculum-grounded Socratic explanations, with direct teacher escalations if anything feels complex or distress keywords are found.
            </p>
          </div>
          <span className="mt-6 inline-flex items-center text-sm font-semibold text-primary">
            Open tutor chat →
          </span>
        </Link>

        {/* Quick Nav cards */}
        <div className="lg:col-span-4 space-y-6">
          <Link to="/notes" className="group block rounded-xl border border-border bg-card p-5 hover:bg-accent transition-all">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <BookOpenText className="h-3.5 w-3.5 text-primary" /> Notes
            </p>
            <p className="mt-2 font-serif text-lg group-hover:text-primary transition-colors">Upload &amp; Summarise</p>
          </Link>
          <Link to="/quizzes" className="group block rounded-xl border border-border bg-card p-5 hover:bg-accent transition-all">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5 text-primary" /> Practice
            </p>
            <p className="mt-2 font-serif text-lg group-hover:text-primary transition-colors">Generate a Mock Quiz</p>
          </Link>
          <Link to="/planner" className="group block rounded-xl border border-dashed border-border p-5 hover:bg-accent transition-all">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-primary" /> Plan
            </p>
            <p className="mt-2 font-serif text-lg group-hover:text-primary transition-colors">Build Personal Planner</p>
          </Link>
        </div>

        {/* Dynamic Study Plan Widget */}
        <div className="lg:col-span-6 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recent Planner Tasks</p>
            <h3 className="font-serif text-xl mt-2 mb-4">Today's Schedule</h3>

            {plannerTasks.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground italic">
                No active planner tasks. Generate a study plan to start organizing your week.
              </div>
            ) : (
              <div className="space-y-3">
                {plannerTasks.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50">
                    <CheckCircle2 className="h-4.5 w-4.5 text-muted-foreground/60 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">{t.subject}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{t.task}</p>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{t.duration}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {plannerTasks.length > 0 && (
            <Link to="/planner" className="text-xs font-semibold text-primary mt-4 inline-block hover:underline">
              View full calendar plan →
            </Link>
          )}
        </div>

        {/* Weak Topics / Mastery Widget */}
        <div className="lg:col-span-6 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Focus Concepts</p>
            <h3 className="font-serif text-xl mt-2 mb-4">Target Revision</h3>

            {weakTopics.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground italic flex flex-col items-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground/50" />
                No weak topics flagged yet. Excellent job!
              </div>
            ) : (
              <div className="space-y-2">
                {weakTopics.map((topic, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-red-100 bg-red-50/50">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-xs text-red-800 font-medium truncate">{topic}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {weakTopics.length > 0 && (
            <Link to="/analytics" className="text-xs font-semibold text-primary mt-4 inline-block hover:underline">
              View detailed performance analytics →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
