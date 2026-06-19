import { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { Settings, UserCheck, Loader2, Shield, GraduationCap, User, MessageSquare, Mail, Clock, CheckCircle, CheckCircle2, Inbox, ThumbsUp, ThumbsDown, Search, BarChart3, AlertTriangle, RefreshCw, CreditCard, DollarSign, TrendingUp, Calendar, Crown, BookOpen, Activity, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/async";
import { z } from "zod";
import { PLANS, type PlanId } from "@/lib/plans";
import { AdminGlobalNotes } from "@/components/admin/AdminGlobalNotes";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  curriculum: string | null;
  created_at: string | null;
  role: string;
  plan: string;
  plan_expiry: string | null;
  conversation_count?: number;
};

type Escalation = {
  id: string;
  conversation_id: string;
  user_id: string;
  reason: string;
  status: string;
  detail: string | null;
  reviewer_id: string | null;
  created_at: string;
  profiles?: { display_name: string | null; email: string | null } | null;
};

type PlatformStats = {
  totalConversations: number;
  totalMessages: number;
  totalNotes: number;
  totalEscalations: number;
  openEscalations: number;
};

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  category: string;
  message: string;
  status: string;
  created_at: string;
};

type MessageFeedback = {
  id: string;
  message_id: string;
  user_id: string;
  vote: number;
  created_at: string;
  profiles?: { display_name: string | null } | null;
};

type NewsletterSubscriber = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
};

type RateLimitRow = {
  key: string; count: number; reset_at: string;
};

type Payment = {
  id: string;
  user_id: string;
  phone_number: string;
  amount: number;
  plan: string;
  mpesa_receipt: string | null;
  status: string;
  created_at: string;
  profiles?: { display_name: string | null; email: string | null } | null;
};

// ─── Server Functions ──────────────────────────────────────────────────────────
async function verifyAdmin(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const authResult = await authenticateRequest(request);
  const { data: roleCheck } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", authResult.userId).eq("role", "admin").single();
  if (!roleCheck) throw new Error("Forbidden");
  return authResult.userId;
}

const listProfiles = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try { await verifyAdmin(request); } catch { return []; }
  const [profilesRes, rolesRes, convoRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, display_name, email, curriculum, created_at, plan, plan_expiry").order("created_at", { ascending: false }),
    supabaseAdmin.from("user_roles").select("user_id, role"),
    supabaseAdmin.from("conversations").select("user_id"),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  const roleMap: Record<string, string> = {};
  for (const r of rolesRes.data ?? []) roleMap[r.user_id] = r.role;
  const convoCount: Record<string, number> = {};
  for (const c of convoRes.data ?? []) convoCount[c.user_id] = (convoCount[c.user_id] ?? 0) + 1;
  return (profilesRes.data ?? []).map((p) => ({
    ...p,
    role: roleMap[p.id] ?? "student",
    conversation_count: convoCount[p.id] ?? 0,
  })) as Profile[];
});

const listEscalations = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try { await verifyAdmin(request); } catch { return []; }
  const { data, error } = await supabaseAdmin
    .from("escalations")
    .select("id, conversation_id, user_id, reason, status, detail, reviewer_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];
  // Enrich with user profiles
  const userIds = [...new Set((data ?? []).map((e: any) => e.user_id).filter(Boolean))];
  let profileMap: Record<string, { display_name: string | null; email: string | null }> = {};
  if (userIds.length > 0) {
    const { data: pd } = await supabaseAdmin.from("profiles").select("id, display_name, email").in("id", userIds);
    profileMap = Object.fromEntries((pd ?? []).map((p: any) => [p.id, { display_name: p.display_name, email: p.email }]));
  }
  return (data ?? []).map((e: any) => ({ ...e, profiles: profileMap[e.user_id] ?? null })) as Escalation[];
});

const listPlatformStats = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try { await verifyAdmin(request); } catch { return { totalConversations: 0, totalMessages: 0, totalNotes: 0, totalEscalations: 0, openEscalations: 0 }; }
  const [convos, msgs, notes, escs] = await Promise.all([
    supabaseAdmin.from("conversations").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("messages").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("notes").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("escalations").select("id, status"),
  ]);
  const escalations = escs.data ?? [];
  return {
    totalConversations: convos.count ?? 0,
    totalMessages: msgs.count ?? 0,
    totalNotes: notes.count ?? 0,
    totalEscalations: escalations.length,
    openEscalations: escalations.filter((e: any) => e.status === "open" || e.status === "pending").length,
  } as PlatformStats;
});

const listContactMessages = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try { await verifyAdmin(request); } catch { return []; }
  const { data, error } = await supabaseAdmin
    .from("contact_messages").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactMessage[];
});

const updateMessageStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), status: z.enum(["unread", "read", "resolved"]) }))
  .handler(async ({ data }) => {
    const request = getRequest();
    await verifyAdmin(request);
    const { error } = await supabaseAdmin.from("contact_messages").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
  });

const updateRole = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string(), role: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const adminId = await verifyAdmin(request);
    if (adminId === data.userId && data.role !== "admin") throw new Error("Cannot remove your own admin role");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role as any });
    if (error) throw new Error(error.message);
  });

const listFeedback = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return [];
  let authResult;
  try { authResult = await authenticateRequest(request); } catch { return []; }
  const { data: roleCheck } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", authResult.userId).eq("role", "admin").single();
  if (!roleCheck) throw new Error("Forbidden");
  const { data, error } = await supabaseAdmin
    .from("message_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  // Enrich with display names via separate profiles fetch
  const userIds = [...new Set((data ?? []).map((f: any) => f.user_id).filter(Boolean))];
  let profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    profileMap = Object.fromEntries((profileData ?? []).map((p: any) => [p.id, p.display_name]));
  }
  return (data ?? []).map((f: any) => ({
    ...f,
    profiles: { display_name: profileMap[f.user_id] ?? null },
  })) as unknown as MessageFeedback[];
});

const listNewsletterSubscribers = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try { await verifyAdmin(request); } catch { return []; }
  const { data, error } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id, email, name, status, subscribed_at, unsubscribed_at")
    .order("subscribed_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as NewsletterSubscriber[];
});

const listRateLimits = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try { await verifyAdmin(request); } catch { return []; }
  const { data, error } = await supabaseAdmin
    .from("rate_limits").select("key, count, reset_at").order("count", { ascending: false }).limit(100);
  if (error) return [];
  return (data ?? []) as RateLimitRow[];
});

const listPayments = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try { await verifyAdmin(request); } catch { return []; }
  const { data, error } = await supabaseAdmin
    .from("payments").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) return [];
  const userIds = [...new Set((data ?? []).map((p: any) => p.user_id).filter(Boolean))];
  let profileMap: Record<string, { display_name: string | null; email: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profileData } = await supabaseAdmin
      .from("profiles").select("id, display_name, email").in("id", userIds);
    profileMap = Object.fromEntries((profileData ?? []).map((p: any) => [p.id, { display_name: p.display_name, email: p.email }]));
  }
  return (data ?? []).map((p: any) => ({ ...p, profiles: profileMap[p.user_id] ?? null })) as unknown as Payment[];
});

const updateUserPlan = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    userId: z.string(),
    plan: z.enum(["free", "basic", "premium", "school"]),
    planExpiry: z.string().nullable().optional(),
  }))
  .handler(async ({ data }) => {
    const request = getRequest();
    await verifyAdmin(request);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ plan: data.plan, plan_expiry: data.planExpiry ?? null })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Admin — Users & Roles — GilaniAI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw redirect({ to: "/login", search: { redirect: "/admin/users" } });
    }
  },
  loader: () => {
    return {
      profiles: [] as Profile[],
      messages: [] as ContactMessage[],
      feedback: [] as MessageFeedback[],
      rateLimits: [] as RateLimitRow[],
      payments: [] as Payment[],
      escalations: [] as Escalation[],
      platformStats: {
        totalConversations: 0,
        totalMessages: 0,
        totalNotes: 0,
        totalEscalations: 0,
        openEscalations: 0,
      } as PlatformStats,
    };
  },
  component: AdminUsersPage,
});

// ─── Component ─────────────────────────────────────────────────────────────────

const ROLES = ["student", "teacher", "admin"] as const;
type Role = (typeof ROLES)[number];

const ROLE_META: Record<Role, { icon: typeof User; color: string }> = {
  student: { icon: GraduationCap, color: "text-blue-600 border-blue-200" },
  teacher: { icon: UserCheck, color: "text-amber-600 border-amber-200" },
  admin: { icon: Shield, color: "text-red-600 border-red-200" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  unread: { label: "Unread", color: "text-blue-600 border-blue-200" },
  read: { label: "Read", color: "text-amber-600 border-amber-200" },
  resolved: { label: "Resolved", color: "text-green-600 border-green-200" },
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
};

const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};


