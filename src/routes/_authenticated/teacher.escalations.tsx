import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTransactionalEmail, emailTemplate } from "@/lib/email.server";
import { createResolutionNotification } from "@/lib/tutor.server-fns";
import {
  ShieldAlert,
  CheckCircle2,
  MessageSquare,
  Clock,
  AlertTriangle,
  Loader2,
  User,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Send,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/async";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Escalation = {
  id: string;
  conversation_id: string | null;
  reason: string;
  status: string;
  detail: string | null;
  created_at: string;
  user_id: string;
};
// ─── Server Functions ──────────────────────────────────────────────────────────

const listEscalations = createServerFn({ method: "POST" }).handler(async () => {
  const request = getRequest();
  let authResult;
  try {
    authResult = await authenticateRequest(request);
  } catch (err) {
    throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
  }
  const userId = authResult.userId;

  // SECURITY: Verify teacher/admin role before returning escalations
  const { data: roleCheck, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["teacher", "admin"])
    .single();

  if (roleError || !roleCheck) {
    throw new Error("Forbidden: Teacher access required");
  }

  const { data: escalationsData, error } = await supabaseAdmin
    .from("escalations")
    .select("*")
    .eq("reviewer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (escalationsData ?? []) as any[];
});

const resolveEscalation = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), expertAnswer: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;
    const { id, expertAnswer } = data;

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["teacher", "admin"])
      .single();

    if (!roleCheck) {
      throw new Error("Forbidden: Teacher access required");
    }

    // Fetch the escalation to get conversation and user info
    const { data: esc, error: escErr } = await supabaseAdmin
      .from("escalations")
      .select("conversation_id, user_id, reviewer_id")
      .eq("id", id)
      .single();
    if (escErr) throw new Error(escErr.message);
    const isAdmin = roleCheck.role === "admin";
    if (!isAdmin && esc.reviewer_id !== userId) {
      throw new Error("Forbidden: You are not assigned to this escalation");
    }

    const { error } = await supabaseAdmin
      .from("escalations")
      .update({ status: "resolved", detail: expertAnswer } as any)
      .eq("id", id);
    if (error) throw new Error(error.message);

    // Email student notification
    if (esc?.user_id) {
      try {
        const { data: studentUser } = await supabaseAdmin.auth.admin.getUserById(esc.user_id);
        const studentEmail = studentUser?.user?.email;
        const { data: studentProfile } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("id", esc.user_id)
          .single();
        const studentName = studentProfile?.display_name || "Student";
        const appUrl = process.env.APP_URL || "https://gilaniai.vercel.app";
        if (studentEmail) {
          await sendTransactionalEmail({
            to: studentEmail,
            subject: "Your teacher has reviewed your study session 📚",
            html: emailTemplate({
              heading: `Hi ${studentName}, your teacher has responded!`,
              body: `Your escalated study session has been reviewed by a teacher. Their response has been added to your conversation. Log in to GilaniAI to continue learning.`,
              buttonText: "View Response",
              buttonUrl: `${appUrl}/login?redirect=/tutor/${esc.conversation_id}`,
              footerNote: "You are receiving this because you requested a teacher review on GilaniAI.",
            }),
          }).catch((err: any) => console.error("[Student Email] Failed:", err));
        }
      } catch (err) {
        console.error("[Student Notify] Failed to send student email:", err);
      }
    }

    // Sync response to messages table as a teacher review message
    if (esc?.conversation_id) {
      const teacherText = `👨‍🏫 **Teacher Review:**\n${expertAnswer}`;
      const { error: msgErr } = await supabaseAdmin.from("messages").insert({
        conversation_id: esc.conversation_id,
        role: "assistant",
        content: teacherText,
        parts: JSON.stringify([{ type: "text", text: teacherText }]),
        user_id: esc.user_id, // Associate with student's user ID so RLS lets them view it
      } as any);
      if (msgErr)
        console.error("Failed to sync teacher response to messages table:", msgErr.message);
    }
  });

