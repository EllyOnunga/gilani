import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/async";
import { PLANS, type PlanId } from "@/lib/plans";
import type {
  Profile,
  Escalation,
  PlatformStats,
  ContactMessage,
  MessageFeedback,
  NewsletterSubscriber,
  RateLimitRow,
  Payment,
  AdminTab,
} from "@/components/admin/types";
import { ROLES } from "@/components/admin/types";

type ServerFns = {
  listProfiles: () => Promise<Profile[]>;
  listEscalations: () => Promise<Escalation[]>;
  listPlatformStats: () => Promise<PlatformStats>;
  listContactMessages: () => Promise<ContactMessage[]>;
  listFeedback: () => Promise<MessageFeedback[]>;
  listNewsletterSubscribers: () => Promise<NewsletterSubscriber[]>;
  listRateLimits: () => Promise<RateLimitRow[]>;
  listPayments: () => Promise<Payment[]>;
  updateRole: (args: { data: { userId: string; role: string } }) => Promise<void>;
  updateMessageStatus: (args: {
    data: { id: string; status: "unread" | "read" | "resolved" };
  }) => Promise<void>;
  updateUserPlan: (args: {
    data: { userId: string; plan: any; planExpiry: string | null };
  }) => Promise<void>;
  resetUserRateLimit: (args: { data: { userId: string } }) => Promise<void>;
};

