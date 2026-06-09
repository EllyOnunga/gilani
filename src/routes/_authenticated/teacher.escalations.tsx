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
} from "lucide-react";
import { toast } from "sonner";
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
      "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
  },
  student_request: {
    label: "Student request",
    color:
      "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
  },
  low_confidence: {
    label: "Low confidence",
    color:
      "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
  },
};

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
        if (mounted) toast.error(err?.message ?? "Failed to load escalations");
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
        toast.error(err?.message ?? "Failed to load messages");
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
      toast.error(err?.message ?? "Failed to resolve");
    } finally {
      setSaving(false);
    }
  };

  const pending = escalations.filter((e) => e.status !== "resolved");
  const resolved = escalations.filter((e) => e.status === "resolved");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8 lg:p-12">
      {/* Header */}
      <header className="animate-in-slide">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          Teacher Portal
        </p>
        <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Student Escalations</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review flagged conversations and provide expert guidance to students.
        </p>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total", value: escalations.length, icon: MessageSquare },
          { label: "Pending", value: pending.length, icon: Clock },
          { label: "Resolved", value: resolved.length, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-4 shadow-sm text-center"
          >
            <Icon className="mx-auto h-5 w-5 text-primary mb-2" />
            <p className="font-serif text-3xl font-bold">{value}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {!loading && escalations.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 sm:p-16 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-serif text-xl text-muted-foreground">No escalations yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Flagged conversations will appear here automatically.
          </p>
        </div>
      )}
      {loading && (
        <div className="flex flex-col items-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading escalations…</p>
        </div>
      )}

      {/* Pending escalations */}
      {pending.length > 0 && (
        <section className="space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Pending ({pending.length})
          </p>
          {pending.map((esc) => {
            const reasonMeta = REASON_LABELS[esc.reason] ?? {
              label: esc.reason,
              color: "text-muted-foreground bg-muted border-border",
            };
            const isOpen = activeId === esc.id;
            return (
              <div
                key={esc.id}
                className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between p-4 sm:p-5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${reasonMeta.color}`}
                      >
                        {reasonMeta.label}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        Thread: {esc.conversation_id ? esc.conversation_id.slice(0, 8) : ""}…
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {esc.created_at ? new Date(esc.created_at).toLocaleString("en-KE") : "—"}
                    </p>
                  </div>
                  <button
                    onClick={() => (isOpen ? setActiveId(null) : open(esc.id))}
                    className="flex-shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors"
                  >
                    {isOpen ? "Collapse" : "Respond"}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-border px-5 pb-5 pt-4 space-y-3 animate-in-slide">
                    {/* Conversation History */}
                    <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground block">
                      Conversation History
                    </label>
                    {loadingMessages ? (
                      <div className="flex items-center gap-2 py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Loading messages…</span>
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                        {convoMessages.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No messages found.</p>
                        ) : (
                          convoMessages.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex flex-col gap-0.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
                            >
                              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                                {msg.role === "user" ? "Student" : "GilaniAI"}
                              </span>
                              <div
                                className={`rounded-lg px-3 py-2 text-xs max-w-[85%] leading-relaxed ${
                                  msg.role === "user"
                                    ? "bg-primary/10 text-foreground"
                                    : "bg-card border border-border text-foreground"
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground block">
                      Expert Answer
                    </label>
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      rows={5}
                      placeholder="Write a clear, educational response that will help the student…"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setActiveId(null)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResolve(esc.id)}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition-colors"
                      >
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Resolved escalations */}
      {resolved.length > 0 && (
        <section className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Resolved ({resolved.length})
          </p>
          {resolved.map((esc) => (
            <div
              key={esc.id}
              className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-950/30 p-4 opacity-80"
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  Thread: {esc.conversation_id ? esc.conversation_id.slice(0, 8) : ""}…
                </span>
                <span className="rounded-full border border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-green-700 dark:text-green-400">
                  Resolved
                </span>
              </div>
              {esc.detail && (
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  "{esc.detail.slice(0, 200)}
                  {esc.detail.length > 200 ? "…" : ""}"
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