const getConversationMessages = createServerFn({ method: "POST" })
  .inputValidator(z.object({ conversationId: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;
    const { conversationId } = data;

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["teacher", "admin"])
      .single();

    if (!roleCheck) throw new Error("Forbidden: Teacher access required");

    const isAdmin = roleCheck.role === "admin";
    if (!isAdmin) {
      const { data: escCheck } = await supabaseAdmin
        .from("escalations")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("reviewer_id", userId)
        .single();
      if (!escCheck) throw new Error("Forbidden: You are not assigned to this conversation");
    }

    const { data: messages, error } = await supabaseAdmin
      .from("messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return messages ?? [];
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/teacher/escalations")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    const { data: roleCheck } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id)
      .in("role", ["teacher", "admin"])
      .maybeSingle();
    if (!roleCheck) {
      throw redirect({ to: "/dashboard" as any });
    }
  },
  head: () => ({
    meta: [{ title: "Escalations — GilaniAI" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: EscalationsPage,
});

// ─── Component ─────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  distress_keyword: {
    label: "Distress keyword",
    color:
      "text-red-600 dark:text-red-400 border-red-200 dark:border-red-900",
  },
  student_request: {
    label: "Student request",
    color:
      "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  },
  low_confidence: {
    label: "Low confidence",
    color:
      "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  },
};

// ─── EscalationCard Sub-component ────────────────────────────────────────────

function EscalationCard({
  esc, isOpen, onOpen, convoMessages, loadingMessages,
  answer, setAnswer, saving, onResolve, onCancel, urgent = false,
}: {
  esc: Escalation;
  isOpen: boolean;
  onOpen: () => void;
  convoMessages: any[];
  loadingMessages: boolean;
  answer: string;
  setAnswer: (v: string) => void;
  saving: boolean;
  onResolve: (id: string) => void;
  onCancel: () => void;
  urgent?: boolean;
}) {
  const reasonMeta = REASON_LABELS[esc.reason] ?? {
    label: esc.reason,
    color: "text-muted-foreground border-border",
  };
  return (
    <div className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow ${
      urgent ? "border-red-300 dark:border-red-800" : "border-border"
    } ${isOpen ? "shadow-md" : ""}`}>
      {/* Card header */}
      <button
        onClick={onOpen}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className={`flex-shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center ${
            urgent ? "bg-red-100 dark:bg-red-950/40" : "bg-muted/60"
          }`}>
            <User className={`h-4 w-4 ${urgent ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${reasonMeta.color}`}>
                {reasonMeta.label}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                #{esc.conversation_id ? esc.conversation_id.slice(0, 8) : "—"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {esc.created_at
                ? new Date(esc.created_at).toLocaleString("en-KE", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })
                : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            isOpen
              ? "border-border bg-muted text-muted-foreground"
              : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
          }`}>
            {isOpen ? "Collapse" : "Respond"}
          </span>
          {isOpen
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div className="border-t border-border animate-in-slide">
          {/* Conversation history */}
          <div className="px-4 sm:px-5 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Conversation History
              </p>
            </div>
            {loadingMessages ? (
              <div className="flex items-center gap-2 py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Loading messages…</span>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                {convoMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No messages found.</p>
                ) : (
                  convoMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <span className={`font-mono text-[9px] uppercase tracking-wider flex items-center gap-1 ${
                        msg.role === "user" ? "text-primary/70" : "text-muted-foreground"
                      }`}>
                        <User className="h-2.5 w-2.5" />
                        {msg.role === "user" ? "Student" : "GilaniAI"}
                      </span>
                      <div className={`rounded-xl px-3 py-2 text-xs max-w-[85%] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary/10 text-foreground rounded-tr-sm"
                          : "bg-card border border-border text-foreground rounded-tl-sm"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Expert answer */}
          <div className="px-4 sm:px-5 pb-5 pt-2 space-y-3 border-t border-border/50">
            <div className="flex items-center gap-2 pt-3">
              <Send className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Your Expert Response
              </p>
            </div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              placeholder="Write a clear, helpful response that will help the student understand the concept…"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed placeholder:text-muted-foreground/60"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] text-muted-foreground">
                {answer.trim().length} chars
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onResolve(esc.id)}
                  disabled={saving || !answer.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {saving
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CheckCircle2 className="h-3.5 w-3.5" />
                  }
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [convoMessages, setConvoMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const authRes = await supabase.auth.getSession();
        const session = authRes?.data?.session;
        if (!session?.user?.id) {
          if (mounted) setEscalations([]);
          return;
        }
        const rows = await listEscalations();
        if (mounted) setEscalations(rows as Escalation[]);
      } catch (err: any) {
        if (mounted) toast.error(friendlyError(err, "Failed to load escalations."));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const open = async (id: string) => {
    setActiveId(id);
    const existing = escalations.find((e) => e.id === id);
    setAnswer(existing?.detail ?? "");
    if (existing?.conversation_id) {
      setLoadingMessages(true);
      try {
        const authRes = await supabase.auth.getSession();
        const session = authRes?.data?.session;
        if (!session?.user?.id) return;
        const msgs = await getConversationMessages({
          data: { conversationId: existing.conversation_id },
        });
        setConvoMessages(msgs);
      } catch (err: any) {
        toast.error(friendlyError(err, "Failed to load messages."));
      } finally {
        setLoadingMessages(false);
      }
    }
  };

  const handleResolve = async (id: string) => {
    if (!answer.trim()) {
      toast.error("Please write an expert answer first.");
      return;
    }
    setSaving(true);
    try {
      const authRes = await supabase.auth.getSession();
      const session = authRes?.data?.session;
      if (!session?.user?.id) throw new Error("Not signed in");
      await resolveEscalation({ data: { id, expertAnswer: answer } });
      setEscalations((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "resolved", detail: answer } : e)),
      );
      setActiveId(null);
      toast.success("Escalation resolved.");
      // Notify student
      const esc = escalations.find((e) => e.id === id);
      if (esc?.conversation_id && esc?.user_id) {
        await createResolutionNotification({
          data: {
            studentId: esc.user_id,
            conversationId: esc.conversation_id,
          },
        });
      }
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to resolve escalation. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const pending = escalations.filter((e) => e.status !== "resolved");
  const resolved = escalations.filter((e) => e.status === "resolved");

  const pendingUrgent = pending.filter((e) => e.reason === "distress_keyword");
  const pendingOther = pending.filter((e) => e.reason !== "distress_keyword");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-10">

      {/* ── Header ── */}
      <header className="animate-in-slide">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
          Teacher Portal
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold">Student Escalations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review flagged conversations and provide expert guidance.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 self-start sm:self-auto rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: escalations.length, icon: MessageSquare, color: "text-primary", bg: "border-primary/20" },
          { label: "Pending", value: pending.length, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "border-amber-200/60 dark:border-amber-800/60" },
          { label: "Resolved", value: resolved.length, icon: CheckCircle2, color: "text-green-600 dark:text-green-400", bg: "border-green-200/60 dark:border-green-800/60" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 sm:p-5 ${bg}`}>
            <div className={`flex items-center gap-2 mb-2 ${color}`}>
              <Icon className="h-4 w-4" />
              <p className="font-mono text-[10px] uppercase tracking-widest">{label}</p>
            </div>
            <p className={`font-serif text-2xl sm:text-4xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center py-10 sm:py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading escalations…</p>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && escalations.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 sm:p-12 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <ShieldAlert className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="font-serif text-xl font-medium text-muted-foreground">All clear</p>
          <p className="text-sm text-muted-foreground mt-1">
            No escalations assigned to you yet.
          </p>
        </div>
      )}

      {/* ── Urgent (distress) ── */}
      {pendingUrgent.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-red-600 dark:text-red-400 font-bold">
              Urgent — Distress ({pendingUrgent.length})
            </p>
          </div>
          {pendingUrgent.map((esc) => (
            <EscalationCard
              key={esc.id}
              esc={esc}
              isOpen={activeId === esc.id}
              onOpen={() => (activeId === esc.id ? setActiveId(null) : open(esc.id))}
              convoMessages={convoMessages}
              loadingMessages={loadingMessages}
              answer={answer}
              setAnswer={setAnswer}
              saving={saving}
              onResolve={handleResolve}
              onCancel={() => setActiveId(null)}
              urgent
            />
          ))}
        </section>
      )}

      {/* ── Pending ── */}
      {pendingOther.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Pending ({pendingOther.length})
            </p>
          </div>
          {pendingOther.map((esc) => (
            <EscalationCard
              key={esc.id}
              esc={esc}
              isOpen={activeId === esc.id}
              onOpen={() => (activeId === esc.id ? setActiveId(null) : open(esc.id))}
              convoMessages={convoMessages}
              loadingMessages={loadingMessages}
              answer={answer}
              setAnswer={setAnswer}
              saving={saving}
              onResolve={handleResolve}
              onCancel={() => setActiveId(null)}
            />
          ))}
        </section>
      )}

      {/* ── Resolved ── */}
      {resolved.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Resolved ({resolved.length})
            </p>
          </div>
          <div className="space-y-2">
            {resolved.map((esc) => {
              const reasonMeta = REASON_LABELS[esc.reason] ?? { label: esc.reason, color: "text-muted-foreground border-border" };
              return (
                <div key={esc.id} className="rounded-xl border border-green-200/60 dark:border-green-900/60 bg-green-50/40 dark:bg-green-950/20 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${reasonMeta.color}`}>
                        {reasonMeta.label}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        #{esc.conversation_id ? esc.conversation_id.slice(0, 8) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {esc.created_at ? new Date(esc.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "—"}
                      </span>
                      <span className="rounded-full border border-green-300 dark:border-green-700 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-green-700 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
                      </span>
                    </div>
                  </div>
                  {esc.detail && (
                    <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-2">
                      "{esc.detail.slice(0, 200)}{esc.detail.length > 200 ? "…" : ""}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
