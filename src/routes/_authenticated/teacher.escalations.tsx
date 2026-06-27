import { GilaniLoader } from "@/components/GilaniLoader";
import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
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
  Eye,
  Edit3,
  Copy,
  Check,
  Keyboard,
} from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/async";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";
const MarkdownRenderer = lazy(() =>
  import("@/components/tutor/MarkdownRenderer").then((m) => ({ default: m.MarkdownRenderer }))
);

// ─── Types ─────────────────────────────────────────────────────────────────────

type Escalation = {
  id: string;
  conversation_id: string | null;
  reason: string;
  status: string;
  detail: string | null;
  created_at: string;
  user_id: string;
  student_name?: string;
  student_avatar?: string;
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
      ])
    );
  }

  return (escalationsData ?? []).map((e: any) => ({
    ...e,
    student_name: profileMap[e.user_id]?.display_name || "Student",
    student_avatar: profileMap[e.user_id]?.avatar_url || null,
  })) as any[];
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

// ─── Constants ─────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  distress_keyword: {
    label: "Distress keyword",
    color: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-900",
  },
  student_request: {
    label: "Student request",
    color: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  },
  low_confidence: {
    label: "Low confidence",
    color: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  },
};

const DRAFT_STORAGE_KEY = "gilani.teacher.escalation.drafts";

// ─── Draft Persistence Helpers ─────────────────────────────────────────────────

function loadDraft(escalationId: string): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return "";
    const drafts = JSON.parse(raw);
    return drafts[escalationId] || "";
  } catch {
    return "";
  }
}

function saveDraft(escalationId: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    const drafts = raw ? JSON.parse(raw) : {};
    if (value.trim()) {
      drafts[escalationId] = value;
    } else {
      delete drafts[escalationId];
    }
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch { }
}

function clearDraft(escalationId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;
    const drafts = JSON.parse(raw);
    delete drafts[escalationId];
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch { }
}

// ─── Copy Button Component ────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-500" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy
        </>
      )}
    </button>
  );
}

// ─── Message Bubble (with Markdown) ───────────────────────────────────────────

