import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Menu, Plus, Loader2 } from "lucide-react";
import { parseDocument } from "@/lib/document-parser";
import {
  createEscalationNotification,
  deleteThreadFn,
  generateThreadTitleFn,
  lookupTeacherByEmail,
  createEscalationFn,
} from "@/lib/tutor.server-fns";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
// Export utils loaded lazily — jspdf + html2canvas are ~700kB combined
const exportAsPDF = async (...args: Parameters<typeof import("@/lib/export-utils").exportAsPDF>) => {
  try {
    const { exportAsPDF: fn } = await import("@/lib/export-utils");
    return fn(...args);
  } catch {
    const { toast } = await import("sonner");
    toast.error("Export failed — try again or use a different browser");
  }
};
const exportAsWord = async (...args: Parameters<typeof import("@/lib/export-utils").exportAsWord>) => {
  try {
    const { exportAsWord: fn } = await import("@/lib/export-utils");
    return fn(...args);
  } catch {
    const { toast } = await import("sonner");
    toast.error("Export failed — try again or use a different browser");
  }
};
import { withTimeout, friendlyError } from "@/lib/async";
import { toast } from "sonner";
import { ChatHeader } from "@/components/tutor/ChatHeader";
import { ChatInput } from "@/components/tutor/ChatInput";
import { PlansModal } from "@/components/PlansModal";
import { ThreadSidebar } from "@/components/tutor/ThreadSidebar";
import { DeleteModal } from "@/components/tutor/DeleteModal";
import { EscalateModal } from "@/components/tutor/EscalateModal";
import { MessageList } from "@/components/tutor/MessageList";
import { getRateLimitStatus } from "@/lib/rate-limit.server";

export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  component: TutorThread,
});

type Thread = {
  id: string;
  title?: string | null;
  updated_at?: string | null;
};

function TutorThread() {
  // ✅ Read threadId here so we can key TutorThreadInner on it.
  // This forces a full remount whenever the thread changes, eliminating the
  // race condition where messages=[] and messagesLoading=false flash together.
  const { threadId } = Route.useParams();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then((res) => {
        if (!active) return;
        const session = res?.data?.session;
        if (session?.access_token) setAuthToken(session.access_token);
        if (session?.user?.id) setUserId(session.user.id);
        setAuthLoading(false);
      })
      .catch((err) => {
        console.error("[TutorThread] Failed to get auth session:", err);
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground font-medium">Verifying credentials…</p>
      </div>
    );
  }

  // key={threadId} forces TutorThreadInner to remount on every thread switch.
  // Fresh mount means messagesLoading starts as true — no empty-state flash.
  return <TutorThreadInner key={threadId} authToken={authToken} userId={userId} />;
}

