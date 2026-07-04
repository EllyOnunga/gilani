import { useState, useEffect, useRef } from "react";
import { useRouterState, useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteThreadFn, renameThreadFn } from "@/lib/tutor.server-fns";
import { withTimeout } from "@/lib/async";
import { toast } from "sonner";

export interface Thread {
  id: string;
  title?: string | null;
  updated_at?: string | null;
}

export interface GroupedThreads {
  today: Thread[];
  yesterday: Thread[];
  last7Days: Thread[];
  older: Thread[];
}

export function groupThreadsByDate(threads: Thread[]): GroupedThreads {
  const today: Thread[] = [];
  const yesterday: Thread[] = [];
  const last7Days: Thread[] = [];
  const older: Thread[] = [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfLast7Days = new Date(startOfToday);
  startOfLast7Days.setDate(startOfLast7Days.getDate() - 7);

  threads.forEach((t) => {
    if (!t.updated_at) { older.push(t); return; }
    const updatedDate = new Date(t.updated_at);
    if (isNaN(updatedDate.getTime())) { older.push(t); return; }

    if (updatedDate >= startOfToday) today.push(t);
    else if (updatedDate >= startOfYesterday) yesterday.push(t);
    else if (updatedDate >= startOfLast7Days) last7Days.push(t);
    else older.push(t);
  });
  return { today, yesterday, last7Days, older };
}

export function useAuthedShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { roles, user, loading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("teacher") && !roles.includes("admin");
  const isStudent = !isAdmin && !isTeacher;

  // Sidebar Layout State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  // Threads State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [revealedThreadId, setRevealedThreadId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const threadsQuery = useQuery({
    queryKey: ["threads", user?.id],
    queryFn: async () => {
      const { data, error } = (await withTimeout(
        Promise.resolve(
          supabase.from("conversations").select("id,title,updated_at").eq("user_id", user?.id as string).order("updated_at", { ascending: false }),
        ),
        8000,
        "Database connection timed out",
      )) as any;
      if (error) throw new Error(`Failed to load sessions: ${error.message}`);
      return (data ?? []) as Thread[];
    },
    enabled: !!user?.id && isStudent,
  });

  const threads = threadsQuery.data ?? [];
  const threadsLoading = !!user?.id && threadsQuery.isPending;
  const groupedThreads = groupThreadsByDate(threads);

  // Profile & App State
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });
  const [pwaInstallable, setPwaInstallable] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [profileName, setProfileName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const signingOutRef = useRef(false);

  const fetchProfile = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from("profiles").select("plan, display_name, avatar_url").eq("id", user.id).maybeSingle();
      if (!error && data) {
        if (data.plan) setCurrentPlan(data.plan);
        setProfileName(data.display_name || "");
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (err) {
      console.error("Failed to load profile for sidebar:", err);
    }
  };

  // ─── Actions ─────────────────────────────────────────────────────────────
  const createNewThread = async () => {
    const sessionRes = await supabase.auth.getSession();
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return;
    const { data, error } = await supabase.from("conversations").insert([{ title: "New thread", user_id: userId }]).select().single();
    if (error) {
      console.error("[TutorThread] create thread error:", error);
      toast.error("Failed to start a new chat session.");
      return;
    }
    const newId = (data as any).id;
    queryClient.invalidateQueries({ queryKey: ["threads", userId] });
    navigate({ to: "/tutor/$threadId", params: { threadId: newId } } as any);
    setSidebarOpen(false);
  };

  const handleDeleteThread = async (id: string) => {
    const toastId = toast.loading("Deleting session...");
    try {
      await deleteThreadFn({ data: { threadId: id } });
      queryClient.invalidateQueries({ queryKey: ["threads", user?.id] });
      toast.success("Session deleted successfully!", { id: toastId });
      if (path.includes(`/tutor/${id}`)) navigate({ to: "/tutor" as any });
    } catch (err: any) {
      console.error("Failed to delete thread:", err);
      toast.error("Failed to delete session.", { id: toastId });
    }
  };

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle || "");
    requestAnimationFrame(() => renameInputRef.current?.select());
  };

  const commitRename = async (id: string) => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed) return;
    try {
      await renameThreadFn({ data: { threadId: id, title: trimmed } });
      queryClient.invalidateQueries({ queryKey: ["threads", user?.id] });
    } catch (err) {
      console.error("Failed to rename thread:", err);
      toast.error("Failed to rename chat.");
    }
  };

  const handleThreadTouchStart = (id: string) => {
    longPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setRevealedThreadId(id);
    }, 450);
  };

  const handleThreadTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setTimeout(() => { longPressTriggeredRef.current = false; }, 50);
  };

  const signOut = async () => {
    signingOutRef.current = true;
    try {
      sessionStorage.removeItem("__gilani_role");
      await supabase.auth.signOut();
      toast.success("Signed out");
    } catch {
      sessionStorage.removeItem("__gilani_role");
    } finally {
      window.location.href = "/";
    }
  };

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      router.preloadRoute({ to: "/tutor" }).catch(() => { });
      router.preloadRoute({ to: "/settings" }).catch(() => { });
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (!revealedThreadId) return;
    const handler = (e: TouchEvent | MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-thread-id="${revealedThreadId}"]`)) setRevealedThreadId(null);
    };
    document.addEventListener("touchstart", handler);
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("mousedown", handler);
    };
  }, [revealedThreadId]);

  useEffect(() => { fetchProfile(); }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleProfileUpdate = () => fetchProfile();
    window.addEventListener("custom:profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("custom:profile-updated", handleProfileUpdate);
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpenPlans = () => setShowPlans(true);
    window.addEventListener("custom:open-plans", handleOpenPlans);
    return () => window.removeEventListener("custom:open-plans", handleOpenPlans);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onInstallable = () => setPwaInstallable(true);
    const onInstalled = () => setPwaInstallable(false);
    if ((window as any).__pwaInstallPrompt) setPwaInstallable(true);
    window.addEventListener("custom:pwa-installable", onInstallable);
    window.addEventListener("custom:pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("custom:pwa-installable", onInstallable);
      window.removeEventListener("custom:pwa-installed", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (loading || signingOutRef.current || !user || roles.length === 0) return;
    const studentOnlyPaths = ["/tutor", "/tutor"];
    const isOnStudentRoute = studentOnlyPaths.some((p) => path === p || path.startsWith(p + "/"));
    if (isAdmin && isOnStudentRoute) navigate({ to: "/admin/users" as any });
    else if (isTeacher && isOnStudentRoute) navigate({ to: "/teacher/escalations" as any });
    else if (isStudent && (path.startsWith("/admin") || path.startsWith("/teacher"))) navigate({ to: "/tutor" as any });
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
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  useEffect(() => {
    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          sessionStorage.removeItem("__gilani_role");
          await supabase.auth.signOut();
          toast.error("You were signed out due to inactivity.");
        } catch {} finally {
          window.location.href = "/login";
        }
      }, TIMEOUT_MS);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "visibilitychange"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);

  return {
    path, roles, user, loading, isAdmin, isTeacher, isStudent,
    sidebarOpen, setSidebarOpen, collapsed, toggleCollapsed,
    userMenuOpen, setUserMenuOpen, userMenuRef,
    threads, threadsLoading, groupedThreads,
    deleteConfirmId, setDeleteConfirmId,
    renamingId, setRenamingId, renameValue, setRenameValue, renameInputRef, startRename, commitRename,
    revealedThreadId, setRevealedThreadId, handleThreadTouchStart, handleThreadTouchEnd, longPressTriggeredRef,
    createNewThread, handleDeleteThread,
    profileName, avatarUrl, currentPlan, isDark, pwaInstallable, setPwaInstallable, showPlans, setShowPlans,
    signOut,
  };
}
