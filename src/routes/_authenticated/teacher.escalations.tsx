import { useMemo } from "react";
import { GilaniLoader } from "@/components/GilaniLoader";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTransactionalEmail, emailTemplate } from "@/lib/email.server";
import {
  ShieldAlert,
  CheckCircle2,
  MessageSquare,
  Clock,
  AlertTriangle,
  Menu,
  RefreshCw,
} from "lucide-react";
import { useLayout } from "@/contexts/layout-context";
import { NotificationBell } from "@/components/notifications";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";

import { useTeacherEscalations } from "@/components/teacher/hooks/useTeacherEscalations";
import { EscalationCard } from "@/components/teacher/escalations/EscalationCard";
import { EscalationDetail } from "@/components/teacher/escalations/EscalationDetail";

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

  const { data: roleCheck, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["teacher", "admin"])
    .single();

  if (roleError || !roleCheck) throw new Error("Forbidden: Teacher access required");

  const { data: escalationsData, error } = await supabaseAdmin
    .from("escalations")
    .select("*")
    .eq("reviewer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const userIds = [...new Set((escalationsData ?? []).map((e: any) => e.user_id).filter(Boolean))];
  let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: pd } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);
    profileMap = Object.fromEntries(
      (pd ?? []).map((p: any) => [
        p.id,
        { display_name: p.display_name, avatar_url: p.avatar_url },
      ]),
    );
  }

  return (escalationsData ?? []).map((e: any) => ({
    ...e,
    student_name: profileMap[e.user_id]?.display_name || "Student",
    student_avatar: profileMap[e.user_id]?.avatar_url || null,
  })) as any[];
});

const resolveEscalation = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), expertAnswer: z.string() }))
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

    if (!roleCheck) throw new Error("Forbidden: Teacher access required");

    const { data: esc, error: escErr } = await supabaseAdmin
      .from("escalations")
      .select("conversation_id, user_id, reviewer_id")
      .eq("id", id)
      .single();
    if (escErr) throw new Error(escErr.message);
    const isAdmin = roleCheck.role === "admin";
    if (!isAdmin && esc.reviewer_id !== userId)
      throw new Error("Forbidden: You are not assigned to this escalation");

    const { error } = await supabaseAdmin
      .from("escalations")
      .update({ status: "resolved", detail: expertAnswer } as any)
      .eq("id", id);
    if (error) throw new Error(error.message);

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
        const appUrl = process.env.APP_URL || "https://gilaniai.site";
        if (studentEmail) {
          await sendTransactionalEmail({
            to: studentEmail,
            subject: "Your teacher has reviewed your study session 📚",
            fromEmail: "noreply@gilaniai.site",
            html: emailTemplate({
              heading: `Hi ${studentName}, your teacher has responded!`,
              body: `Your escalated study session has been reviewed by a teacher. Their response has been added to your conversation. Log in to GilaniAI to continue learning.`,
              buttonText: "View Response",
              buttonUrl: `${appUrl}/login?redirect=/tutor/${esc.conversation_id}`,
              footerNote:
                "You are receiving this because you requested a teacher review on GilaniAI.",
            }),
          }).catch((err: any) => console.error("[Student Email] Failed:", err));
        }
      } catch (err) {
        console.error("[Student Notify] Failed to send student email:", err);
      }
    }

    if (esc?.conversation_id) {
      const teacherText = `👨‍🏫 **Teacher Review:**\n${expertAnswer}`;
      const { error: msgErr } = await supabaseAdmin.from("messages").insert({
        conversation_id: esc.conversation_id,
        role: "assistant",
        content: teacherText,
        parts: JSON.stringify([{ type: "text", text: teacherText }]),
        user_id: esc.user_id,
      } as any);
      if (msgErr)
        console.error("Failed to sync teacher response to messages table:", msgErr.message);
    }
  });