export function useAdminDashboard(serverFns: ServerFns) {
  const [loadingData, setLoadingData] = useState(true);
  const [profileState, setProfileState] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [feedback, setFeedback] = useState<MessageFeedback[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimitRow[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [newsletter, setNewsletter] = useState<NewsletterSubscriber[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalConversations: 0,
    totalMessages: 0,
    totalNotes: 0,
    totalEscalations: 0,
    openEscalations: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  // UI state
  const [search, setSearch] = useState("");
  const [planSearch, setPlanSearch] = useState("");
  const [rlSearch, setRlSearch] = useState("");
  const [tab, setTab] = useState<AdminTab>("users");
  const [escalationFilter, setEscalationFilter] = useState<"all" | "open" | "resolved" | "pending">(
    "all",
  );
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);

  // Action loading states
  const [updating, setUpdating] = useState<string | null>(null);
  const [updatingMsg, setUpdatingMsg] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [resettingLimit, setResettingLimit] = useState<string | null>(null);

  // Newsletter compose state
  const [nlSubject, setNlSubject] = useState("");
  const [nlBody, setNlBody] = useState("");
  const [nlSending, setNlSending] = useState(false);
  const [nlSent, setNlSent] = useState<{ sent: number; total: number } | null>(null);

  const loadDashboardData = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const [profiles, contactMsgs, fb, rl, pay, esc, stats, nl] = await Promise.all([
          serverFns.listProfiles(),
          serverFns.listContactMessages(),
          serverFns.listFeedback(),
          serverFns.listRateLimits(),
          serverFns.listPayments(),
          serverFns.listEscalations(),
          serverFns.listPlatformStats(),
          serverFns.listNewsletterSubscribers(),
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
    },
    [serverFns],
  );

  // ── Derived / memos ─────────────────────────────────────────────────────────
  const unreadCount = messages.filter((m) => m.status === "unread").length;
  const satisfactionPct =
    feedback.length > 0
      ? Math.round((feedback.filter((f) => f.vote === 1).length / feedback.length) * 100)
      : 0;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q
      ? profileState
      : profileState.filter(
          (p) =>
            p.display_name?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q) ||
            p.role.toLowerCase().includes(q),
        );
  }, [profileState, search]);

  const filteredEscalations = useMemo(
    () =>
      escalationFilter === "all"
        ? escalations
        : escalations.filter((e) => e.status === escalationFilter),
    [escalations, escalationFilter],
  );

  const filteredRateLimits = useMemo(() => {
    const q = rlSearch.toLowerCase();
    return !q ? rateLimits : rateLimits.filter((r) => r.key.toLowerCase().includes(q));
  }, [rateLimits, rlSearch]);

  const filteredForPlans = useMemo(() => {
    const q = planSearch.toLowerCase();
    return !q
      ? profileState
      : profileState.filter(
          (p) =>
            p.display_name?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q) ||
            (p.plan ?? "free").toLowerCase().includes(q),
        );
  }, [profileState, planSearch]);

  const counts = ROLES.reduce(
    (acc, r) => {
      acc[r] = profileState.filter((p) => p.role === r).length;
      return acc;
    },
    {} as Record<(typeof ROLES)[number], number>,
  );

  const planCounts = (Object.keys(PLANS) as PlanId[]).reduce(
    (acc, pid) => {
      acc[pid] = profileState.filter((u) => (u.plan ?? "free") === pid).length;
      return acc;
    },
    {} as Record<PlanId, number>,
  );

  const mrr = (Object.keys(PLANS) as PlanId[]).reduce(
    (sum, pid) => sum + PLANS[pid].price * planCounts[pid],
    0,
  );
  const totalRevenue = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const activeSubs = profileState.filter((u) => {
    if (u.plan === "free" || !u.plan_expiry) return false;
    const d = new Date(u.plan_expiry);
    return !isNaN(d.getTime()) && d > new Date();
  }).length;

  const expiringSoon = profileState.filter((u) => {
    if (!u.plan_expiry || u.plan === "free") return false;
    const d = new Date(u.plan_expiry);
    if (isNaN(d.getTime())) return false;
    const days = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 7;
  }).length;

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleRoleChange = async (userId: string, role: string) => {
    setUpdating(userId);
    try {
      await serverFns.updateRole({ data: { userId, role } });
      setProfileState((prev) => prev.map((p) => (p.id === userId ? { ...p, role } : p)));
      toast.success(`Role updated to ${role}`);
      loadDashboardData(true);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to update role."));
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusChange = async (id: string, status: "unread" | "read" | "resolved") => {
    setUpdatingMsg(id);
    try {
      await serverFns.updateMessageStatus({ data: { id, status } });
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
      toast.success(`Marked as ${status}`);
      loadDashboardData(true);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to update status."));
    } finally {
      setUpdatingMsg(null);
    }
  };

  const handlePlanChange = async (userId: string, plan: string) => {
    setUpdatingPlan(userId);
    try {
      const expiry =
        plan === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await serverFns.updateUserPlan({ data: { userId, plan: plan as any, planExpiry: expiry } });
      setProfileState((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, plan, plan_expiry: expiry } : p)),
      );
      toast.success(`Plan updated to ${PLANS[plan as PlanId]?.label ?? plan}`);
      loadDashboardData(true);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to update plan."));
    } finally {
      setUpdatingPlan(null);
    }
  };

  const handleResetLimit = async (userId: string) => {
    if (
      !confirm(
        "Reset this user's rate limit counters? They will immediately get their full daily quota back.",
      )
    )
      return;
    setResettingLimit(userId);
    try {
      await serverFns.resetUserRateLimit({ data: { userId } });
      toast.success("Rate limit reset — user can send messages again.");
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to reset rate limit."));
    } finally {
      setResettingLimit(null);
    }
  };

  return {
    // Data
    loadingData,
    profileState,
    messages,
    feedback,
    rateLimits,
    payments,
    escalations,
    newsletter,
    platformStats,
    refreshing,
    // UI state
    search,
    setSearch,
    planSearch,
    setPlanSearch,
    rlSearch,
    setRlSearch,
    tab,
    setTab,
    escalationFilter,
    setEscalationFilter,
    expandedMsg,
    setExpandedMsg,
    // Action loading states
    updating,
    updatingMsg,
    updatingPlan,
    resettingLimit,
    // Newsletter
    nlSubject,
    setNlSubject,
    nlBody,
    setNlBody,
    nlSending,
    setNlSending,
    nlSent,
    setNlSent,
    // Derived
    unreadCount,
    satisfactionPct,
    filtered,
    filteredEscalations,
    filteredRateLimits,
    filteredForPlans,
    counts,
    planCounts,
    mrr,
    totalRevenue,
    activeSubs,
    expiringSoon,
    // Actions
    loadDashboardData,
    handleRoleChange,
    handleStatusChange,
    handlePlanChange,
    handleResetLimit,
  };
}
