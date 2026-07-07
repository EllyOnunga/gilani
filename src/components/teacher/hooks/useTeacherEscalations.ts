import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createResolutionNotification } from "@/lib/tutor.server-fns";
import { toast } from "sonner";
import { friendlyError } from "@/lib/async";

export type Escalation = {
  id: string;
  conversation_id: string | null;
  reason: string;
  status: string;
  detail: string | null;
  created_at: string;
  user_id: string;
  student_name?: string;
  student_avatar?: string;
  draft_answer?: string | null;
  draft_updated_at?: string | null;
};

const DRAFT_STORAGE_KEY = "gilani.teacher.escalation.drafts";

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 600): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const message = String(err?.message || "");
    const isAuthError = /forbidden|unauthorized|not signed in/i.test(message);
    if (retries <= 0 || isAuthError) throw err;
    await new Promise((res) => setTimeout(res, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
}

export function loadDraft(escalationId: string): string {
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

export function saveDraft(escalationId: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    const drafts = raw ? JSON.parse(raw) : {};
    if (value.trim()) drafts[escalationId] = value;
    else delete drafts[escalationId];
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch {}
}

export function clearDraft(escalationId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return;
    const drafts = JSON.parse(raw);
    delete drafts[escalationId];
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch {}
}

type ServerFns = {
  listEscalations: () => Promise<any[]>;
  resolveEscalation: (args: { data: { id: string; expertAnswer: string } }) => Promise<void>;
  getConversationMessages: (args: { data: { conversationId: string } }) => Promise<any[]>;
  saveEscalationDraft: (args: { data: { id: string; draftAnswer: string } }) => Promise<void>;
};

export function useTeacherEscalations(serverFns: ServerFns) {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [convoMessages, setConvoMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const draftSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const loadEscalations = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const authRes = await supabase.auth.getSession();
        const session = authRes?.data?.session;
        if (!session?.user?.id) {
          setEscalations([]);
          return;
        }
        const rows = await withRetry(() => serverFns.listEscalations());
        setEscalations(rows as Escalation[]);
        setError(null);
      } catch (err: any) {
        const message = friendlyError(err, "Failed to load escalations.");
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [serverFns],
  );

  useEffect(() => {
    loadEscalations();
  }, [loadEscalations]);

  // Keep a stable ref to the latest loadEscalations so the realtime
  // subscription effect below never needs to re-subscribe when it changes.
  const loadEscalationsRef = useRef(loadEscalations);
  useEffect(() => {
    loadEscalationsRef.current = loadEscalations;
  }, [loadEscalations]);

  // Realtime subscription - live updates instead of manual/polling refresh.
  // Runs once on mount; deliberately has an empty dependency array.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    (async () => {
      const authRes = await supabase.auth.getSession();
      const userId = authRes?.data?.session?.user?.id;
      if (!userId || cancelled) return;

      channel = supabase
        .channel(`escalations-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "escalations",
            filter: `reviewer_id=eq.${userId}`,
          },
          () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              loadEscalationsRef.current(true);
            }, 400);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const open = async (id: string) => {
    setActiveId(id);
    const existing = escalations.find((e) => e.id === id);
    const draft = loadDraft(id);
    setAnswer(draft || existing?.draft_answer || existing?.detail || "");
    if (existing?.conversation_id) {
      setLoadingMessages(true);
      try {
        const authRes = await supabase.auth.getSession();
        const session = authRes?.data?.session;
        if (!session?.user?.id) return;
        const msgs = await serverFns.getConversationMessages({
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
    if (!activeId) return;
    saveDraft(activeId, v);

    // Debounce the remote (cross-device) draft save so we don't hit the
    // server on every keystroke.
    const id = activeId;
    if (draftSaveTimers.current[id]) clearTimeout(draftSaveTimers.current[id]);
    draftSaveTimers.current[id] = setTimeout(async () => {
      try {
        await serverFns.saveEscalationDraft({ data: { id, draftAnswer: v } });
      } catch {
        // Non-critical — local draft already saved; silently skip remote sync.
      }
    }, 1000);
  };

  const handleResolve = async (id: string) => {
    if (!answer.trim()) {
      toast.error("Please write an expert answer first.");
      return;
    }
    setSaving(true);
    const previousEscalations = escalations;
    const previousAnswer = answer;

    // Optimistic update — reflect resolution immediately
    setEscalations((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "resolved", detail: answer } : e)),
    );
    clearDraft(id);
    setActiveId(null);
    setAnswer("");

    try {
      const authRes = await supabase.auth.getSession();
      const session = authRes?.data?.session;
      if (!session?.user?.id) throw new Error("Not signed in");
      await serverFns.resolveEscalation({ data: { id, expertAnswer: previousAnswer } });
      toast.success("Escalation resolved.");

      const esc = previousEscalations.find((e) => e.id === id);
      if (esc?.conversation_id && esc?.user_id) {
        await createResolutionNotification({
          data: { studentId: esc.user_id, conversationId: esc.conversation_id },
        });
      }
      loadEscalations(true);
    } catch (err: any) {
      // Roll back on failure
      setEscalations(previousEscalations);
      setActiveId(id);
      setAnswer(previousAnswer);
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

  return {
    escalations,
    activeId,
    setActiveId,
    answer,
    setAnswer,
    saving,
    loading,
    convoMessages,
    loadingMessages,
    refreshing,
    filter,
    setFilter,
    error,
    loadEscalations,
    open,
    handleAnswerChange,
    handleResolve,
    pending,
    resolved,
    pendingUrgent,
    pendingOther,
    filteredEscalations,
  };
}
