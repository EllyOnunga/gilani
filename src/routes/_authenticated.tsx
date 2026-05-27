import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  MessageCircle, BookOpenText, ListChecks, CalendarDays, BarChart3,
  ShieldAlert, LogOut, GraduationCap, Settings,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AuthedShell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: GraduationCap },
  { to: "/tutor", label: "Tutor Chat", icon: MessageCircle },
  { to: "/notes", label: "Study Notes", icon: BookOpenText },
  { to: "/quizzes", label: "Mock Quizzes", icon: ListChecks },
  { to: "/planner", label: "Planner", icon: CalendarDays },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

function AuthedShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { roles, user } = useAuth();
  const navigate = useNavigate();

  const isTeacher = roles.includes("teacher") || roles.includes("admin");
  const isAdmin = roles.includes("admin");

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-border bg-sidebar p-6">
        <Link to="/dashboard" className="mb-10 block">
          <h1 className="font-serif text-2xl font-bold italic tracking-tight text-primary">GolaniAI</h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Ethical Learning / KCSE-CBC
          </p>
        </Link>

        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = path === to || path.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-black/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          {isTeacher && (
            <>
              <div className="mt-6 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Teacher
              </div>
              <Link to="/teacher/escalations" className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${path.startsWith("/teacher/escalations") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-black/5"}`}>
                <ShieldAlert className="h-4 w-4" /> Escalations
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <div className="mt-6 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Admin
              </div>
              <Link to="/admin/users" className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${path.startsWith("/admin") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-black/5"}`}>
                <Settings className="h-4 w-4" /> Users & Roles
              </Link>
            </>
          )}
        </nav>

        <div className="mt-auto space-y-3 border-t border-border pt-6">
          <div className="rounded-lg border border-border/50 bg-card p-3">
            <p className="font-mono text-[11px] text-muted-foreground">REACH A TEACHER</p>
            <p className="mt-2 text-xs leading-relaxed text-pretty">
              Stuck or uncomfortable? Request a human review.
            </p>
            <Link
              to="/tutor"
              className="mt-3 block w-full rounded bg-foreground py-2 text-center text-[11px] font-bold uppercase tracking-wider text-background hover:bg-foreground/90"
            >
              Escalate now
            </Link>
          </div>
          <div className="flex items-center justify-between px-1">
            <p className="truncate text-xs text-muted-foreground" title={user?.email ?? ""}>
              {user?.email}
            </p>
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