function AdminUsersPage() {
  const [loadingData, setLoadingData] = useState(true);
  const [profileState, setProfileState] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [feedback, setFeedback] = useState<MessageFeedback[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimitRow[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [newsletter, setNewsletter] = useState<NewsletterSubscriber[]>([]);
  const [nlSubject, setNlSubject] = useState("");
  const [nlBody, setNlBody] = useState("");
  const [nlSending, setNlSending] = useState(false);
  const [nlSent, setNlSent] = useState<{ sent: number; total: number } | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalConversations: 0,
    totalMessages: 0,
    totalNotes: 0,
    totalEscalations: 0,
    openEscalations: 0,
  });

  const [planSearch, setPlanSearch] = useState("");
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updatingMsg, setUpdatingMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [rlSearch, setRlSearch] = useState("");
  const [tab, setTab] = useState<"users" | "feedback" | "messages" | "ratelimits" | "subscriptions" | "escalations" | "newsletter" | "globalnotes">("users");
  const [escalationFilter, setEscalationFilter] = useState<"all" | "open" | "resolved" | "pending">("all");
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [profiles, contactMsgs, fb, rl, pay, esc, stats, nl] = await Promise.all([
        listProfiles(),
        listContactMessages(),
        listFeedback(),
        listRateLimits(),
        listPayments(),
        listEscalations(),
        listPlatformStats(),
        listNewsletterSubscribers(),
      ]);
      setProfileState(profiles as Profile[]);
      setMessages(contactMsgs as ContactMessage[]);
      setFeedback(fb as MessageFeedback[]);
      setRateLimits(rl as RateLimitRow[]);
      setPayments(pay as Payment[]);
      setEscalations(esc as Escalation[]);
      setPlatformStats(stats as PlatformStats);
      setNewsletter(nl as NewsletterSubscriber[]);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      toast.error("Failed to load admin data");
    } finally {
      setRefreshing(false);
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ── All derived state & memos MUST be above any early returns (Rules of Hooks) ──

  const unreadCount = messages.filter((m) => m.status === "unread").length;
  const positiveCount = feedback.filter((f) => f.vote === 1).length;
  const negativeCount = feedback.filter((f) => f.vote === -1).length;
  const satisfactionPct = feedback.length > 0 ? Math.round((positiveCount / feedback.length) * 100) : 0;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? profileState : profileState.filter((p) =>
      p.display_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q)
    );
  }, [profileState, search]);

  const filteredEscalations = useMemo(() => {
    return escalationFilter === "all" ? escalations : escalations.filter((e) => e.status === escalationFilter);
  }, [escalations, escalationFilter]);

  const filteredRateLimits = useMemo(() => {
    const q = rlSearch.toLowerCase();
    return !q ? rateLimits : rateLimits.filter((r) => r.key.toLowerCase().includes(q));
  }, [rateLimits, rlSearch]);

  const filteredForPlans = useMemo(() => {
    const q = planSearch.toLowerCase();
    return !q ? profileState : profileState.filter((p) =>
      p.display_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      (p.plan ?? "free").toLowerCase().includes(q)
    );
  }, [profileState, planSearch]);

  if (loadingData) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-5 sm:p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground font-medium">Loading admin dashboard...</p>
      </div>
    );
  }

  const handleRoleChange = async (userId: string, role: string) => {
    setUpdating(userId);
    try {
      await updateRole({ data: { userId, role } });
      setProfileState((prev) => prev.map((p) => (p.id === userId ? { ...p, role } : p)));
      toast.success(`Role updated to ${role}`);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to update role."));
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusChange = async (id: string, status: "unread" | "read" | "resolved") => {
    setUpdatingMsg(id);
    try {
      await updateMessageStatus({ data: { id, status } });
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
      toast.success(`Marked as ${status}`);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to update status."));
    } finally {
      setUpdatingMsg(null);
    }
  };

  const handlePlanChange = async (userId: string, plan: string) => {
    setUpdatingPlan(userId);
    try {
      const expiry = plan === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await updateUserPlan({ data: { userId, plan: plan as any, planExpiry: expiry } });
      setProfileState((prev) => prev.map((p) => (p.id === userId ? { ...p, plan, plan_expiry: expiry } : p)));
      toast.success(`Plan updated to ${PLANS[plan as PlanId]?.label ?? plan}`);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to update plan."));
    } finally {
      setUpdatingPlan(null);
    }
  };

  const counts = ROLES.reduce(
    (acc, r) => { acc[r] = profileState.filter((p) => p.role === r).length; return acc; },
    {} as Record<Role, number>,
  );

  const planCounts = (Object.keys(PLANS) as PlanId[]).reduce((acc, pid) => {
    acc[pid] = profileState.filter((u) => (u.plan ?? "free") === pid).length;
    return acc;
  }, {} as Record<PlanId, number>);

  const mrr = (Object.keys(PLANS) as PlanId[]).reduce((sum, pid) => sum + PLANS[pid].price * planCounts[pid], 0);

  const totalRevenue = payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);

  const activeSubs = profileState.filter((u) => {
    if (u.plan === "free" || !u.plan_expiry) return false;
    const d = new Date(u.plan_expiry);
    return !isNaN(d.getTime()) && d > new Date();
  }).length;

  const expiringSoon = profileState.filter((u) => {
    if (!u.plan_expiry || u.plan === "free") return false;
    const expiryDate = new Date(u.plan_expiry);
    if (isNaN(expiryDate.getTime())) return false;
    const days = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 7;
  }).length;

  return (
    <div className="mx-auto max-w-6xl space-y-3 p-3 sm:p-6 lg:p-10">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Admin Panel</p>
          <h1 className="mt-1 font-serif text-2xl sm:text-4xl text-foreground">Dashboard</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{profileState.length} users · {platformStats.totalConversations.toLocaleString()} convos · {platformStats.openEscalations} escalations</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-red-700 mt-1">
          <Shield className="h-3 w-3" /> Admin
        </span>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">Total Users</p>
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
          </div>
          <p className="font-serif text-xl sm:text-3xl font-bold text-primary">{profileState.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">Conversations</p>
            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
          </div>
          <p className="font-serif text-xl sm:text-3xl font-bold text-blue-600">{platformStats.totalConversations.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">Notes</p>
            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
          </div>
          <p className="font-serif text-xl sm:text-3xl font-bold text-purple-600">{platformStats.totalNotes.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">Escalations</p>
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
          </div>
          <p className="font-serif text-xl sm:text-3xl font-bold text-red-500">{platformStats.openEscalations}</p>
        </div>
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">Satisfaction</p>
            <ThumbsUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
          </div>
          <p className="font-serif text-xl sm:text-3xl font-bold text-green-600">{satisfactionPct}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">Unread</p>
            <Inbox className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 flex-shrink-0" />
          </div>
          <p className="font-serif text-xl sm:text-3xl font-bold text-amber-600">{unreadCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">Rate Limits</p>
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
          </div>
          <p className="font-serif text-xl sm:text-3xl font-bold text-orange-500">{rateLimits.reduce((a, r) => a + r.count, 0)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">Messages</p>
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal-600 flex-shrink-0" />
          </div>
          <p className="font-serif text-xl sm:text-3xl font-bold text-teal-600">{platformStats.totalMessages.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 sm:gap-2 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory">
          {([
            { id: "users", label: "Users", icon: User },
            { id: "escalations", label: "Escalations", icon: AlertTriangle, badge: platformStats.openEscalations },
            { id: "feedback", label: "Feedback", icon: ThumbsUp },
            { id: "messages", label: "Messages", icon: MessageSquare, badge: unreadCount },
            { id: "ratelimits", label: "Limits", icon: BarChart3 },
            { id: "subscriptions", label: "Subs", icon: CreditCard },
            { id: "newsletter", label: "Newsletter", icon: Mail },
            { id: "globalnotes", label: "Notes", icon: BookOpen },
          ] as const).map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`snap-start flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-[10px] sm:text-xs font-bold font-mono uppercase tracking-wider rounded-xl border transition-all whitespace-nowrap flex-shrink-0 min-h-[36px] sm:min-h-[40px] ${tab === t.id ? "border-primary text-primary bg-primary/5 font-extrabold shadow-sm" : "border-border/60 text-muted-foreground bg-transparent hover:text-foreground hover:border-border hover:bg-accent/30"}`}>
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="inline">{t.label}</span>
                {"badge" in t && t.badge > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground leading-none">{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>

      {/* ── Users tab ── */}
      {tab === "users" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
            {ROLES.map((r) => {
              const { icon: Icon, color } = ROLE_META[r];
              return (
                <div key={r} className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm text-center">
                  <Icon className={`mx-auto h-5 w-5 mb-2 ${color.split(" ")[0]}`} />
                  <p className="font-serif text-2xl sm:text-3xl font-bold">{counts[r]}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1 capitalize">{r}s</p>
                </div>
              );
            })}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or role…"
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["User", "Email", "Conversations", "Curriculum", "Joined", "Role"].map((h) => (
                      <th key={h} className="px-2 py-2 sm:px-5 sm:py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center font-serif text-muted-foreground">No users found</td></tr>
                  )}
                  {filtered.map((p) => {
                    const meta = ROLE_META[p.role as Role] ?? ROLE_META.student;
                    const isUpdating = updating === p.id;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="px-2 py-2 sm:px-5 sm:py-3">
                          <p className="font-semibold">{p.display_name ?? "—"}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">ID: {p.id?.slice(0, 8)}…</p>
                        </td>
                        <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">{p.email ?? "—"}</td>
                        <td className="px-5 py-3 font-mono text-xs text-center">
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 px-2 py-0.5 text-blue-700 text-[10px] font-mono">
                            {p.conversation_count ?? 0}
                          </span>
                        </td>
                        <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">{p.plan ?? "—"}</td>
                        <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">
                          {formatDate(p.created_at)}
                        </td>
                        <td className="px-2 py-2 sm:px-5 sm:py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${meta.color}`}>{p.role}</span>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
                              <select value={p.role} onChange={(e) => handleRoleChange(p.id, e.target.value)}
                                className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer">
                                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>


            <div className="px-5 py-3 border-t border-border/50 bg-muted/20">
              <p className="font-mono text-[10px] text-muted-foreground">{filtered.length} of {profileState.length} users</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <Settings className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Admin note:</strong> Role changes take effect immediately. Teachers gain access to the Escalations panel. Admins have full platform access.
            </p>
          </div>
        </>
      )}

      {/* ── Feedback tab ── */}
      {tab === "feedback" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
              <ThumbsUp className="mx-auto h-5 w-5 mb-2 text-green-500" />
              <p className="font-serif text-2xl sm:text-3xl font-bold">{feedback.filter((f) => f.vote === 1).length}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Positive</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
              <ThumbsDown className="mx-auto h-5 w-5 mb-2 text-destructive" />
              <p className="font-serif text-2xl sm:text-3xl font-bold">{feedback.filter((f) => f.vote === -1).length}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Negative</p>
            </div>
          </div>

          {feedback.length === 0 && (
            <div className="rounded-lg border border-border bg-card py-6 sm:py-14 text-center">
              <ThumbsUp className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="font-serif text-muted-foreground">No feedback yet</p>
            </div>
          )}

          {feedback.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto scrollbar-none">
                <table className="w-full text-sm min-w-[460px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["User", "Vote", "Message ID", "Date"].map((h) => (
                        <th key={h} className="px-2 py-2 sm:px-5 sm:py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.map((f) => (
                      <tr key={f.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="px-2 py-2 sm:px-5 sm:py-3">
                          <p className="font-semibold">{f.profiles?.display_name ?? "—"}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{f.user_id?.slice(0, 8)}…</p>
                        </td>
                        <td className="px-2 py-2 sm:px-5 sm:py-3">
                          {f.vote === 1
                            ? <span className="inline-flex items-center gap-1 rounded-full border border-green-200 px-1.5 py-px font-mono text-[9px] text-green-700"><ThumbsUp className="h-3 w-3" /> Good</span>
                            : <span className="inline-flex items-center gap-1 rounded-full border border-red-200 px-1.5 py-px font-mono text-[9px] text-red-700"><ThumbsDown className="h-3 w-3" /> Bad</span>
                          }
                        </td>
                        <td className="px-5 py-3 font-mono text-[10px] text-muted-foreground">{f.message_id?.slice(0, 12)}…</td>
                        <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">
                          {formatDate(f.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>


              <div className="px-5 py-3 border-t border-border/50 bg-muted/20">
                <p className="font-mono text-[10px] text-muted-foreground">{feedback.length} total responses</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Messages tab ── */}
      {tab === "messages" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {(["unread", "read", "resolved"] as const).map((s) => (
              <div key={s} className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
                <p className="font-serif text-2xl sm:text-3xl font-bold">{messages.filter((m) => m.status === s).length}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1 capitalize">{s}</p>
              </div>
            ))}
          </div>

          {messages.length === 0 && (
            <div className="rounded-lg border border-border bg-card py-6 sm:py-14 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="font-serif text-muted-foreground">No messages yet</p>
            </div>
          )}

          {messages.map((m) => {
            const statusMeta = STATUS_META[m.status] ?? STATUS_META.unread;
            const isExpanded = expandedMsg === m.id;
            const isUpdating = updatingMsg === m.id;
            return (
              <div key={m.id} className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-colors ${m.status === "unread" ? "border-primary/30" : "border-border"}`}>
                <div
                  className="flex items-start gap-3 px-3 py-3 sm:px-5 sm:py-4 cursor-pointer hover:bg-accent/20 transition-colors"
                  onClick={() => setExpandedMsg(isExpanded ? null : m.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{m.name}</p>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusMeta.color}`}>{statusMeta.label}</span>
                      <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{m.category}</span>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{m.email}</p>
                    {m.subject && <p className="text-xs text-foreground mt-1 font-medium">{m.subject}</p>}
                    {!isExpanded && <p className="text-xs text-muted-foreground mt-1 truncate">{m.message}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(m.created_at)}
                    </div>
                    <span className="text-muted-foreground text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/50 space-y-3">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pt-4">{m.message}</p>
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-2">Mark as:</p>
                      {(["unread", "read", "resolved"] as const).map((s) => (
                        <button
                          key={s}
                          disabled={m.status === s || isUpdating}
                          onClick={() => handleStatusChange(m.id, s)}
                          className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${STATUS_META[s].color} hover:opacity-80`}
                        >
                          {isUpdating && m.status !== s ? <Loader2 className="h-3 w-3 animate-spin inline" /> : s}
                        </button>
                      ))}
                      <a href={`mailto:${m.email}`} className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
                        <Mail className="h-3 w-3" /> Reply
                      </a>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ── Rate Limits Tab ── */}
      {tab === "ratelimits" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
              <BarChart3 className="mx-auto h-5 w-5 mb-2 text-primary" />
              <p className="font-serif text-2xl sm:text-3xl font-bold">{rateLimits.length}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Active Keys</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
              <AlertTriangle className="mx-auto h-5 w-5 mb-2 text-amber-500" />
              <p className="font-serif text-2xl sm:text-3xl font-bold">{rateLimits.reduce((a, r) => a + r.count, 0)}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Total Hits</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
              <RefreshCw className="mx-auto h-5 w-5 mb-2 text-blue-500" />
              <p className="font-serif text-2xl sm:text-3xl font-bold">
                {rateLimits.filter((r) => { const d = new Date(r.reset_at); return !isNaN(d.getTime()) && d > new Date(); }).length}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Active Now</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={rlSearch} onChange={(e) => setRlSearch(e.target.value)}
              placeholder="Filter by key…"
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {rateLimits.length === 0 ? (
            <div className="rounded-lg border border-border bg-card py-6 sm:py-14 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-400/60 mb-3" />
              <p className="text-sm text-muted-foreground">No rate limit hits recorded</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto scrollbar-none">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["Key", "Hits", "Resets At", "Status"].map((h) => (
                        <th key={h} className="px-2 py-2 sm:px-4 sm:py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRateLimits.map((r) => {
                      const resetDate = new Date(r.reset_at);
                      const isActive = !isNaN(resetDate.getTime()) && resetDate > new Date();
                      return (
                        <tr key={r.key} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate" title={r.key}>{r.key}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold text-sm ${r.count > 10 ? "text-destructive" : r.count > 5 ? "text-amber-600" : "text-foreground"}`}>{r.count}</span>
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-xs text-muted-foreground">
                            {formatDateTime(r.reset_at)}
                          </td>
                          <td className="px-4 py-3">
                            {isActive
                              ? <span className="inline-flex items-center gap-1 rounded-full border border-red-200 px-1.5 py-px font-mono text-[9px] text-red-700">Active</span>
                              : <span className="inline-flex items-center gap-1 rounded-full border border-green-200 px-1.5 py-px font-mono text-[9px] text-green-700">Expired</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>


              <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20">
                <p className="font-mono text-[10px] text-muted-foreground">{filteredRateLimits.length} keys</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Escalations tab ── */}
      {tab === "escalations" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {(["open", "pending", "resolved"] as const).map((s) => (
              <button key={s} onClick={() => setEscalationFilter(s === escalationFilter ? "all" : s)}
                className={`rounded-lg border-2 p-2.5 sm:p-4 text-center shadow-sm transition-all duration-200 ${escalationFilter === s ? "border-primary text-primary bg-transparent font-bold scale-102" : "border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}>
                <p className="font-serif text-2xl sm:text-3xl font-bold">{escalations.filter((e) => e.status === s).length}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest mt-1 capitalize">{s}</p>
              </button>
            ))}
          </div>

          {filteredEscalations.length === 0 ? (
            <div className="rounded-lg border border-border bg-card py-6 sm:py-14 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-400/60 mb-3" />
              <p className="font-serif text-muted-foreground">No escalations{escalationFilter !== "all" ? ` with status "${escalationFilter}"` : ""}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-sm min-w-[580px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Student", "Reason", "Status", "Reviewer", "Date"].map((h) => (
                      <th key={h} className="px-2 py-2 sm:px-5 sm:py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEscalations.map((esc) => (
                    <tr key={esc.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-2 py-2 sm:px-5 sm:py-3">
                        <p className="font-semibold">{esc.profiles?.display_name ?? "—"}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{esc.profiles?.email ?? (esc.user_id ? esc.user_id.slice(0, 8) + "…" : "—")}</p>
                      </td>
                      <td className="px-5 py-3 text-xs max-w-[200px]">
                        <p className="truncate" title={esc.detail ?? esc.reason}>{esc.detail || esc.reason}</p>
                      </td>
                      <td className="px-2 py-2 sm:px-5 sm:py-3">
                        <span className={`inline-flex items-center rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${esc.status === "resolved" ? "text-green-600 bg-green-50 border-green-200" :
                            esc.status === "open" ? "text-red-600 bg-red-50 border-red-200" :
                              "text-amber-600 bg-amber-50 border-amber-200"
                          }`}>{esc.status}</span>
                      </td>
                      <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">{esc.reviewer_id ? esc.reviewer_id?.slice(0, 8) + "…" : "Unassigned"}</td>
                      <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">
                        {formatDate(esc.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>


              <div className="px-5 py-3 border-t border-border/50 bg-muted/20">
                <p className="font-mono text-[10px] text-muted-foreground">{filteredEscalations.length} escalations shown</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Subscriptions tab ── */}
      {tab === "subscriptions" && (
        <div className="space-y-3">
          {/* Revenue summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">MRR Estimate</p>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-green-600">KES {mrr.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total Revenue</p>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-primary">KES {totalRevenue.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Active Subscriptions</p>
                <Crown className="h-4 w-4 text-amber-500" />
              </div>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-amber-500">{activeSubs}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Expiring ≤7 Days</p>
                <Calendar className="h-4 w-4 text-red-500" />
              </div>
              <p className="font-serif text-2xl sm:text-3xl font-bold text-red-500">{expiringSoon}</p>
            </div>
          </div>

          {/* Plan distribution */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {(Object.keys(PLANS) as PlanId[]).map((pid) => (
              <div key={pid} className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm text-center">
                <p className="font-serif text-2xl sm:text-3xl font-bold">{planCounts[pid]}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{PLANS[pid].label}</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-0.5">KES {PLANS[pid].price.toLocaleString()}/mo</p>
              </div>
            ))}
          </div>

          {/* User plan management */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={planSearch} onChange={(e) => setPlanSearch(e.target.value)}
              placeholder="Search by name, email, or plan…"
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["User", "Email", "Plan", "Expires", "Action"].map((h) => (
                      <th key={h} className="px-2 py-2 sm:px-5 sm:py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredForPlans.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center font-serif text-muted-foreground">No users found</td></tr>
                  )}
                  {filteredForPlans.map((p) => {
                    const plan = (p.plan ?? "free") as PlanId;
                    const isUpdating = updatingPlan === p.id;
                    const expiry = p.plan_expiry ? new Date(p.plan_expiry) : null;
                    const isValidExpiry = expiry && !isNaN(expiry.getTime());
                    const isExpired = isValidExpiry ? expiry < new Date() : false;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="px-2 py-2 sm:px-5 sm:py-3">
                          <p className="font-semibold">{p.display_name ?? "—"}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">ID: {p.id?.slice(0, 8)}…</p>
                        </td>
                        <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">{p.email ?? "—"}</td>
                        <td className="px-2 py-2 sm:px-5 sm:py-3">
                          <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-primary border-primary/20">
                            {PLANS[plan]?.label ?? plan}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs">
                          {isValidExpiry ? (
                            <span className={isExpired ? "text-destructive" : "text-muted-foreground"}>
                              {expiry.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                              {isExpired ? " (expired)" : ""}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-2 py-2 sm:px-5 sm:py-3">
                          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
                            <select value={plan} onChange={(e) => handlePlanChange(p.id, e.target.value)}
                              className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer">
                              {(Object.keys(PLANS) as PlanId[]).map((pid) => (
                                <option key={pid} value={pid}>{PLANS[pid].label}</option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          </div>

          <div className="hidden">
            {filteredForPlans.length === 0 && (
              <div className="py-12 text-center font-serif text-muted-foreground">No users found</div>
            )}
            <div className="divide-y divide-border/50">
            {filteredForPlans.map((p) => {
              const plan = (p.plan ?? "free") as PlanId;
              const isUpdating = updatingPlan === p.id;
              const expiry = p.plan_expiry ? new Date(p.plan_expiry) : null;
              const isValidExpiry = expiry && !isNaN(expiry.getTime());
              const isExpired = isValidExpiry ? expiry < new Date() : false;
              return (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{p.display_name ?? "—"}</p>
                      <p className="font-mono text-[9px] text-muted-foreground">ID: {p.id?.slice(0, 8)}…</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[8px] uppercase tracking-wider text-primary border-primary/20">
                      {PLANS[plan]?.label ?? plan}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40 font-mono text-muted-foreground">
                    <div className="col-span-2">
                      <span className="text-[9px] font-mono block uppercase text-muted-foreground">Email</span>
                      <span className="break-all">{p.email ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono block uppercase text-muted-foreground">Expires</span>
                      <span>
                        {isValidExpiry ? (
                          <span className={isExpired ? "text-destructive font-bold" : ""}>
                            {expiry.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                            {isExpired ? " (expired)" : ""}
                          </span>
                        ) : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="font-mono text-[9px] uppercase text-muted-foreground">Change Plan</span>
                    <div className="flex items-center gap-2">
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
                        <select value={plan} onChange={(e) => handlePlanChange(p.id, e.target.value)}
                          className="rounded border border-border bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer">
                          {(Object.keys(PLANS) as PlanId[]).map((pid) => (
                            <option key={pid} value={pid}>{PLANS[pid].label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
            <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20">
              <p className="font-mono text-[10px] text-muted-foreground">{filteredForPlans.length} of {profileState.length} users</p>
            </div>
          </div>

          {/* Payment history */}
          <h2 className="font-serif text-xl mt-6">Payment History</h2>
          {payments.length === 0 ? (
            <div className="rounded-lg border border-border bg-card py-6 sm:py-14 text-center">
              <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="font-serif text-muted-foreground">No payments yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["User", "Plan", "Amount", "Phone", "Receipt", "Status", "Date"].map((h) => (
                      <th key={h} className="px-2 py-2 sm:px-4 sm:py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pay) => (
                    <tr key={pay.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{pay.profiles?.display_name ?? "—"}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{pay.profiles?.email ?? (pay.user_id ? `${pay.user_id.slice(0, 8)}…` : "—")}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs capitalize">{pay.plan}</td>
                      <td className="px-4 py-3 font-semibold">KES {pay.amount.toLocaleString()}</td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-xs text-muted-foreground">{pay.phone_number}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{pay.mpesa_receipt ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${pay.status === "completed" ? "text-green-600 bg-green-50 border-green-200" :
                            pay.status === "failed" ? "text-red-600 bg-red-50 border-red-200" :
                              "text-amber-600 bg-amber-50 border-amber-200"
                          }`}>{pay.status}</span>
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-xs text-muted-foreground">
                        {formatDate(pay.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>


              <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20">
                <p className="font-mono text-[10px] text-muted-foreground">{payments.length} payments · KES {totalRevenue.toLocaleString()} completed</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Newsletter tab ── */}
      {tab === "newsletter" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
              <Users className="mx-auto h-5 w-5 mb-2 text-primary" />
              <p className="font-serif text-2xl sm:text-3xl font-bold">{newsletter.length}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Total</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
              <CheckCircle className="mx-auto h-5 w-5 mb-2 text-green-500" />
              <p className="font-serif text-2xl sm:text-3xl font-bold text-green-600">
                {newsletter.filter(s => s.status === "active").length}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Active</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
              <TrendingUp className="mx-auto h-5 w-5 mb-2 text-blue-500" />
              <p className="font-serif text-2xl sm:text-3xl font-bold text-blue-600">
                {newsletter.filter(s => {
                  const d = new Date(s.subscribed_at);
                  const now = new Date();
                  return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
                }).length}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">This Week</p>
            </div>
          </div>

          {/* Send Newsletter */}
          <div className="rounded-lg border border-border bg-card p-3 sm:p-6 shadow-sm space-y-3">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Send Newsletter
            </h3>
            {nlSent ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                <CheckCircle className="mx-auto h-6 w-6 text-emerald-600 mb-2" />
                <p className="font-bold text-emerald-700">Newsletter sent!</p>
                <p className="text-sm text-emerald-600">{nlSent.sent} of {nlSent.total} subscribers received it.</p>
                <button onClick={() => { setNlSent(null); setNlSubject(""); setNlBody(""); }}
                  className="mt-3 text-xs font-mono underline text-muted-foreground">
                  Send another
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026 Exam Revision Tips"
                    value={nlSubject}
                    onChange={e => setNlSubject(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Message (HTML supported)</label>
                  <textarea
                    rows={6}
                    placeholder="Write your newsletter content here..."
                    value={nlBody}
                    onChange={e => setNlBody(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                </div>
                <button
                  disabled={nlSending || !nlSubject || !nlBody}
                  onClick={async () => {
                    setNlSending(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const res = await fetch("/api/newsletter/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                        body: JSON.stringify({ subject: nlSubject, html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">${nlBody}</div>`, text: nlBody }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      setNlSent({ sent: data.sent, total: data.total });
                      toast.success(`Sent to ${data.sent} subscribers!`);
                    } catch (err: any) {
                      toast.error(err?.message ?? "Failed to send");
                    } finally {
                      setNlSending(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {nlSending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send to {newsletter.filter(s => s.status === "active").length} subscribers</>}
                </button>
              </div>
            )}
          </div>

          {/* Subscribers list */}
          {newsletter.length === 0 ? (
            <div className="rounded-lg border border-border bg-card py-6 sm:py-14 text-center">
              <Mail className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="font-serif text-muted-foreground">No subscribers yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-sm min-w-[440px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Email", "Name", "Status", "Subscribed"].map(h => (
                      <th key={h} className="px-2 py-2 sm:px-5 sm:py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {newsletter.map(s => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs">{s.email}</td>
                      <td className="px-5 py-3 text-sm">{s.name ?? "—"}</td>
                      <td className="px-2 py-2 sm:px-5 sm:py-3">
                        <span className={`inline-flex items-center rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${s.status === "active" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">
                        {new Date(s.subscribed_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>


              <div className="px-5 py-3 border-t border-border/50 bg-muted/20">
                <p className="font-mono text-[10px] text-muted-foreground">{newsletter.length} total subscribers</p>
              </div>
            </div>
          )}

        </div>
      )}
      {/* ── Global Notes tab ── */}
      {tab === "globalnotes" && <AdminGlobalNotes />}

    </div>
  );
}
