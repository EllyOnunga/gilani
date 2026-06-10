import { useEffect, useState, useRef } from "react";
import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  MessageCircle,
  BookOpenText,
  ListChecks,
  CalendarDays,
  BarChart3,
  ShieldAlert,
  LogOut,
  GraduationCap,
  Settings,
  Menu,
  X,
  Smartphone,
  Users,
  Mail,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { NotificationBell } from "@/components/notifications";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { Logo } from "@/components/ui/logo";
import { GilaniLoader } from "@/components/GilaniLoader";
import { Breadcrumb } from "@/components/Breadcrumb";

const requireAuth = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const authHeader = request.headers.get("authorization");
  // Browser navigations usually rely on persisted client auth state/cookies and do not
  // include a Bearer header on document requests. Avoid false SSR redirects in that case.
  if (!authHeader?.startsWith("Bearer ")) {
    return { authenticated: null as boolean | null };
  }
  try {
    await authenticateRequest(request);
    return { authenticated: true };
  } catch {
    return { authenticated: false };
  }
});

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    // SSR can only validate when a Bearer token is explicitly present.
    // Client-side auth hook handles normal browser navigations.
    if (typeof window === "undefined") {
      const { authenticated } = await requireAuth();
      if (authenticated === false) {
        throw redirect({ to: "/login", search: { redirect: location.href } });
      }
    }
  },
  component: AuthedShell,
});

const STUDENT_NAV = [
  { to: "/dashboard" as any, label: "Dashboard", icon: GraduationCap },
  { to: "/tutor" as any, label: "Tutor Chat", icon: MessageCircle },
  { to: "/notes" as any, label: "Study Notes", icon: BookOpenText },
  { to: "/quizzes" as any, label: "Practice Quizzes", icon: ListChecks },
  { to: "/planner" as any, label: "Planner", icon: CalendarDays },
  { to: "/analytics" as any, label: "Analytics", icon: BarChart3 },
  { to: "/settings" as any, label: "Settings", icon: Settings },
] as const;

function AuthedShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { roles, user, loading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });
  const [pwaInstallable, setPwaInstallable] = useState(false);

  // Listen for PWA install events dispatched from __root.tsx
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onInstallable = () => setPwaInstallable(true);
    const onInstalled = () => setPwaInstallable(false);

    // In case the event already fired before this component mounted
    if ((window as any).__pwaInstallPrompt) setPwaInstallable(true);

    window.addEventListener("custom:pwa-installable", onInstallable);
    window.addEventListener("custom:pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("custom:pwa-installable", onInstallable);
      window.removeEventListener("custom:pwa-installed", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: window.location.href } });
      return;
    }
    if (roles.length === 0) return; // wait for roles to load

    const isAdmin = roles.includes("admin");
    const isTeacher = roles.includes("teacher");
    const isStudent = !isAdmin && !isTeacher;

    const studentOnlyPaths = [
      "/dashboard",
      "/notes",
      "/quizzes",
      "/planner",
      "/analytics",
      "/tutor",
    ];
    const isOnStudentRoute = studentOnlyPaths.some((p) => path === p || path.startsWith(p + "/"));

    if (isAdmin) {
      if (isOnStudentRoute) navigate({ to: "/admin/users" as any });
      return;
    }

    if (isTeacher) {
      if (isOnStudentRoute) navigate({ to: "/teacher/escalations" as any });
      return;
    }

    if (isStudent) {
      if (path.startsWith("/admin") || path.startsWith("/teacher")) {
        navigate({ to: "/dashboard" as any });
      }
    }
  }, [loading, user, roles, path, navigate]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme");
      if (!storedTheme) {
        localStorage.setItem("theme", "dark");
        document.documentElement.classList.add("dark");
        setIsDark(true);
      } else {
        const hasDark = storedTheme === "dark";
        document.documentElement.classList.toggle("dark", hasDark);
        setIsDark(hasDark);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldLock = sidebarOpen;
    document.body.style.overflow = shouldLock ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", nextDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", nextDark);
      toast.success(nextDark ? "Dark theme active 🌙" : "Light theme active ☀️", {
        duration: 1500,
      });
    }
  };

  if (loading) {
    return <GilaniLoader />;
  }

  if (!user) {
    return <GilaniLoader />;
  }
  if (roles.length === 0) {
    return <GilaniLoader />;
  }

  // Prevent rendering student content for admin/teacher before redirect fires
  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("teacher") && !roles.includes("admin");
  const studentOnlyPaths2 = [
    "/dashboard",
    "/notes",
    "/quizzes",
    "/planner",
    "/analytics",
    "/tutor",
  ];
  const isOnStudentRoute2 = studentOnlyPaths2.some((p) => path === p || path.startsWith(p + "/"));
  if ((isAdmin || isTeacher) && isOnStudentRoute2) {
    return <GilaniLoader />;
  }

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden lg:flex-row bg-background text-foreground">
      {/* Disclaimer Modal - shows once on first visit */}
      <DisclaimerModal />

      {/* Mobile Top Navigation Header */}
      <header className="flex h-16 w-full items-center justify-between border-b border-border bg-sidebar px-4 lg:hidden sticky top-0 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
          title="Open Menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex-1 flex justify-start">
          <Logo to="/dashboard" size="sm" />
        </div>
        <NotificationBell userId={user.id} />
      </header>
      {/* Disclaimer Banner - dismissible warning */}

      {/* Sidebar Backdrop Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Responsive Aside Navigation Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-sidebar p-6 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen overflow-hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand logo & Mobile Close Button */}
        <div className="flex items-center justify-between mb-8 min-w-0">
          <div className="block min-w-0 flex-1">
            <Logo to="/dashboard" onClick={() => setSidebarOpen(false)} size="md" />
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground pl-[38px]">
              Ethical Learning
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-black/5 lg:hidden flex-shrink-0 ml-2"
            title="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto min-h-0">
          {!isTeacher &&
            !isAdmin &&
            STUDENT_NAV.map(({ to, label, icon: Icon }) => {
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
              <Link
                to={"/settings" as any}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${path === "/settings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-black/5"}`}
              >
                <Settings className="h-4 w-4" /> Settings
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
                  path.startsWith("/admin")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-black/5"
                }`}
              >
                <Users className="h-4 w-4" /> Users & Roles
              </Link>
              <Link
                to={"/settings" as any}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${path === "/settings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-black/5"}`}
              >
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </>
          )}
        </nav>

        <div className="mt-auto space-y-3 border-t border-border pt-6">
          {/* PWA Install Button */}
          {pwaInstallable && (
            <button
              id="pwa-install-btn"
              onClick={async () => {
                const prompt = (window as any).__pwaInstallPrompt;
                if (!prompt) return;
                prompt.prompt();
                const { outcome } = await prompt.userChoice;
                if (outcome === "accepted") {
                  setPwaInstallable(false);
                  (window as any).__pwaInstallPrompt = null;
                }
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/20 hover:border-primary/60 transition-all"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Install GilaniAI App
            </button>
          )}

          {!isAdmin && !isTeacher && (
            <div className="rounded-lg border border-border/50 bg-card p-3">
              <p className="font-mono text-[11px] text-muted-foreground">REACH A TEACHER</p>
              <p className="mt-2 text-xs leading-relaxed text-pretty">
                Stuck or uncomfortable? Request a human review.
              </p>
              <Link
                to="/tutor"
                onClick={(e) => {
                  setSidebarOpen(false);
                  const isTutorThread =
                    path.startsWith("/tutor/") && path !== "/tutor" && path !== "/tutor/";
                  if (isTutorThread) {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent("custom:trigger-escalation"));
                  } else {
                    toast.info(
                      "Please select or create a study session first, then click the Escalate button in the chat header.",
                    );
                  }
                }}
                className="mt-3 block w-full rounded bg-foreground py-2 text-center text-[11px] font-bold uppercase tracking-wider text-background hover:bg-foreground/90"
              >
                Escalate now
              </Link>
            </div>
          )}
          <div className="flex items-center justify-between px-1">
            <p className="truncate text-xs text-muted-foreground mr-2" title={user?.email ?? ""}>
              {user?.email}
            </p>
            <div className="relative flex-shrink-0" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center justify-center rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Account actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {userMenuOpen && (
                <div className="absolute bottom-full right-0 mb-1 w-44 rounded-lg border border-border bg-popover shadow-md z-50 py-1 text-xs">
                  <Link
                    to={"/contact" as any}
                    onClick={() => { setUserMenuOpen(false); setSidebarOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Contact us
                  </Link>
                  <div className="my-1 border-t border-border/50" />
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 w-full px-3 py-2 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Breadcrumb />
        <Outlet />
      </main>
    </div>
  );
}
