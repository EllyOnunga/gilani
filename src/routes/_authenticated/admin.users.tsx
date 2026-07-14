import { useEffect, useMemo } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabase } from "@/client/supabase";
import { GilaniLoader } from "@/client/components/GilaniLoader";
import { supabaseAdmin } from "@/server/supabase";
import { authenticateRequest } from "@/server/api-auth.server";
import {
  Settings,
  Loader2,
  Shield,
  User,
  MessageSquare,
  Mail,
  ThumbsUp,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  BookOpen,
  Activity,
  Menu,
} from "lucide-react";
import { useLayout } from "@/client/contexts/layout-context";
import { NotificationBell } from "@/client/components/notifications";
import { z } from "zod";
import { AdminGlobalNotes } from "@/client/components/admin/AdminGlobalNotes";
import { useAdminDashboard } from "@/client/components/admin/hooks/useAdminDashboard";
import { AdminUsersTab } from "@/client/components/admin/tabs/AdminUsersTab";
import { AdminFeedbackTab } from "@/client/components/admin/tabs/AdminFeedbackTab";
import { AdminMessagesTab } from "@/client/components/admin/tabs/AdminMessagesTab";
import { AdminRateLimitsTab } from "@/client/components/admin/tabs/AdminRateLimitsTab";
import { AdminEscalationsTab } from "@/client/components/admin/tabs/AdminEscalationsTab";
import { AdminSubscriptionsTab } from "@/client/components/admin/tabs/AdminSubscriptionsTab";
import { AdminNewsletterTab } from "@/client/components/admin/tabs/AdminNewsletterTab";
import { AdminSettingsAnalyticsTab } from "@/client/components/admin/tabs/AdminSettingsAnalyticsTab";
import type {
  Profile,
  Escalation,
  PlatformStats,
  ContactMessage,
  MessageFeedback,
  NewsletterSubscriber,
  RateLimitRow,
  Payment,
} from "@/client/components/admin/types";

// ─── Server Functions ──────────────────────────────────────────────────────────
async function verifyAdmin(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const authResult = await authenticateRequest(request);
  const { data: roleCheck } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", authResult.userId)
    .eq("role", "admin")
    .single();
  if (!roleCheck) throw new Error("Forbidden");
  return authResult.userId;
}

const listProfiles = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try {
    await verifyAdmin(request);
  } catch {
    return [];
  }
  const [profilesRes, rolesRes, convoRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, display_name, email, curriculum, created_at, plan, plan_expiry")
      .order("created_at", { ascending: false }),
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
  try {
    await verifyAdmin(request);
  } catch {
    return [];
  }
  const { data, error } = await supabaseAdmin
    .from("escalations")
    .select("id, conversation_id, user_id, reason, status, detail, reviewer_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];
  const userIds = [...new Set((data ?? []).map((e: any) => e.user_id).filter(Boolean))];
  let profileMap: Record<string, { display_name: string | null; email: string | null }> = {};
  if (userIds.length > 0) {
    const { data: pd } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", userIds);
    profileMap = Object.fromEntries(
      (pd ?? []).map((p: any) => [p.id, { display_name: p.display_name, email: p.email }]),
    );
  }
  return (data ?? []).map((e: any) => ({
    ...e,
    profiles: profileMap[e.user_id] ?? null,
  })) as Escalation[];
});

const listPlatformStats = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try {
    await verifyAdmin(request);
  } catch {
    return {
      totalConversations: 0,
      totalMessages: 0,
      totalNotes: 0,
      totalEscalations: 0,
      openEscalations: 0,
    };
  }
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
    openEscalations: escalations.filter((e: any) => e.status === "open" || e.status === "pending")
      .length,
  } as PlatformStats;
});

const listContactMessages = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try {
    await verifyAdmin(request);
  } catch {
    return [];
  }
  const { data, error } = await supabaseAdmin
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactMessage[];
});

const updateMessageStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), status: z.enum(["unread", "read", "resolved"]) }))
  .handler(async ({ data }) => {
    const request = getRequest();
    await verifyAdmin(request);
    const { error } = await supabaseAdmin
      .from("contact_messages")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

const updateRole = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string(), role: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const adminId = await verifyAdmin(request);
    if (adminId === data.userId && data.role !== "admin")
      throw new Error("Cannot remove your own admin role");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role as any });
    if (error) throw new Error(error.message);
  });

