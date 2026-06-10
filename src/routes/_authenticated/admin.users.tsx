import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { Settings, UserCheck, Loader2, Shield, GraduationCap, User, MessageSquare, Mail, Clock, CheckCircle, Inbox, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  display_name: string | null;
  curriculum: string | null;
  created_at: string | null;
  role: string;
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

// ─── Server Functions ──────────────────────────────────────────────────────────

const listProfiles = createServerFn({ method: "GET" }).handler(async () => {
  // SECURITY: Use proper SSR auth via request header
  const request = getRequest();
  let authResult;
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return [];
  try {
    authResult = await authenticateRequest(request);
  } catch (err) {
    return [];
  }

  const { userId } = authResult;

  // SECURITY: Verify admin role before returning all profiles
  const { data: roleCheck, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .single();

  if (roleError || !roleCheck) {
    throw new Error("Forbidden: Admin access required");
  }

  // Fetch profiles
  const { data: profiles, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, curriculum, created_at")
    .order("created_at", { ascending: false });
  if (pErr) throw new Error(pErr.message);

  // Fetch roles
  const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
  const roleMap: Record<string, string> = {};
  for (const r of roles ?? []) roleMap[r.user_id] = r.role;

  return (profiles ?? []).map((p) => ({
    ...p,
    role: roleMap[p.id] ?? "student",
  })) as Profile[];
});

const listContactMessages = createServerFn({ method: "GET" }).handler(async () => {
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
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactMessage[];
});

const updateMessageStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), status: z.enum(["unread", "read", "resolved"]) }))
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch {
      throw new Error("Unauthorized");
    }
    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", authResult.userId).eq("role", "admin").single();
    if (!roleCheck) throw new Error("Forbidden");
    const { error } = await supabaseAdmin
      .from("contact_messages").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
  });

const updateRole = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string(), role: z.string() }))
  .handler(async ({ data }) => {
    const { userId, role } = data;

    // SECURITY: Use proper SSR auth via request header
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }

    const { userId: adminUserId } = authResult;

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .single();

    if (!roleCheck) {
      throw new Error("Forbidden: Admin access required");
    }

    // SECURITY: Prevent self-demotion from admin
    if (adminUserId === userId && role !== "admin") {
      throw new Error("Cannot remove your own admin role");
    }

    // Upsert into user_roles
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: role as any }, { onConflict: "user_id" });
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
    .select("*, profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as MessageFeedback[];
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
  loader: async () => {
    const [profiles, messages, feedback] = await Promise.all([listProfiles(), listContactMessages(), listFeedback()]);
    return { profiles: profiles as Profile[], messages: messages as ContactMessage[], feedback: feedback as MessageFeedback[] };
  },
  component: AdminUsersPage,
});

// ─── Component ─────────────────────────────────────────────────────────────────

const ROLES = ["student", "teacher", "admin"] as const;
type Role = (typeof ROLES)[number];

const ROLE_META: Record<Role, { icon: typeof User; color: string }> = {
  student: { icon: GraduationCap, color: "text-blue-600 bg-blue-50 border-blue-200" },
  teacher: { icon: UserCheck,     color: "text-amber-600 bg-amber-50 border-amber-200" },
  admin:   { icon: Shield,        color: "text-red-600 bg-red-50 border-red-200" },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  unread:   { label: "Unread",   color: "text-blue-600 bg-blue-50 border-blue-200" },
  read:     { label: "Read",     color: "text-amber-600 bg-amber-50 border-amber-200" },
  resolved: { label: "Resolved", color: "text-green-600 bg-green-50 border-green-200" },
};