const saveEscalationDraft = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), draftAnswer: z.string() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;
    const { id, draftAnswer } = data;

    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["teacher", "admin"])
      .single();

    if (!roleCheck) throw new Error("Forbidden: Teacher access required");

    const { data: esc, error: escErr } = await supabaseAdmin
      .from("escalations")
      .select("reviewer_id")
      .eq("id", id)
      .single();
    if (escErr) throw new Error(escErr.message);
    const isAdmin = roleCheck.role === "admin";
    if (!isAdmin && esc.reviewer_id !== userId)
      throw new Error("Forbidden: You are not assigned to this escalation");

    const { error } = await supabaseAdmin
      .from("escalations")
      .update({ draft_answer: draftAnswer, draft_updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) throw new Error(error.message);
  });

const getConversationMessages = createServerFn({ method: "POST" })
  .validator(z.object({ conversationId: z.string() }))
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
      throw redirect({ to: "/login", search: { redirect: location.href, signout: undefined } });
    }
    const { data: roleCheck } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id)
      .in("role", ["teacher", "admin"])
      .maybeSingle();
    if (!roleCheck) {
      throw redirect({ to: "/tutor" as any });
    }
  },
  head: () => ({
    meta: [{ title: "Escalations — GilaniAI" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: EscalationsPage,
});

// ─── Main Page ────────────────────────────────────────────────────────────────

function EscalationsPage() {
  const { setSidebarOpen, user } = useLayout();
  const serverFns = useMemo(
    () => ({ listEscalations, resolveEscalation, getConversationMessages, saveEscalationDraft }),
    [listEscalations, resolveEscalation, getConversationMessages, saveEscalationDraft],
  );
  const esc = useTeacherEscalations(serverFns);

  const activeEscalation = esc.escalations.find((e) => e.id === esc.activeId) || null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-10">
      {/* ── Header ── */}
      <div className="flex lg:hidden items-center justify-between h-14 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-2 border-b border-border/60">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors active:scale-95"
          title="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {user?.id ? <NotificationBell userId={user.id} /> : null}
      </div>
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
            onClick={() => esc.loadEscalations(true)}
            disabled={esc.refreshing}
            className="flex items-center gap-2 self-start sm:self-auto rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${esc.refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </header>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Escalations",
            value: esc.escalations.length,
            icon: MessageSquare,
            color: "text-primary",
            bg: "border-primary/20 bg-primary/[0.02]",
          },
          {
            label: "Pending Review",
            value: esc.pending.length,
            icon: Clock,
            color: "text-amber-600 dark:text-amber-400",
            bg: "border-amber-200/60 dark:border-amber-800/60 bg-amber-500/[0.02]",
          },
          {
            label: "Resolved",
            value: esc.resolved.length,
            icon: CheckCircle2,
            color: "text-green-600 dark:text-green-400",
            bg: "border-green-200/60 dark:border-green-800/60 bg-green-500/[0.02]",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className={`rounded-xl border p-4 sm:p-5 shadow-xs flex items-center justify-between ${bg}`}
          >
            <div className="space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {label}
              </p>
              <p className={`font-serif text-3xl font-black ${color}`}>{value}</p>
            </div>
            <div
              className={`rounded-full p-2.5 bg-background/50 border border-border/20 shadow-inner flex items-center justify-center ${color}`}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ── */}
      {esc.escalations.length > 0 && (
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
          {(["all", "pending", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => esc.setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors cursor-pointer ${esc.filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f}{" "}
              <span className="text-[10px] opacity-60">
                (
                {f === "all"
                  ? esc.escalations.length
                  : f === "pending"
                    ? esc.pending.length
                    : esc.resolved.length}
                )
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-6 lg:items-start">
        <div className="space-y-6 min-w-0">
          {/* ── Loading skeleton ── */}
          {esc.loading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-border p-4 sm:p-5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted/60" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded bg-muted/60" />
                      <div className="h-2.5 w-1/2 rounded bg-muted/40" />
                    </div>
                    <div className="h-5 w-16 rounded-full bg-muted/40" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Error state ── */}
          {!esc.loading && esc.error && esc.escalations.length === 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-6 sm:p-12 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-7 w-7 text-destructive/70" />
              </div>
              <p className="font-serif text-xl font-medium text-foreground">
                Couldn't load escalations
              </p>
              <p className="text-sm text-muted-foreground mt-1">{esc.error}</p>
              <button
                onClick={() => esc.loadEscalations()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-accent transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          )}

          {/* ── Empty state ── */}
          {!esc.loading && !esc.error && esc.filteredEscalations.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 sm:p-12 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <ShieldAlert className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="font-serif text-xl font-medium text-muted-foreground">
                {esc.filter === "all" ? "All clear" : `No ${esc.filter} escalations`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {esc.filter === "all"
                  ? "No escalations assigned to you yet."
                  : `There are no ${esc.filter} escalations at the moment.`}
              </p>
            </div>
          )}

          {/* ── Urgent (distress) ── */}
          {esc.filter !== "resolved" && esc.pendingUrgent.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <p className="font-mono text-[11px] uppercase tracking-widest text-red-600 dark:text-red-400 font-bold">
                  Urgent — Distress ({esc.pendingUrgent.length})
                </p>
              </div>
              {esc.pendingUrgent.map((e) => (
                <EscalationCard
                  key={e.id}
                  esc={e}
                  isOpen={esc.activeId === e.id}
                  onOpen={() => (esc.activeId === e.id ? esc.setActiveId(null) : esc.open(e.id))}
                  convoMessages={esc.convoMessages}
                  loadingMessages={esc.loadingMessages}
                  answer={esc.answer}
                  setAnswer={esc.handleAnswerChange}
                  saving={esc.saving}
                  onResolve={esc.handleResolve}
                  onCancel={() => esc.setActiveId(null)}
                  urgent
                />
              ))}
            </section>
          )}

          {/* ── Pending ── */}
          {esc.filter !== "resolved" && esc.pendingOther.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Pending ({esc.pendingOther.length})
                </p>
              </div>
              {esc.pendingOther.map((e) => (
                <EscalationCard
                  key={e.id}
                  esc={e}
                  isOpen={esc.activeId === e.id}
                  onOpen={() => (esc.activeId === e.id ? esc.setActiveId(null) : esc.open(e.id))}
                  convoMessages={esc.convoMessages}
                  loadingMessages={esc.loadingMessages}
                  answer={esc.answer}
                  setAnswer={esc.handleAnswerChange}
                  saving={esc.saving}
                  onResolve={esc.handleResolve}
                  onCancel={() => esc.setActiveId(null)}
                />
              ))}
            </section>
          )}

          {/* ── Resolved ── */}
          {esc.filter !== "pending" && esc.resolved.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Resolved ({esc.resolved.length})
                </p>
              </div>
              <div className="space-y-2">
                {esc.resolved.map((e) => (
                  <EscalationCard
                    key={e.id}
                    esc={e}
                    isOpen={esc.activeId === e.id}
                    onOpen={() => (esc.activeId === e.id ? esc.setActiveId(null) : esc.open(e.id))}
                    convoMessages={esc.convoMessages}
                    loadingMessages={esc.loadingMessages}
                    answer={esc.answer}
                    setAnswer={esc.handleAnswerChange}
                    saving={esc.saving}
                    onResolve={esc.handleResolve}
                    onCancel={() => esc.setActiveId(null)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Desktop detail panel ── */}
        <div className="hidden lg:block lg:sticky lg:top-6">
          {activeEscalation ? (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex items-center justify-between">
                <p className="font-sans text-sm font-bold text-foreground">
                  {activeEscalation.student_name || "Student"}
                </p>
                <button
                  onClick={() => esc.setActiveId(null)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Close
                </button>
              </div>
              <EscalationDetail
                esc={activeEscalation}
                convoMessages={esc.convoMessages}
                loadingMessages={esc.loadingMessages}
                answer={esc.answer}
                setAnswer={esc.handleAnswerChange}
                saving={esc.saving}
                onResolve={esc.handleResolve}
                onCancel={() => esc.setActiveId(null)}
                variant="panel"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Select an escalation to respond.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