const listFeedback = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return [];
  let authResult;
  try {
    authResult = await authenticateRequest(request);
  } catch {
    return [];
  }
  const { data: roleCheck } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", authResult.userId)
    .eq("role", "admin")
    .single();
  if (!roleCheck) throw new Error("Forbidden");
  const { data, error } = await supabaseAdmin
    .from("message_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
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
  try {
    await verifyAdmin(request);
  } catch {
    return [];
  }
  const { data, error } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id, email, name, status, subscribed_at, unsubscribed_at")
    .order("subscribed_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as NewsletterSubscriber[];
});

const listRateLimits = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try {
    await verifyAdmin(request);
  } catch {
    return [];
  }
  const { data, error } = await supabaseAdmin
    .from("rate_limits")
    .select("key, count, reset_at")
    .order("count", { ascending: false })
    .limit(100);
  if (error) return [];
  return (data ?? []) as RateLimitRow[];
});

const listPayments = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  try {
    await verifyAdmin(request);
  } catch {
    return [];
  }
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];
  const userIds = [...new Set((data ?? []).map((p: any) => p.user_id).filter(Boolean))];
  let profileMap: Record<string, { display_name: string | null; email: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", userIds);
    profileMap = Object.fromEntries(
      (profileData ?? []).map((p: any) => [p.id, { display_name: p.display_name, email: p.email }]),
    );
  }
  return (data ?? []).map((p: any) => ({
    ...p,
    profiles: profileMap[p.user_id] ?? null,
  })) as unknown as Payment[];
});

const updateUserPlan = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string(),
      plan: z.enum(["free", "pro"]),
      planExpiry: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    await verifyAdmin(request);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ plan: data.plan, plan_expiry: data.planExpiry ?? null })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
  });

const resetUserRateLimit = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    await verifyAdmin(request);
    const { error } = await supabaseAdmin
      .from("rate_limits")
      .delete()
      .like("key", `${data.userId}:%`);
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
      if (!data.session)
        throw redirect({ to: "/login", search: { redirect: "/admin/users", signout: undefined } });
    }
  },
  loader: () => ({
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
  }),
  component: AdminUsersPage,
});

