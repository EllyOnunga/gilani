import { useState } from "react";
import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  MessageCircle, BookOpenText, ListChecks, CalendarDays, BarChart3,
  ShieldAlert, LogOut, GraduationCap, Settings, Menu, X,
} from "lucide-react";
import { toast } from "sonner";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth";

const requireAuth = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try {
    const auth = await authenticateRequest(request);
    return { authenticated: true };
  } catch {
    return { authenticated: false };
  }
});

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    // For SSR: check auth via request header; for client: check via useAuth hook
    if (typeof window === "undefined") {
      // Server-side check
      const { authenticated } = await requireAuth();
      if (!authenticated) {
        throw redirect({ to: "/login", search: { redirect: location.href } });
      }
    }
  },
  component: AuthedShell,
});

const NAV = [
  { to: "/dashboard" as any, label: "Dashboard", icon: GraduationCap },
  { to: "/tutor" as any, label: "Tutor Chat", icon: MessageCircle },
  { to: "/notes" as any, label: "Study Notes", icon: BookOpenText },
  { to: "/quizzes" as any, label: "Mock Quizzes", icon: ListChecks },
  { to: "/planner" as any, label: "Planner", icon: CalendarDays },
  { to: "/analytics" as any, label: "Analytics", icon: BarChart3 },
] as const;

function AuthedShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { roles, user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isTeacher = roles.includes("teacher") || roles.includes("admin");
  const isAdmin = roles.includes("admin");

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-background text-foreground">
      {/* Mobile Top Navigation Header */}
      <header className="flex h-16 w-full items-center justify-between border-b border-border bg-sidebar px-4 lg:hidden sticky top-0 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
          title="Open Menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link to="/dashboard" className="text-center">
          <h1 className="font-serif text-xl font-bold italic tracking-tight text-primary">GilaniAI</h1>
        </Link>
        <button
          onClick={signOut}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Sidebar Backdrop Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Responsive Aside Navigation Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-sidebar p-6 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand logo & Mobile Close Button */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/dashboard" onClick={() => setSidebarOpen(false)} className="block">
            <h1 className="font-serif text-2xl font-bold italic tracking-tight text-primary">GilaniAI</h1>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Ethical Learning / KCSE-CBC
            </p>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-black/5 lg:hidden"
            title="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = path === to || path.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
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
              <Link
                to={"/teacher/escalations" as any}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  path.startsWith("/teacher/escalations")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-black/5"
                }`}
              >
                <ShieldAlert className="h-4 w-4" /> Escalations
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <div className="mt-6 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Admin
              </div>
              <Link
                to={"/admin/users" as any}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  path.startsWith("/admin") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-black/5"
                }`}
              >
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
              onClick={() => setSidebarOpen(false)}
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

