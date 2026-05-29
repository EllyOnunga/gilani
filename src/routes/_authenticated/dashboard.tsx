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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";


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
  head: () => ({ meta: [{ title: "GilaniAI" }] }),
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
      const authRes = await supabase.auth.getSession();
      const session = authRes?.data?.session;
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

  useEffect(() => { init(); }, []);

  const streak = data?.streak ?? 0;
  const quizzesCompleted = data?.quizzesCompleted ?? 0;
  const weakTopics = data?.weakTopics ?? [];
  const plannerTasks = data?.plannerTasks ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8 lg:p-12 lg:space-y-12">
      {/* Welcome Header */}
      <header className="animate-in-slide flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Dashboard</p>
          <h2 className="mt-1 max-w-2xl font-serif text-3xl sm:text-4xl text-balance">
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

      {/* Study Suite Carousel */}
      <section className="animate-in-slide [animation-delay:50ms] w-full">
        <Carousel
          opts={{ align: "start" }}
          className="w-full relative"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-serif text-2xl font-semibold">Your Study Suite</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Explore curriculum tools and practice systems</p>
            </div>
            <div className="flex gap-2">
              <CarouselPrevious className="static translate-y-0 h-9 w-9 border-border/80 bg-background/50 hover:bg-background" />
              <CarouselNext className="static translate-y-0 h-9 w-9 border-border/80 bg-background/50 hover:bg-background" />
            </div>
          </div>

          <CarouselContent className="-ml-4">
            {[
              {
                title: "Socratic AI Tutor",
                description: "Curriculum-grounded Socratic explanations & direct teacher escalations.",
                icon: MessageCircle,
                to: "/tutor",
                accent: "from-blue-500/20 to-indigo-500/10 text-blue-600 dark:text-blue-400",
                cta: "Start a session",
              },
              {
                title: "Study Notes",
                description: "Upload and summarize your notes, generating key concepts and terms.",
                icon: BookOpenText,
                to: "/notes",
                accent: "from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400",
                cta: "Summarise notes",
              },
              {
                title: "Mock Quizzes",
                description: "Generate customized practice tests tuned to your weak subject topics.",
                icon: ListChecks,
                to: "/quizzes",
                accent: "from-orange-500/20 to-red-500/10 text-orange-600 dark:text-orange-400",
                cta: "Take a quiz",
              },
              {
                title: "Syllabus Planner",
                description: "Create personalized study schedules and keep track of daily revision.",
                icon: CalendarDays,
                to: "/planner",
                accent: "from-violet-500/20 to-purple-500/10 text-violet-600 dark:text-violet-400",
                cta: "Manage calendar",
              },
              {
                title: "Performance Analytics",
                description: "Track mastery score progress, daily streaks, and flagged focus items.",
                icon: BarChart3,
                to: "/analytics",
                accent: "from-pink-500/20 to-rose-500/10 text-pink-600 dark:text-pink-400",
                cta: "View progress",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <CarouselItem key={idx} className="pl-4 basis-full sm:basis-1/2 md:basis-1/3 animate-in-slide">
                  <Link
                    to={item.to as any}
                    className="group block h-full rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/50 hover:scale-[1.01] flex flex-col justify-between"
                  >
                    <div>
                      <div className={`p-3 rounded-lg w-fit bg-gradient-to-br ${item.accent} transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h4 className="mt-4 font-serif text-lg font-bold group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {item.title}
                        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </h4>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground min-h-[48px]">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
                      <span className="text-[11px] font-mono uppercase tracking-widest text-primary font-bold">
                        {item.cta}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        0{idx + 1}
                      </span>
                    </div>
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </section>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 animate-in-slide [animation-delay:100ms]">
        {/* Dynamic Study Plan Widget */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
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
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
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