function MessageBubble({ msg }: { msg: any }) {
  const isUser = msg.role === "user";
  const isTeacherReview = msg.content?.startsWith("👨‍🏫 **Teacher Review:**");

  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <span
        className={`font-mono text-[9px] uppercase tracking-wider flex items-center gap-1 ${isUser
            ? "text-primary/70"
            : isTeacherReview
              ? "text-green-600 dark:text-green-400"
              : "text-muted-foreground"
          }`}
      >
        <User className="h-2.5 w-2.5" />
        {isUser ? "Student" : isTeacherReview ? "Teacher Review" : "GilaniAI"}
        {msg.created_at && (
          <span className="text-[8px] opacity-60 ml-1">
            {new Date(msg.created_at).toLocaleTimeString("en-KE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </span>
      <div
        className={`rounded-xl px-3 py-2 text-xs max-w-[85%] leading-relaxed prose-compact ${isUser
            ? "bg-primary/10 text-foreground rounded-tr-sm"
            : isTeacherReview
              ? "bg-green-50/60 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/60 text-foreground rounded-tl-sm"
              : "bg-card border border-border text-foreground rounded-tl-sm"
          }`}
      >
        {/* Use MarkdownRenderer for formatted content */}
        <Suspense fallback={<span className="text-xs text-muted-foreground">{isTeacherReview ? msg.content.replace(/^👨‍🏫 \*\*Teacher Review:\*\*\n?/, "") : msg.content}</span>}>
          <MarkdownRenderer
            content={
              isTeacherReview
                ? msg.content.replace(/^👨‍🏫 \*\*Teacher Review:\*\*\n?/, "")
                : msg.content
            }
            className="text-xs"
          />
        </Suspense>
      </div>
    </div>
  );
}

// ─── EscalationCard Sub-component ────────────────────────────────────────────

function EscalationCard({
  esc,
  isOpen,
  onOpen,
  convoMessages,
  loadingMessages,
  answer,
  setAnswer,
  saving,
  onResolve,
  onCancel,
  urgent = false,
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
  const [showPreview, setShowPreview] = useState(false);
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reasonMeta = REASON_LABELS[esc.reason] ?? {
    label: esc.reason,
    color: "text-muted-foreground border-border",
  };

  // Keyboard shortcut: Ctrl/Cmd + Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (answer.trim() && !saving) {
        onResolve(esc.id);
      }
    }
  };

  return (
    <div
      className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow ${urgent ? "border-red-300 dark:border-red-800" : "border-border"
        } ${isOpen ? "shadow-md" : ""}`}
    >
      {/* Card header */}
      <button
        onClick={onOpen}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 h-9 w-9 rounded-full overflow-hidden border border-border bg-background flex items-center justify-center shadow-inner">
            {esc.student_avatar ? (
              esc.student_avatar.startsWith("preset:") ? (
                <span className="font-serif text-xs font-bold text-primary capitalize">
                  {esc.student_name ? esc.student_name.substring(0, 2) : "ST"}
                </span>
              ) : (
                <img src={esc.student_avatar} alt="Avatar" className="h-full w-full object-cover" />
              )
            ) : (
              <span className="font-serif text-xs font-bold text-primary capitalize">
                {esc.student_name ? esc.student_name.substring(0, 2) : "ST"}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-sans text-sm font-bold text-foreground">
                {esc.student_name || "Student"}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${reasonMeta.color}`}
              >
                {reasonMeta.label}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                #{esc.conversation_id ? esc.conversation_id.slice(0, 8) : "—"}
              </span>
              {esc.status === "resolved" && (
                <span className="rounded-full border border-green-300 dark:border-green-700 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-green-700 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {esc.created_at
                ? new Date(esc.created_at).toLocaleString("en-KE", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
                : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${isOpen
                ? "border-border bg-muted text-muted-foreground"
                : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
              }`}
          >
            {isOpen ? "Collapse" : "Respond"}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div className="border-t border-border animate-in-slide">
          {/* Conversation history */}
          <div className="px-4 sm:px-5 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Conversation History
                </p>
              </div>
              <span className="font-mono text-[9px] text-muted-foreground">
                {convoMessages.length} message{convoMessages.length !== 1 ? "s" : ""}
              </span>
            </div>
            {loadingMessages ? (
              <div className="flex items-center gap-2 py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Loading messages…</span>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                {convoMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    No messages found.
                  </p>
                ) : (
                  convoMessages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
                )}
              </div>
            )}
          </div>

          {/* Expert answer */}
          <div className="px-4 sm:px-5 pb-5 pt-2 space-y-3 border-t border-border/50">
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2">
                <Send className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Your Expert Response
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowKeyboardHint(!showKeyboardHint)}
                  className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent transition-colors"
                  title="Keyboard shortcuts"
                >
                  <Keyboard className="h-3 w-3" />
                </button>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors ${!showPreview
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                      }`}
                  >
                    <Edit3 className="h-3 w-3" /> Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors border-l border-border ${showPreview
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                      }`}
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                </div>
              </div>
            </div>

            {showKeyboardHint && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground space-y-1">
                <p>
                  <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                    Ctrl
                  </kbd>{" "}
                  +{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                    Enter
                  </kbd>{" "}
                  — Submit response
                </p>
                <p>
                  Supports markdown:{" "}
                  <code className="text-primary">**bold**</code>,{" "}
                  <code className="text-primary">$math$</code>,{" "}
                  <code className="text-primary">```code```</code>
                </p>
              </div>
            )}

            {showPreview ? (
              <div className="min-h-[140px] rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed">
                {answer.trim() ? (
                  <Suspense fallback={<p className="text-sm text-muted-foreground">{answer}</p>}>
                    <MarkdownRenderer content={answer} className="text-sm" />
                  </Suspense>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Nothing to preview yet. Start writing to see the formatted output.
                  </p>
                )}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={6}
                placeholder="Write a clear, helpful response. You can use markdown, $math$, and \ce{chemistry}…"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 resize-none leading-relaxed placeholder:text-muted-foreground/60 font-sans"
              />
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="font-mono text-[10px] text-muted-foreground">
                  {answer.trim().length} chars
                </p>
                {answer.trim() && <CopyButton text={answer} />}
              </div>
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
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

function EscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [convoMessages, setConvoMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");

  const loadEscalations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const authRes = await supabase.auth.getSession();
      const session = authRes?.data?.session;
      if (!session?.user?.id) {
        setEscalations([]);
        return;
      }
      const rows = await listEscalations();
      setEscalations(rows as Escalation[]);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to load escalations."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEscalations();
  }, [loadEscalations]);

  const open = async (id: string) => {
    setActiveId(id);
    const existing = escalations.find((e) => e.id === id);
    // Load draft if exists, otherwise use existing detail
    const draft = loadDraft(id);
    setAnswer(draft || existing?.detail || "");
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

  const handleAnswerChange = (v: string) => {
    setAnswer(v);
    if (activeId) saveDraft(activeId, v);
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
      clearDraft(id);
      setActiveId(null);
      setAnswer("");
      toast.success("Escalation resolved.");
      const esc = escalations.find((e) => e.id === id);
      if (esc?.conversation_id && esc?.user_id) {
        await createResolutionNotification({
          data: {
            studentId: esc.user_id,
            conversationId: esc.conversation_id,
          },
        });
      }
      loadEscalations(true);
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

  const filteredEscalations =
    filter === "pending" ? pending : filter === "resolved" ? resolved : escalations;

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
            onClick={() => loadEscalations(true)}
            disabled={refreshing}
            className="flex items-center gap-2 self-start sm:self-auto rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </header>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Escalations",
            value: escalations.length,
            icon: MessageSquare,
            color: "text-primary",
            bg: "border-primary/20 bg-primary/[0.02]",
          },
          {
            label: "Pending Review",
            value: pending.length,
            icon: Clock,
            color: "text-amber-600 dark:text-amber-400",
            bg: "border-amber-200/60 dark:border-amber-800/60 bg-amber-500/[0.02]",
          },
          {
            label: "Resolved",
            value: resolved.length,
            icon: CheckCircle2,
            color: "text-green-600 dark:text-green-400",
            bg: "border-green-200/60 dark:border-green-800/60 bg-green-500/[0.02]",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 sm:p-5 shadow-xs flex items-center justify-between ${bg}`}>
            <div className="space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className={`font-serif text-3xl font-black ${color}`}>{value}</p>
            </div>
            <div className={`rounded-full p-2.5 bg-background/50 border border-border/20 shadow-inner flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ── */}
      {escalations.length > 0 && (
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
          {(["all", "pending", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {f}{" "}
              <span className="text-[10px] opacity-60">
                ({f === "all" ? escalations.length : f === "pending" ? pending.length : resolved.length})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && <GilaniLoader fullScreen={false} />}

      {/* ── Empty state ── */}
      {!loading && filteredEscalations.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 sm:p-12 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <ShieldAlert className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="font-serif text-xl font-medium text-muted-foreground">
            {filter === "all" ? "All clear" : `No ${filter} escalations`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "all"
              ? "No escalations assigned to you yet."
              : `There are no ${filter} escalations at the moment.`}
          </p>
        </div>
      )}

      {/* ── Urgent (distress) ── */}
      {filter !== "resolved" && pendingUrgent.length > 0 && (
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
              setAnswer={handleAnswerChange}
              saving={saving}
              onResolve={handleResolve}
              onCancel={() => setActiveId(null)}
              urgent
            />
          ))}
        </section>
      )}

      {/* ── Pending ── */}
      {filter !== "resolved" && pendingOther.length > 0 && (
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
              setAnswer={handleAnswerChange}
              saving={saving}
              onResolve={handleResolve}
              onCancel={() => setActiveId(null)}
            />
          ))}
        </section>
      )}

      {/* ── Resolved ── */}
      {filter !== "pending" && resolved.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Resolved ({resolved.length})
            </p>
          </div>
          <div className="space-y-2">
            {resolved.map((esc) => {
              const reasonMeta = REASON_LABELS[esc.reason] ?? {
                label: esc.reason,
                color: "text-muted-foreground border-border",
              };
              return (
                <div
                  key={esc.id}
                  className="rounded-xl border border-green-200/60 dark:border-green-900/60 bg-green-50/40 dark:bg-green-950/20 p-4 flex gap-3 items-start"
                >
                  <div className="flex-shrink-0 h-9 w-9 rounded-full overflow-hidden border border-border bg-background flex items-center justify-center shadow-inner mt-0.5">
                    {esc.student_avatar ? (
                      esc.student_avatar.startsWith("preset:") ? (
                        <span className="font-serif text-xs font-bold text-primary capitalize">
                          {esc.student_name ? esc.student_name.substring(0, 2) : "ST"}
                        </span>
                      ) : (
                        <img src={esc.student_avatar} alt="Avatar" className="h-full w-full object-cover" />
                      )
                    ) : (
                      <span className="font-serif text-xs font-bold text-primary capitalize">
                        {esc.student_name ? esc.student_name.substring(0, 2) : "ST"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-sm font-bold text-foreground">
                          {esc.student_name || "Student"}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${reasonMeta.color}`}
                        >
                          {reasonMeta.label}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          #{esc.conversation_id ? esc.conversation_id.slice(0, 8) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {esc.created_at
                            ? new Date(esc.created_at).toLocaleDateString("en-KE", {
                              day: "numeric",
                              month: "short",
                            })
                            : "—"}
                        </span>
                        <span className="rounded-full border border-green-300 dark:border-green-700 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-green-700 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
                        </span>
                      </div>
                    </div>
                    {esc.detail && (
                      <div className="mt-2 rounded-lg border border-green-200/40 dark:border-green-800/40 bg-background/50 px-3 py-2 text-xs text-foreground leading-relaxed">
                        <Suspense fallback={<p className="text-xs text-muted-foreground">{esc.detail}</p>}>
                          <MarkdownRenderer content={esc.detail} className="text-xs" />
                        </Suspense>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}