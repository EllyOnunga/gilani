import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { friendlyError } from "@/lib/async";
import { getRateLimitStatus } from "@/lib/rate-limit.server";
import {
  createEscalationNotification,
  generateThreadTitleFn,
  lookupTeacherByEmail,
  createEscalationFn,
} from "@/lib/tutor.server-fns";
import { useThreadsQuery } from "@/lib/hooks/useThreadsQuery";

export function useTutorChat({ threadId, userId, authToken }: { threadId?: string; userId: string | null; authToken: string | null }) {
  const { threads, threadsLoading, threadsLoadError, setThreads, invalidateThreads } = useThreadsQuery(userId);

  const [chatError, setChatError] = useState<string | null>(null);
  const [messagesUsed, setMessagesUsed] = useState<number>(0);
  const [messagesMax, setMessagesMax] = useState<number>(10);
  const isRateLimited = !!(
    chatError?.includes("Rate limit") ||
    chatError?.includes("rate limit") ||
    chatError?.includes("Daily") ||
    chatError?.includes("daily") ||
    chatError?.includes("quota")
  );

  const [currentPlan, setCurrentPlan] = useState("free");
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesLoadError, setMessagesLoadError] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});
  
  const [escalationStatus, setEscalationStatus] = useState<"open" | "in_review" | "resolved" | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [escalateEmailError, setEscalateEmailError] = useState("");

  // Load user plan profile for billing plan checks
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!userId) return;
        const { data, error } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw error;
        if (mounted && (data as any)?.plan) setCurrentPlan((data as any).plan);
      } catch (err) {
        console.error("Failed to load user plan profile:", err);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const refreshRateLimitStatus = useCallback(async () => {
    try {
      const status = await getRateLimitStatus({ data: "chat" });
      setMessagesUsed((status as any).messagesUsed ?? 0);
      setMessagesMax((status as any).messagesMax ?? 10);
      if (status.isRateLimited) {
        const secs = Math.ceil(status.retryAfterMs / 1000);
        setChatError(
          JSON.stringify({
            retryAfterMs: status.retryAfterMs,
            isDaily: status.isDaily,
            message: status.isDaily
              ? `Daily message limit reached. Resets in ${secs}s.`
              : `Rate limit exceeded. Try again in ${secs}s.`,
          }),
        );
      } else {
        setChatError((prev) => {
          if (!prev) return prev;
          try {
            const p = JSON.parse(prev);
            if (p.retryAfterMs !== undefined || p.isDaily !== undefined) return null;
          } catch {}
          const lower = prev.toLowerCase();
          if (lower.includes("rate limit") || lower.includes("daily") || lower.includes("quota") || lower.includes("exceeded"))
            return null;
          return prev;
        });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refreshRateLimitStatus();
  }, [refreshRateLimitStatus]);

  useEffect(() => {
    if (!userId) return;
    const dailyKey = `${userId}:chat:day`;
    const channel = supabase
      .channel(`rate-limit-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rate_limits", filter: `key=eq.${dailyKey}` },
        () => refreshRateLimitStatus()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refreshRateLimitStatus]);

  useEffect(() => {
    const safety = setTimeout(() => {
      setMessagesLoading((prev) => {
        if (prev) console.warn("[TutorThread] Safety timeout: forcing messagesLoading off");
        return false;
      });
    }, 25000);
    return () => clearTimeout(safety);
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          if (!res.ok) {
            let errText = "";
            try { errText = await res.text(); } catch { errText = res.statusText; }
            throw new Error(errText);
          }
          return res;
        },
      }),
    [threadId, authToken],
  );

  const chatHelpers: any = useChat({
    id: threadId,
    transport,
    experimental_throttle: 50,
    onError: async (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      const isAuthError =
        msg.includes("401") ||
        msg.toLowerCase().includes("expired") ||
        msg.toLowerCase().includes("jwt") ||
        msg.toLowerCase().includes("unauthorized");
      if (isAuthError) {
        await supabase.auth.refreshSession();
        toast.error("Your session expired. Please send your message again.", { duration: 5000 });
        setChatError(null);
        return;
      }
      setChatError(msg);
      toast.error("Something went wrong. Please try again.", { duration: 4000 });
    },
    onFinish: (message: any) => {
      setChatError(null);
      let dbMessageId: string | null = null;
      if (Array.isArray(message.annotations)) {
        for (const ann of message.annotations) {
          const arr = Array.isArray(ann) ? ann : [ann];
          for (const a of arr) {
            if (a?.messageId) {
              dbMessageId = a.messageId;
              break;
            }
          }
          if (dbMessageId) break;
        }
      }
      if (dbMessageId) {
        setMessages((prev: any[]) =>
          prev.map((m: any) => (m.id === message.id ? { ...m, id: dbMessageId } : m)),
        );
      }
      refreshRateLimitStatus();
    },
  });

  const { messages: messagesRaw, setMessages, sendMessage, stop, status, regenerate } = chatHelpers;
  const isPending = status === "submitted" || status === "streaming";
  const messages = messagesRaw as UIMessage[];
  const messagesRef = useRef<UIMessage[]>(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const handleReload = useCallback(() => regenerate({ body: { isRetry: true } }), [regenerate]);

  const handleVote = useCallback(
    (msgId: string, vote: 1 | -1 | null) => {
      setUserVotes((prev) => {
        if (vote === null) {
          const next = { ...prev };
          delete next[msgId];
          return next;
        }
        return { ...prev, [msgId]: vote };
      });
    },
    [setUserVotes],
  );

  const handleEdit = useCallback(
    async (messageId: string, newText: string) => {
      if (!threadId) return;
      const { data: editedMsg } = await supabase
        .from("messages")
        .select("created_at")
        .eq("id", messageId)
        .maybeSingle();
      if (!editedMsg) {
        toast.error("Message not found");
        return;
      }
      setMessages((prev: UIMessage[]) =>
        prev.map((m: UIMessage) =>
          m.id === messageId
            ? { ...m, content: newText, parts: [{ type: "text" as const, text: newText }] }
            : m,
        ),
      );
      const { error: updateError } = await supabase
        .from("messages")
        .update({ content: newText, parts: JSON.stringify([{ type: "text", text: newText }]) })
        .eq("id", messageId);
      if (updateError) {
        toast.error("Failed to save edit");
        return;
      }
      const { error: deleteError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", threadId as string)
        .gt("created_at", editedMsg.created_at);
      if (deleteError) {
        console.error("Failed to clean up subsequent messages:", deleteError);
      }
      const msgs = messagesRaw as any[];
      const editedIdx = msgs.findIndex((m: any) => m.id === messageId);
      if (editedIdx === -1) return;
      const baseMessages = msgs
        .slice(0, editedIdx + 1)
        .map((m: any) =>
          m.id === messageId
            ? { ...m, content: newText, parts: [{ type: "text", text: newText }] }
            : m,
        );
      setMessages(baseMessages);
      regenerate({ body: { isRetry: true } });
    },
    [threadId, messagesRaw, setMessages, regenerate],
  );

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!threadId) {
        setMessagesLoading(false);
        return;
      }
      if (!silent) {
        setMessagesLoading(true);
        setMessagesLoadError(null);
      }
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      if (!silent) {
        timeoutId = setTimeout(() => {
          setMessagesLoading(false);
          setMessagesLoadError("Loading timed out.");
        }, 20000);
      }
      try {
        const [messagesRes, escalationRes, feedbackRes] = await Promise.all([
          supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", threadId)
            .order("created_at", { ascending: true }),
          (async () => {
            try {
              return await supabase
                .from("escalations")
                .select("status")
                .eq("conversation_id", threadId)
                .eq("user_id", userId ?? "")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            } catch {
              return { data: null, error: null };
            }
          })(),
          userId
            ? supabase.from("message_feedback").select("message_id, vote").eq("user_id", userId)
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (timeoutId) clearTimeout(timeoutId);

        if (messagesRes.error) {
          if (!silent) setMessagesLoadError(`Database error: ${messagesRes.error.message}`);
          setMessagesLoading(false);
          return;
        }

        if (messagesRes.data && messagesRes.data.length > 0) {
          if (!silent || messagesRes.data.length >= messagesRef.current.length) {
            const __mapped = messagesRes.data.map((m) => {
              let resolvedParts: any[] | null = null;
              if (Array.isArray(m.parts) && m.parts.length > 0) {
                resolvedParts = m.parts as any[];
              } else if (typeof m.parts === "string" && m.parts.trim().startsWith("[")) {
                try {
                  const parsed = JSON.parse(m.parts);
                  if (Array.isArray(parsed) && parsed.length > 0) resolvedParts = parsed;
                } catch {}
              }
              return {
                id: m.id ?? crypto.randomUUID(),
                role: m.role as "user" | "assistant",
                content: m.content || "",
                parts: resolvedParts ?? [{ type: "text" as const, text: m.content || "" }],
                createdAt: m.created_at ? new Date(m.created_at) : new Date(),
              };
            });
            setMessages(__mapped);
          }
        } else {
          // Don't clobber messages already present locally (e.g. an
          // optimistically-appended message from a just-triggered
          // sendMessage) just because the DB hasn't caught up yet on a
          // brand-new thread. Only clear when we know there's truly
          // nothing to preserve.
          if (!silent && messagesRef.current.length === 0) setMessages([]);
        }

        if (escalationRes.error) {
          console.error("[Escalation] Failed to fetch status:", escalationRes.error.message);
        }
        setEscalationStatus((escalationRes.data?.status as any) || null);

        if (feedbackRes.data && feedbackRes.data.length > 0) {
          const votesMap: Record<string, 1 | -1> = {};
          for (const row of feedbackRes.data as any[]) {
            if (row.message_id && row.vote != null) {
              votesMap[row.message_id] = row.vote as 1 | -1;
            }
          }
          setUserVotes(votesMap);
        } else {
          setUserVotes({});
        }
      } catch (e) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!silent) setMessagesLoadError("Connection failed. Try refreshing.");
      } finally {
        setMessagesLoading(false);
      }
    },
    [threadId, userId, setMessages],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      setMessages((prev: UIMessage[]) => prev.filter((m: UIMessage) => m.id !== messageId));
      try {
        const { error } = await supabase.from("messages").delete().eq("id", messageId);
        if (error) throw error;
        toast.success("Message deleted");
      } catch {
        loadMessages(true);
        toast.error("Failed to delete message");
      }
    },
    [setMessages, loadMessages],
  );

  useEffect(() => {
    loadMessages(false);
  }, [loadMessages]);

  const prevPendingRef = useRef(isPending);
  useEffect(() => {
    if (prevPendingRef.current && !isPending) {
      const timer = setTimeout(() => { loadMessages(true); }, 300);
      return () => clearTimeout(timer);
    }
    prevPendingRef.current = isPending;
  }, [isPending, loadMessages]);

  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`escalation-status-${threadId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "escalations", filter: `conversation_id=eq.${threadId}` },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus) {
            setEscalationStatus(newStatus);
            if (newStatus === "resolved")
              toast.success("A teacher has reviewed your conversation and responded!", { duration: 6000 });
            else if (newStatus === "in_review")
              toast.info("A teacher is now reviewing your conversation.", { duration: 4000 });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId]);

  useEffect(() => {
    if (!threadId || messagesLoading) return;
    const channel = supabase
      .channel(`messages-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${threadId}` },
        (payload) => {
          const msg = payload.new as any;
          if (msg?.role === "assistant" && msg?.content?.includes("Teacher Review:")) {
            const teacherMsg = {
              id: msg.id ?? crypto.randomUUID(),
              role: "assistant" as const,
              content: msg.content || "",
              parts: [{ type: "text" as const, text: msg.content || "" }],
              createdAt: msg.created_at ? new Date(msg.created_at) : new Date(),
            };
            setMessages((prev: UIMessage[]) => {
              const alreadyExists = prev.some((m) => m.id === teacherMsg.id);
              if (alreadyExists) return prev;
              return [...prev, teacherMsg];
            });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, messagesLoading]);

  const handleEscalate = async (email?: string) => {
    if (!threadId) return;
    if (!email || !email.trim()) {
      setEscalateEmailError("Please enter your teacher's email address.");
      return;
    }
    setEscalating(true);
    try {
      if (!userId) throw new Error("Not logged in");
      let reviewerId: string;
      try {
        reviewerId = await lookupTeacherByEmail({ data: email.trim().toLowerCase() });
      } catch (err: any) {
        setEscalateEmailError(err.message || "No teacher found with that email address.");
        setEscalating(false);
        return;
      }
      const result = await createEscalationFn({
        data: { conversationId: threadId, reason: "student_request", detail: "Student manually requested teacher review.", reviewerId: reviewerId ?? null },
      });
      if (result.alreadyOpen) {
        toast.info("This conversation already has an open escalation.");
        setEscalating(false);
        return;
      }
      await createEscalationNotification({ data: { conversationId: threadId, reviewerId: reviewerId ?? null } });
      setEscalationStatus("open");
      setEscalateEmailError("");
      toast.success("Conversation escalated to your teacher! They will be notified by email.");
      return true; // Success flag
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to escalate conversation."));
      return false;
    } finally {
      setEscalating(false);
    }
  };

  const createNewThread = async (navigate: any) => {
    navigate({ to: "/tutor", search: { new: "1" } });
  };

  return {
    threads,
    threadsLoading,
    threadsLoadError,
    setThreads,
    chatError,
    setChatError,
    messagesUsed,
    messagesMax,
    isRateLimited,
    currentPlan,
    messagesLoading,
    messagesLoadError,
    userVotes,
    escalationStatus,
    setEscalationStatus,
    escalating,
    escalateEmailError,
    setEscalateEmailError,
    messages,
    setMessages,
    sendMessage,
    stop,
    status,
    isPending,
    regenerate,
    handleReload,
    handleVote,
    handleEdit,
    handleDeleteMessage,
    handleEscalate,
    createNewThread,
    refreshRateLimitStatus,
  };
}
