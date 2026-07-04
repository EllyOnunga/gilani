import { useState, useCallback, useEffect } from "react";
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
};

const DRAFT_STORAGE_KEY = "gilani.teacher.escalation.drafts";

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
      const rows = await serverFns.listEscalations();
      setEscalations(rows as Escalation[]);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to load escalations."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [serverFns]);

  useEffect(() => {
    loadEscalations();
  }, [loadEscalations]);

  const open = async (id: string) => {
    setActiveId(id);
    const existing = escalations.find((e) => e.id === id);
    const draft = loadDraft(id);
    setAnswer(draft || existing?.detail || "");
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
      await serverFns.resolveEscalation({ data: { id, expertAnswer: answer } });
      setEscalations((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "resolved", detail: answer } : e))
      );
      clearDraft(id);
      setActiveId(null);
      setAnswer("");
      toast.success("Escalation resolved.");
      
      const esc = escalations.find((e) => e.id === id);
      if (esc?.conversation_id && esc?.user_id) {
        await createResolutionNotification({
          data: { studentId: esc.user_id, conversationId: esc.conversation_id },
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
  const filteredEscalations = filter === "pending" ? pending : filter === "resolved" ? resolved : escalations;

  return {
    escalations, activeId, setActiveId, answer, setAnswer, saving, loading,
    convoMessages, loadingMessages, refreshing, filter, setFilter,
    loadEscalations, open, handleAnswerChange, handleResolve,
    pending, resolved, pendingUrgent, pendingOther, filteredEscalations
  };
}