function TutorThreadInner({ authToken, userId }: { authToken: string | null; userId: string | null }) {
  const { threadId } = Route.useParams();
  const navigate = useNavigate({ from: '/tutor/$threadId' });

  const queryClient = useQueryClient();
  const threadsQuery = useQuery({
    queryKey: ["threads", userId],
    queryFn: async () => {
      const { data, error } = (await withTimeout(
        Promise.resolve(
          supabase
            .from("conversations")
            .select("id,title,updated_at")
            .eq("user_id", userId as string)
            .order("updated_at", { ascending: false }),
        ),
        8000,
        "Database connection timed out",
      )) as any;
      if (error) throw new Error(`Failed to load sessions: ${error.message}`);
      return (data ?? []) as Thread[];
    },
    enabled: !!userId,
    staleTime: 0,
  });
  const threads = threadsQuery.data ?? [];
  const threadsLoading = !!userId && threadsQuery.isPending;
  const threadsLoadError = threadsQuery.error ? (threadsQuery.error as Error).message : null;
  const setThreads = (updater: Thread[] | ((prev: Thread[]) => Thread[])) => {
    queryClient.setQueryData(["threads", userId], (prev: Thread[] = []) =>
      typeof updater === "function" ? (updater as (p: Thread[]) => Thread[])(prev) : updater
    );
  };
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
  const [showPlans, setShowPlans] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesLoadError, setMessagesLoadError] = useState<string | null>(null);
  /** Map of messageId → vote, loaded in bulk once per thread load */
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1>>({});
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [escalationStatus, setEscalationStatus] = useState<
    "open" | "in_review" | "resolved" | null
  >(null);
  const [escalating, setEscalating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [escalateEmailError, setEscalateEmailError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    text: string;
    size: number;
  } | null>(null);

  const [parsingFile, setParsingFile] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  /** Ref to ChatInput's textarea so Edit-on-bubble can focus it */
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return; // Exit if no file was actually selected

    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_FILE_SIZE) {
      setDocUploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is 2MB. Please split large documents into smaller sections.`);
      return;
    }

    setParsingFile(true);
    setDocUploadError(null);
    const toastId = toast.loading(`Extracting text from ${file.name}...`);
    try {
      const parsed = await parseDocument(file);
      setAttachedFile(parsed);
      toast.success("Document attached successfully!", { id: toastId });
    } catch (err: any) {
      const errMsg = friendlyError(err, "Failed to attach document.");
      setDocUploadError(errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setParsingFile(false);
    }
  };

  // Load user plan profile for billing plan checks
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sessionRes = await supabase.auth.getSession();
        const userId = sessionRes?.data?.session?.user?.id;
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
    return () => {
      mounted = false;
    };
  }, []);

  // Check rate limit status on page load so warning persists after refresh
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await getRateLimitStatus({ data: "chat" });
        if (mounted) {
          setMessagesUsed((status as any).messagesUsed ?? 0);
          setMessagesMax((status as any).messagesMax ?? 10);
        }
        if (mounted && status.isRateLimited) {
          const secs = Math.ceil(status.retryAfterMs / 1000);
          setChatError(JSON.stringify({
            retryAfterMs: status.retryAfterMs,
            isDaily: status.isDaily,
            message: status.isDaily
              ? `Daily message limit reached. Resets in ${secs}s.`
              : `Rate limit exceeded. Try again in ${secs}s.`,
          }));
        }
      } catch { /* ignore – not signed in */ }
    })();
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    const safety = setTimeout(() => {
      setMessagesLoading((prev) => {
        if (prev) console.warn("[TutorThread] Safety timeout: forcing messagesLoading off");
        return false;
      });
    }, 10000);
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
            try {
              errText = await res.text();
            } catch {
              errText = res.statusText;
            }
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
    experimental_throttle: 30,
    onError: (err) => setChatError(err instanceof Error ? err.message : String(err)),
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
          prev.map((m: any) =>
            m.id === message.id
              ? { ...m, id: dbMessageId }
              : m
          )
        );
      }
    },
  });

  const { messages: messagesRaw, setMessages, sendMessage, stop, status, regenerate } = chatHelpers;
  const handleReload = useCallback(() => regenerate({ body: { isRetry: true } }), [regenerate]);
  const handlePromptClick = useCallback((prompt: string) => setInput(prompt), [setInput]);
  /** When user clicks Edit on a bubble, load its text into ChatInput and focus it */
  const handleEditRequest = useCallback((text: string) => {
    setInput(text);
    setTimeout(() => {
      chatInputRef.current?.focus();
      chatInputRef.current?.setSelectionRange(
        chatInputRef.current.value.length,
        chatInputRef.current.value.length
      );
    }, 50);
  }, [setInput]);
  const messages = messagesRaw as UIMessage[];
  const handleEdit = useCallback(async (messageId: string, newText: string) => {
    const { data: editedMsg } = await supabase
      .from("messages")
      .select("created_at")
      .eq("id", messageId)
      .maybeSingle();
    if (!editedMsg) { toast.error("Message not found"); return; }
    setMessages((prev: UIMessage[]) =>
      prev.map((m: UIMessage) =>
        m.id === messageId
          ? { ...m, content: newText, parts: [{ type: "text" as const, text: newText }] }
          : m
      )
    );
    const { error: updateError } = await supabase
      .from("messages")
      .update({ content: newText, parts: JSON.stringify([{ type: "text", text: newText }]) })
      .eq("id", messageId);
    if (updateError) { toast.error("Failed to save edit"); return; }
    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", threadId)
      .gt("created_at", editedMsg.created_at);
    if (deleteError) { console.error("Failed to clean up subsequent messages:", deleteError); }
    const msgs = (messagesRaw as any[]);
    const editedIdx = msgs.findIndex((m: any) => m.id === messageId);
    if (editedIdx === -1) return;
    const baseMessages = msgs.slice(0, editedIdx + 1).map((m: any) =>
      m.id === messageId
        ? { ...m, content: newText, parts: [{ type: "text", text: newText }] }
        : m
    );
    setMessages(baseMessages);
    regenerate({ body: { isRetry: true } });
  }, [threadId, messagesRaw, setMessages, regenerate]);
  const isPending = status === "submitted" || status === "streaming";

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const submit = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    const trimmedInput = input.trim();
    if (!trimmedInput && !attachedFile) return;
    try {
      let finalMessage = trimmedInput;
      if (attachedFile) {
        const MAX_DOC_CHARS = 8000;
        const docText =
          attachedFile.text.length > MAX_DOC_CHARS
            ? attachedFile.text.slice(0, MAX_DOC_CHARS) +
              "\n\n[Document truncated to 8000 characters due to size limits]"
            : attachedFile.text;
        finalMessage = `[Document Attached: ${attachedFile.name}]\n\n<DocumentContent name="${attachedFile.name}">\n${docText}\n</DocumentContent>\n\nStudent Query: ${trimmedInput || "(See attached document)"}`;
      }

      const currentThread = threads.find((t) => t.id === threadId);
      if (
        messages.length === 0 &&
        (!currentThread?.title ||
          currentThread.title === "New thread" ||
          currentThread.title === "New tutor session")
      ) {
        generateThreadTitleFn({ data: trimmedInput })
          .then((derivedTitle) => {
            supabase
              .from("conversations")
              .update({ title: derivedTitle })
              .eq("id", threadId)
              .then(({ error }) => {
                if (error) console.error("Failed to update thread title:", error);
              });
            setThreads((prev) =>
              prev.map((t) => (t.id === threadId ? { ...t, title: derivedTitle } : t)),
            );
          })
          .catch(() => {
            const fallback = trimmedInput.slice(0, 29) + (trimmedInput.length > 29 ? "..." : "");
            supabase.from("conversations").update({ title: fallback }).eq("id", threadId);
            setThreads((prev) =>
              prev.map((t) => (t.id === threadId ? { ...t, title: fallback } : t)),
            );
          });
      }

      setInput("");
      setAttachedFile(null);
      sendMessage({ text: finalMessage }).catch((error: unknown) => {
        console.error("[TutorThread] sendMessage background error:", error);
        toast.error("Failed to send message. Please try again.");
      });
    } catch (error) {
      console.error("[TutorThread] submit error:", error);
    }
  };

  const handleEscalate = async (email?: string) => {
    if (!threadId) return;

    // Teacher email is required
    if (!email || !email.trim()) {
      setEscalateEmailError("Please enter your teacher's email address.");
      return;
    }

    setEscalating(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes?.data?.session;
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not logged in");

      // Look up teacher — throws if not found or not a teacher
      let reviewerId: string;
      try {
        reviewerId = await lookupTeacherByEmail({ data: email.trim().toLowerCase() });
      } catch (err: any) {
        setEscalateEmailError(err.message || "No teacher found with that email address.");
        setEscalating(false);
        return;
      }

      // Server fn handles duplicate guard, auth, and insert atomically
      const result = await createEscalationFn({
        data: {
          conversationId: threadId,
          reason: "student_request",
          detail: "Student manually requested teacher review.",
          reviewerId: reviewerId ?? null,
        },
      });
      if (result.alreadyOpen) {
        toast.info("This conversation already has an open escalation.");
        setEscalating(false);
        return;
      }

      // Send email notification to teacher
      await createEscalationNotification({ data: { conversationId: threadId, reviewerId: reviewerId ?? null } });

      setEscalationStatus("open");
      setEscalateModalOpen(false);
      setTeacherEmail("");
      setEscalateEmailError("");
      toast.success("Conversation escalated to your teacher! They will be notified by email.");
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to escalate conversation."));
    } finally {
      setEscalating(false);
    }
  };

  // Global escalation event listener
  useEffect(() => {
    const handleGlobalEscalate = () => {
      if (!escalationStatus && !escalating && !messagesLoading) setEscalateModalOpen(true);
    };
    window.addEventListener("custom:trigger-escalation", handleGlobalEscalate);
    return () => window.removeEventListener("custom:trigger-escalation", handleGlobalEscalate);
  }, [handleEscalate, escalationStatus, escalating, messagesLoading]);


  const loadMessages = useCallback(async (silent = false) => {
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
      }, 5000);
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
            const { data: { user } } = await supabase.auth.getUser();
            return await supabase
              .from("escalations")
              .select("status")
              .eq("conversation_id", threadId)
              .eq("user_id", user?.id ?? "")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
          } catch {
            return { data: null, error: null };
          }
        })(),
        userId
          ? supabase
              .from("message_feedback")
              .select("message_id, vote")
              .eq("user_id", userId)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (timeoutId) clearTimeout(timeoutId);

      // Component remounts per-thread (key={threadId}), so no need to re-read params here.

      if (messagesRes.error) {
        if (!silent) setMessagesLoadError(`Database error: ${messagesRes.error.message}`);
        setMessagesLoading(false);
        return;
      }

      if (messagesRes.data && messagesRes.data.length > 0) {
        setMessages(
          messagesRes.data.map((m) => ({
            id: m.id ?? crypto.randomUUID(),
            role: m.role as "user" | "assistant",
            content: m.content || "",
            parts: [{ type: "text" as const, text: m.content || "" }],
            createdAt: m.created_at ? new Date(m.created_at) : new Date(),
          })),
        );
      } else {
        setMessages([]);
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
      if (!silent) {
        setMessagesLoadError("Connection failed. Try refreshing.");
      }
    } finally {
      setMessagesLoading(false);
    }
  }, [threadId, userId, setMessages]);

  // Load messages on mount/thread switch
  useEffect(() => {
    loadMessages(false);
  }, [loadMessages]);

  // When isPending transitions from true to false, reload messages to fetch actual database UUIDs
  const prevPendingRef = useRef(isPending);
  useEffect(() => {
    if (prevPendingRef.current && !isPending) {
      const timer = setTimeout(() => {
        loadMessages(true);
      }, 300);
      return () => clearTimeout(timer);
    }
    prevPendingRef.current = isPending;
  }, [isPending, loadMessages]);

  // Real-time escalation status
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`escalation-status-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "escalations",
          filter: `conversation_id=eq.${threadId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus) {
            setEscalationStatus(newStatus);
            if (newStatus === "resolved")
              toast.success("A teacher has reviewed your conversation and responded!", {
                duration: 6000,
              });
            else if (newStatus === "in_review")
              toast.info("A teacher is now reviewing your conversation.", { duration: 4000 });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  // Real-time teacher messages
  useEffect(() => {
    if (!threadId || messagesLoading) return;
    const channel = supabase
      .channel(`messages-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${threadId}`,
        },
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
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, messagesLoading]);

  const handleSelectThread = (id: string) => {
    navigate({ to: "/tutor/$threadId", params: { threadId: id } } as any);
  };

  const createNewThread = async () => {
    const sessionRes = await supabase.auth.getSession();
    const userId = sessionRes?.data?.session?.user?.id;
    if (!userId) return;
    const { data, error } = await supabase
      .from("conversations")
      .insert([{ title: "New thread", user_id: userId }])
      .select()
      .single();
    if (error) {
      console.error("[TutorThread] create thread error:", error);
      return;
    }
    const newId = (data as any).id;
    setThreads((prev) => [{ id: newId, title: "New thread" }, ...prev]);
    setThreadsOpen(false);
    // ✅ Clear messages for new thread (this one is correct)
    setMessages([]);
    navigate({ to: "/tutor/$threadId", params: { threadId: newId } } as any);
  };

  // Export as PDF
  const handleExportPDF = () => {
    const title = threads.find((t) => t.id === threadId)?.title || "study-session";
    exportAsPDF(messages, title);
  };

  const handleExportWord = async () => {
    const title = threads.find((t) => t.id === threadId)?.title || "study-session";
    await exportAsWord(messages, title);
  };

  return (
    <div className="flex h-full flex-col lg:flex-row bg-background text-foreground overflow-hidden">
      <ThreadSidebar
        threads={threads}
        threadId={threadId}
        threadsOpen={threadsOpen}
        threadsLoading={threadsLoading}
        threadsLoadError={threadsLoadError}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectThread={handleSelectThread}
        onNewThread={createNewThread}
        onDeleteClick={setDeleteConfirmId}
        onClose={() => setThreadsOpen(false)}
        escalationStatus={escalationStatus}
        escalating={escalating}
        messagesLoading={messagesLoading}
        onEscalate={() => setEscalateModalOpen(true)}
        onExportPDF={handleExportPDF}
        onExportWord={handleExportWord}
        threadTitle={threads.find((t) => t.id === threadId)?.title || ""}
      />
      {/* Main chat area */}
      <main className="flex flex-col min-w-0 overflow-hidden" style={{ flex: 1, minHeight: 0 }}>
        {/* Mobile top bar */}
        <div className="flex-shrink-0 flex items-center gap-2 border-b border-border bg-sidebar px-3 py-1.5 lg:hidden">
          <button
            onClick={() => setThreadsOpen(true)}
            className="flex-shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Open sessions"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setThreadsOpen(true)}
            className="flex-1 min-w-0 text-left"
            title="Switch session"
          >
            <p className="text-sm font-semibold truncate leading-tight">
              {threads.find((t) => t.id === threadId)?.title || "Untitled Session"}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              tap to switch
            </p>
          </button>
          <button
            onClick={createNewThread}
            className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            title="New session"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        {/* Chat header — desktop only */}
        <ChatHeader
          title={threads.find((t) => t.id === threadId)?.title || "Untitled Session"}
          escalationStatus={escalationStatus}
          escalating={escalating}
          messagesLoading={messagesLoading}
          onEscalate={() => setEscalateModalOpen(true)}
          onExportPDF={handleExportPDF}
          onExportWord={handleExportWord}
          threadId={threadId}
          threadTitle={threads.find((t) => t.id === threadId)?.title || ""}
          className="hidden lg:flex"
        />
        {/* Messages area */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <MessageList
          messages={messages}
          messagesLoading={messagesLoading}
          messagesLoadError={messagesLoadError}
          isPending={isPending}
          isRateLimited={isRateLimited}
          onReload={handleReload}
          onEditRequest={handleEditRequest}
          onPromptClick={handlePromptClick}
          userId={userId}
          userVotes={userVotes}
          onVote={(msgId: string, vote: 1 | -1 | null) => {
            setUserVotes((prev) => {
              if (vote === null) {
                const next = { ...prev };
                delete next[msgId];
                return next;
              }
              return { ...prev, [msgId]: vote };
            });
          }}
        />

        </div>
        {/* Input area */}
        <div className="flex-shrink-0 z-20 lg:relative fixed bottom-0 left-0 right-0">
        <ChatInput
          input={input}
          isPending={isPending}
          parsingFile={parsingFile}
          attachedFile={attachedFile}
          chatError={chatError}
          docUploadError={docUploadError}
          onClearDocError={() => setDocUploadError(null)}
          onInputChange={handleInputChange}
          onSubmit={submit}
          onStop={stop}
          onFileChange={handleFileChange}
          inputRef={chatInputRef}
          onRemoveFile={() => {
            setAttachedFile(null);
            setDocUploadError(null);
          }}
          onUpgrade={() => setShowPlans(true)}
          messagesUsed={messagesUsed}
          messagesMax={messagesMax}
        />
        </div>
      </main>
      {showPlans && <PlansModal onClose={() => setShowPlans(false)} currentPlan={currentPlan} />}
      {/* Escalate Modal */}
      {escalateModalOpen && (
        <EscalateModal
          teacherEmail={teacherEmail}
          onEmailChange={(val) => {
            setTeacherEmail(val);
            setEscalateEmailError("");
          }}
          onConfirm={() => handleEscalate(teacherEmail || undefined)}
          onCancel={() => {
            setEscalateModalOpen(false);
            setTeacherEmail("");
            setEscalateEmailError("");
          }}
          isEscalating={escalating}
          error={escalateEmailError}
        />
      )}

      {/* Delete Modal */}
      {deleteConfirmId && (
        <DeleteModal
          onConfirm={async () => {
            const id = deleteConfirmId;
            setDeleteConfirmId(null);
            const toastId = toast.loading("Deleting session...");
            try {
              await deleteThreadFn({ data: { threadId: id! } });
              setThreads((prev) => prev.filter((t) => t.id !== id));
              toast.success("Session deleted successfully!", { id: toastId });
              if (id === threadId) {
                navigate({ to: "/tutor" as const });
              }
            } catch (err: any) {
              console.error("Failed to delete thread:", err);
              toast.error(friendlyError(err, "Failed to delete session."), { id: toastId });
            }
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