function AdminUsersPage() {
  const loaderData = Route.useLoaderData() as { profiles: Profile[]; messages: ContactMessage[]; feedback: MessageFeedback[] };
  const profiles = loaderData?.profiles || [];
  const initialMessages = loaderData?.messages || [];
  const feedback = loaderData?.feedback || [];
  const [profileState, setProfileState] = useState<Profile[]>(profiles);
  const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updatingMsg, setUpdatingMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"users" | "messages">("users");
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const unreadCount = messages.filter((m) => m.status === "unread").length;

  const filtered = profileState.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.display_name?.toLowerCase().includes(q) || p.role.toLowerCase().includes(q);
  });

  const handleRoleChange = async (userId: string, role: string) => {
    setUpdating(userId);
    try {
      await updateRole({ data: { userId, role } });
      setProfileState((prev) => prev.map((p) => (p.id === userId ? { ...p, role } : p)));
      toast.success(`Role updated to ${role}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update role");
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
      toast.error(err?.message ?? "Failed to update status");
    } finally {
      setUpdatingMsg(null);
    }
  };

  const counts = ROLES.reduce(
    (acc, r) => { acc[r] = profileState.filter((p) => p.role === r).length; return acc; },
    {} as Record<Role, number>,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8 lg:p-12">
      {/* Header */}
      <header>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Admin Panel</p>
        <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">Manage users, roles, and contact messages.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-colors ${tab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <User className="h-3.5 w-3.5" /> Users & Roles
        </button>
        <button
          onClick={() => setTab("messages")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-colors ${tab === "messages" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Contact Messages
          {unreadCount > 0 && (
            <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Users tab ── */}
      {tab === "users" && (
        <>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {ROLES.map((r) => {
              const { icon: Icon, color } = ROLE_META[r];
              return (
                <div key={r} className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                  <Icon className={`mx-auto h-5 w-5 mb-2 ${color.split(" ")[0]}`} />
                  <p className="font-serif text-3xl font-bold">{counts[r]}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1 capitalize">{r}s</p>
                </div>
              );
            })}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or role…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["User","Curriculum","Joined","Role"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="py-12 text-center font-serif text-muted-foreground">No users found</td></tr>
                  )}
                  {filtered.map((p) => {
                    const meta = ROLE_META[p.role as Role] ?? ROLE_META.student;
                    const isUpdating = updating === p.id;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold">{p.display_name ?? "—"}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">ID: {p.id.slice(0, 8)}…</p>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.curriculum ?? "—"}</td>
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${meta.color}`}>{p.role}</span>
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
      {(tab as any) === "feedback" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <ThumbsUp className="mx-auto h-5 w-5 mb-2 text-green-500" />
              <p className="font-serif text-3xl font-bold">{feedback.filter((f) => f.vote === 1).length}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Positive</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
              <ThumbsDown className="mx-auto h-5 w-5 mb-2 text-destructive" />
              <p className="font-serif text-3xl font-bold">{feedback.filter((f) => f.vote === -1).length}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Negative</p>
            </div>
          </div>

          {feedback.length === 0 && (
            <div className="rounded-xl border border-border bg-card py-16 text-center">
              <ThumbsUp className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="font-serif text-muted-foreground">No feedback yet</p>
            </div>
          )}

          {feedback.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["User", "Vote", "Message ID", "Date"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.map((f) => (
                      <tr key={f.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold">{f.profiles?.display_name ?? "—"}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{f.user_id.slice(0, 8)}…</p>
                        </td>
                        <td className="px-5 py-3">
                          {f.vote === 1
                            ? <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 font-mono text-[9px] text-green-700"><ThumbsUp className="h-3 w-3" /> Good</span>
                            : <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 font-mono text-[9px] text-red-700"><ThumbsDown className="h-3 w-3" /> Bad</span>
                          }
                        </td>
                        <td className="px-5 py-3 font-mono text-[10px] text-muted-foreground">{f.message_id.slice(0, 12)}…</td>
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                          {new Date(f.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
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
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {(["unread","read","resolved"] as const).map((s) => (
              <div key={s} className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
                <p className="font-serif text-3xl font-bold">{messages.filter((m) => m.status === s).length}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1 capitalize">{s}</p>
              </div>
            ))}
          </div>

          {messages.length === 0 && (
            <div className="rounded-xl border border-border bg-card py-16 text-center">
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
                  className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-accent/20 transition-colors"
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
                      {new Date(m.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <span className="text-muted-foreground text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-border/50 space-y-4">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pt-4">{m.message}</p>
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-2">Mark as:</p>
                      {(["unread","read","resolved"] as const).map((s) => (
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
    </div>
  );
}