// ─── Component ─────────────────────────────────────────────────────────────────
function AdminUsersPage() {
  const { setSidebarOpen, user } = useLayout();

  const serverFns = useMemo(
    () => ({
      listProfiles,
      listEscalations,
      listPlatformStats,
      listContactMessages,
      listFeedback,
      listNewsletterSubscribers,
      listRateLimits,
      listPayments,
      updateRole,
      updateMessageStatus,
      updateUserPlan,
      resetUserRateLimit,
    }),
    [],
  );
  const dashboard = useAdminDashboard(serverFns);

  useEffect(() => {
    dashboard.loadDashboardData();
  }, [dashboard.loadDashboardData]);

  if (dashboard.loadingData) return <GilaniLoader />;

  const TABS = [
    { id: "users", label: "Users", icon: User },
    {
      id: "escalations",
      label: "Escalations",
      icon: AlertTriangle,
      badge: dashboard.platformStats.openEscalations,
    },
    { id: "feedback", label: "Feedback", icon: ThumbsUp },
    { id: "messages", label: "Messages", icon: MessageSquare, badge: dashboard.unreadCount },
    { id: "ratelimits", label: "Limits", icon: BarChart3 },
    { id: "subscriptions", label: "Subs", icon: CreditCard },
    { id: "newsletter", label: "Newsletter", icon: Mail },
    { id: "globalnotes", label: "Notes", icon: BookOpen },
    { id: "settings_analytics", label: "Settings", icon: Settings },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3 p-3 sm:p-6 lg:p-10">
      {/* Mobile Header */}
      <div className="flex lg:hidden items-center justify-between h-14 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-2 border-b border-border/60">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors active:scale-95"
          title="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {user?.id ? <NotificationBell userId={user?.id} /> : null}
      </div>

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-border/60 gap-4 text-center sm:text-left">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            Admin Panel
          </p>
          <h1 className="mt-1 font-serif text-2xl sm:text-4xl text-foreground">Dashboard</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {dashboard.profileState.length} users ·{" "}
            {dashboard.platformStats.totalConversations.toLocaleString()} convos ·{" "}
            {dashboard.platformStats.openEscalations} escalations
          </p>
        </div>
        <div className="flex items-center justify-center sm:justify-end gap-2.5 mt-1 sm:mt-0">
          <button
            onClick={() => dashboard.loadDashboardData(false)}
            disabled={dashboard.refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${dashboard.refreshing ? "animate-spin" : ""}`} />{" "}
            Refresh
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-red-700">
            <Shield className="h-3 w-3" /> Admin
          </span>
        </div>
      </header>

      {/* Summary Stats Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          {
            label: "Total Users",
            value: dashboard.profileState.length,
            Icon: User,
            color: "text-primary",
          },
          {
            label: "Conversations",
            value: dashboard.platformStats.totalConversations.toLocaleString(),
            Icon: Activity,
            color: "text-blue-600",
          },
          {
            label: "Notes",
            value: dashboard.platformStats.totalNotes.toLocaleString(),
            Icon: BookOpen,
            color: "text-purple-600",
          },
          {
            label: "Escalations",
            value: dashboard.platformStats.openEscalations,
            Icon: AlertTriangle,
            color: "text-red-500",
          },
        ].map(({ label, value, Icon, color }) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">
                {label}
              </p>
              <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color} flex-shrink-0`} />
            </div>
            <p className={`font-serif text-xl sm:text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Summary Stats Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          {
            label: "Satisfaction",
            value: `${dashboard.satisfactionPct}%`,
            Icon: ThumbsUp,
            color: "text-green-600",
          },
          { label: "Unread", value: dashboard.unreadCount, Icon: Mail, color: "text-amber-600" },
          {
            label: "Rate Limits",
            value: dashboard.rateLimits.reduce((a, r) => a + r.count, 0),
            Icon: RefreshCw,
            color: "text-orange-500",
          },
          {
            label: "Messages",
            value: dashboard.platformStats.totalMessages.toLocaleString(),
            Icon: MessageSquare,
            color: "text-teal-600",
          },
        ].map(({ label, value, Icon, color }) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">
                {label}
              </p>
              <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color} flex-shrink-0`} />
            </div>
            <p className={`font-serif text-xl sm:text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 sm:gap-2 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => dashboard.setTab(t.id as any)}
              className={`snap-start flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-[10px] sm:text-xs font-bold font-mono uppercase tracking-wider rounded-xl border transition-all whitespace-nowrap flex-shrink-0 min-h-[36px] sm:min-h-[40px] ${
                dashboard.tab === t.id
                  ? "border-primary text-primary bg-primary/5 font-extrabold shadow-sm"
                  : "border-border/60 text-muted-foreground bg-transparent hover:text-foreground hover:border-border hover:bg-accent/30"
              }`}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{t.label}</span>
              {"badge" in t && t.badge > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground leading-none">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {dashboard.tab === "users" && (
        <AdminUsersTab
          filtered={dashboard.filtered}
          profileState={dashboard.profileState}
          search={dashboard.search}
          setSearch={dashboard.setSearch}
          updating={dashboard.updating}
          counts={dashboard.counts}
          handleRoleChange={dashboard.handleRoleChange}
        />
      )}
      {dashboard.tab === "escalations" && (
        <AdminEscalationsTab
          escalations={dashboard.escalations}
          filteredEscalations={dashboard.filteredEscalations}
          escalationFilter={dashboard.escalationFilter}
          setEscalationFilter={dashboard.setEscalationFilter}
        />
      )}
      {dashboard.tab === "feedback" && <AdminFeedbackTab feedback={dashboard.feedback} />}
      {dashboard.tab === "messages" && (
        <AdminMessagesTab
          messages={dashboard.messages}
          expandedMsg={dashboard.expandedMsg}
          setExpandedMsg={dashboard.setExpandedMsg}
          updatingMsg={dashboard.updatingMsg}
          handleStatusChange={dashboard.handleStatusChange}
        />
      )}
      {dashboard.tab === "ratelimits" && (
        <AdminRateLimitsTab
          rateLimits={dashboard.rateLimits}
          filteredRateLimits={dashboard.filteredRateLimits}
          rlSearch={dashboard.rlSearch}
          setRlSearch={dashboard.setRlSearch}
        />
      )}
      {dashboard.tab === "subscriptions" && (
        <AdminSubscriptionsTab
          filteredForPlans={dashboard.filteredForPlans}
          profileState={dashboard.profileState}
          payments={dashboard.payments}
          planSearch={dashboard.planSearch}
          setPlanSearch={dashboard.setPlanSearch}
          planCounts={dashboard.planCounts}
          mrr={dashboard.mrr}
          totalRevenue={dashboard.totalRevenue}
          activeSubs={dashboard.activeSubs}
          expiringSoon={dashboard.expiringSoon}
          updatingPlan={dashboard.updatingPlan}
          resettingLimit={dashboard.resettingLimit}
          handlePlanChange={dashboard.handlePlanChange}
          handleResetLimit={dashboard.handleResetLimit}
        />
      )}
      {dashboard.tab === "newsletter" && <AdminNewsletterTab newsletter={dashboard.newsletter} />}
      {dashboard.tab === "globalnotes" && <AdminGlobalNotes />}
      {dashboard.tab === "settings_analytics" && <AdminSettingsAnalyticsTab />}
    </div>
  );
}
