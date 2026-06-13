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
import { PlansModal } from "@/components/PlansModal";

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

function PresetAvatarSVG({ preset }: { preset: string }) {
  switch (preset) {
    case "socrates":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full bg-gradient-to-br from-amber-500 to-amber-700 p-1.5 text-white">
          <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M12 24h8M16 24V14M13 14h6M11 11h10v3H11z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "curie":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full bg-gradient-to-br from-emerald-500 to-emerald-700 p-1.5 text-white">
          <path d="M11 23h10M13 23v-7a3 3 0 0 1-1-2.5v-3.5h8v3.5a3 3 0 0 1-1 2.5v7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="7" r="1" fill="currentColor" />
          <circle cx="12" cy="15" r="1.2" fill="currentColor" />
          <circle cx="20" cy="17" r="0.8" fill="currentColor" />
        </svg>
      );
    case "galileo":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full bg-gradient-to-br from-blue-500 to-blue-700 p-1.5 text-white">
          <path d="M9 23l7-7M23 9l-7 7M16 16l4 4M21 7l4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="24" cy="16" r="0.8" fill="currentColor" />
          <polygon points="12,7 13,9 15,9 13,10 14,12 12,11 10,12 11,10 9,9 11,9" fill="currentColor" />
        </svg>
      );
    case "lovelace":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full bg-gradient-to-br from-purple-500 to-purple-700 p-1.5 text-white">
          <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M16 8v3M16 21v3M8 16h3M21 16h3M10.5 10.5l2 2M19.5 19.5l2 2M10.5 19.5l2-2M19.5 10.5l2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "hypatia":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full bg-gradient-to-br from-pink-500 to-pink-700 p-1.5 text-white">
          <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <line x1="16" y1="9" x2="16" y2="23" stroke="currentColor" strokeWidth="1" />
          <line x1="9" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="1" />
          <polygon points="16,11 19,16 16,21 13,16" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      );
    case "einstein":
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full bg-gradient-to-br from-rose-500 to-rose-700 p-1.5 text-white">
          <path d="M12 15a4 4 0 0 1 8 0c0 2.5-2 3.5-2 5h-4c0-1.5-2-2.5-2-5zM13 23h6M14 26h4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="16" y1="7" x2="16" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="8" y1="11" x2="10" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="24" y1="11" x2="22" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" className="h-full w-full bg-gradient-to-br from-primary to-primary/80 p-1.5 text-white">
          <circle cx="16" cy="16" r="12" fill="currentColor" opacity="0.2" />
        </svg>
      );
  }
}

function AuthedShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { roles, user, loading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });
  const [pwaInstallable, setPwaInstallable] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("free");

  const [profileName, setProfileName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("plan, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (!error && data) {
        if (data.plan) setCurrentPlan(data.plan);
        setProfileName(data.display_name || "");
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (err) {
      console.error("Failed to load profile for sidebar:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleProfileUpdate = () => {
      fetchProfile();
    };
    window.addEventListener("custom:profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("custom:profile-updated", handleProfileUpdate);
    };
  }, [user?.id]);

  // Listen for dynamic open-plans events from other pages
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpenPlans = () => {
      setShowPlans(true);
    };
    window.addEventListener("custom:open-plans", handleOpenPlans);
    return () => {
      window.removeEventListener("custom:open-plans", handleOpenPlans);
    };
  }, []);

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


  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden lg:flex-row bg-background text-foreground">
      {/* Disclaimer Modal - shows once on first visit */}
      <DisclaimerModal />

      {/* Global Subscription/Upgrade plans Modal */}
      {showPlans && <PlansModal onClose={() => setShowPlans(false)} currentPlan={currentPlan} />}

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
        <div className="flex items-center justify-between mb-8 min-w-0 w-full relative">
          <div className="flex flex-col items-center justify-center text-center min-w-0 flex-1">
            <Logo to="/dashboard" onClick={() => setSidebarOpen(false)} size="md" className="mx-auto" />
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Ethical Learning
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-black/5 lg:hidden flex-shrink-0 ml-2 absolute right-0 top-1/2 -translate-y-1/2"
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
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors border-2 ${
                    active ? "border-primary text-primary bg-transparent font-semibold shadow-sm" : "border-transparent text-muted-foreground hover:bg-black/5"
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
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors border-2 ${
                  path.startsWith("/teacher/escalations")
                    ? "border-primary text-primary bg-transparent font-semibold shadow-sm"
                    : "border-transparent text-muted-foreground hover:bg-black/5"
                }`}
              >
                <ShieldAlert className="h-4 w-4" /> Escalations
              </Link>
              <Link
                to={"/settings" as any}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors border-2 ${path === "/settings" ? "border-primary text-primary bg-transparent font-semibold shadow-sm" : "border-transparent text-muted-foreground hover:bg-black/5"}`}
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
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors border-2 ${
                  path.startsWith("/admin")
                    ? "border-primary text-primary bg-transparent font-semibold shadow-sm"
                    : "border-transparent text-muted-foreground hover:bg-black/5"
                }`}
              >
                <Users className="h-4 w-4" /> Users & Roles
              </Link>
              <Link
                to={"/settings" as any}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors border-2 ${path === "/settings" ? "border-primary text-primary bg-transparent font-semibold shadow-sm" : "border-transparent text-muted-foreground hover:bg-black/5"}`}
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
          <div className="flex items-center justify-between gap-2 border border-border/20 rounded-xl bg-card/50 p-2 shadow-xs min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full overflow-hidden border border-primary/20 bg-background/50 shadow-inner">
                {avatarUrl ? (
                  avatarUrl.startsWith("preset:") ? (
                    <PresetAvatarSVG preset={avatarUrl.substring(7)} />
                  ) : (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  )
                ) : (
                  <span className="font-serif text-[11px] font-bold text-primary">
                    {(profileName || user?.email || "U").substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold leading-tight text-foreground" title={profileName || user?.email || ""}>
                  {profileName || user?.email?.split("@")[0]}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                    {currentPlan}
                  </span>
                </div>
              </div>
            </div>
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
