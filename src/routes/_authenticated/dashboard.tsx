import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — GolaniAI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const name = (user?.user_metadata?.display_name as string) || user?.email?.split("@")[0] || "Student";

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8 lg:p-12">
      <header className="animate-in-slide flex items-end justify-between">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Dashboard</p>
          <h2 className="mt-1 max-w-2xl font-serif text-4xl text-balance">
            Habari, <span className="capitalize">{name}</span>. Ready to study?
          </h2>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">Streak</p>
            <p className="font-serif text-2xl leading-none">0 days</p>
          </div>
          <div className="border-l border-border pl-4 text-right">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">Next exam</p>
            <p className="font-serif text-2xl leading-none">—</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Link
          to="/tutor"
          className="animate-in-slide group lg:col-span-8 flex flex-col justify-between rounded-xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Start a session
            </p>
            <h3 className="mt-2 font-serif text-2xl">Ask the AI tutor</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Curriculum-grounded explanations, with a teacher one click away if anything feels off.
            </p>
          </div>
          <span className="mt-6 inline-flex items-center text-sm font-medium text-primary">
            Open tutor →
          </span>
        </Link>

        <div className="lg:col-span-4 space-y-6">
          <Link to="/notes" className="block rounded-xl border border-border bg-card p-5 hover:bg-accent">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Notes</p>
            <p className="mt-2 font-serif text-lg">Upload & summarize</p>
          </Link>
          <Link to="/quizzes" className="block rounded-xl border border-border bg-card p-5 hover:bg-accent">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Practice</p>
            <p className="mt-2 font-serif text-lg">Generate a quiz</p>
          </Link>
          <Link to="/planner" className="block rounded-xl border border-dashed border-border p-5 hover:bg-accent">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Plan</p>
            <p className="mt-2 font-serif text-lg">Build a study plan</p>
          </Link>
        </div>
      </div>

      <p className="font-mono text-[11px] text-muted-foreground">
        Notes, quizzes, planner, analytics, and teacher escalations are coming online next.
      </p>
    </div>
  );
}
