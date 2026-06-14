import React, { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { exportAsPDF, exportAsWord } from "@/lib/export-utils";
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

  const [threads, setThreads] = useState<Thread[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
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
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsLoadError, setThreadsLoadError] = useState<string | null>(null);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setParsingFile(true);
      setDocUploadError(null);
      const file = e.target.files[0];
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
        e.target.value = "";
      }
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
      setThreadsLoading((prev) => {
        if (prev) console.warn("[TutorThread] Safety timeout: forcing threadsLoading off");
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

  const { messages: messagesRaw, setMessages, sendMessage, status, regenerate } = chatHelpers;
  const messages = messagesRaw as UIMessage[];
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
      if (!escalationStatus && !escalating && !messagesLoading) handleEscalate();
    };
    window.addEventListener("custom:trigger-escalation", handleGlobalEscalate);
    return () => window.removeEventListener("custom:trigger-escalation", handleGlobalEscalate);
  }, [handleEscalate, escalationStatus, escalating, messagesLoading]);

  // Load threads
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sessionResult = (await withTimeout(
          supabase.auth.getSession(),
          5000,
          "Session fetch timed out",
        ).catch((e) => {
          console.error("[TutorThread] session timeout:", e);
          return { data: { session: null }, error: e };
        })) as any;

        const session = sessionResult?.data?.session;
        const sessionError = sessionResult?.error;
        if (sessionError) {
          if (mounted)
            setThreadsLoadError(`Authentication error: ${sessionError.message || sessionError}.`);
          return;
        }

        const userId = session?.user?.id;
        if (!userId) {
          if (mounted) setThreadsLoadError("Not authenticated. Please sign in.");
          return;
        }

        const { data, error } = (await withTimeout(
          Promise.resolve(
            supabase
              .from("conversations")
              .select("id,title,updated_at")
              .eq("user_id", userId)
              .order("updated_at", { ascending: false }),
          ),
          8000,
          "Database connection timed out",
        )) as any;

        if (error) {
          if (mounted) setThreadsLoadError(`Failed to load sessions: ${error.message}`);
          return;
        }
        if (mounted && data) setThreads(data as Thread[]);
      } catch (e) {
        console.error("[TutorThread] thread load exception:", e);
        if (mounted) setThreadsLoadError("Failed to connect to server. Check your network.");
      } finally {
        if (mounted) setThreadsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load messages
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const loadingThreadId = threadId;

    if (!threadId) {
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);
    setMessagesLoadError(null);
    // ✅ REMOVED: setMessages([]); - Don't clear messages, keep existing state while loading

    timeoutId = setTimeout(() => {
      if (mounted) {
        setMessagesLoading(false);
        setMessagesLoadError("Loading timed out.");
      }
    }, 5000);

    (async () => {
      try {
        const [messagesRes, escalationRes] = await Promise.all([
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
        ]);

        clearTimeout(timeoutId);

        // ✅ CRITICAL FIX: Check if this is still the current thread
        // This prevents stale data from overwriting the new thread's messages
        if (!mounted || loadingThreadId !== threadId) return;

        if (messagesRes.error) {
          setMessagesLoadError(`Database error: ${messagesRes.error.message}`);
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
          // ✅ Only clear if there are genuinely no messages
          setMessages([]);
        }

        if (escalationRes.error) {
          console.error("[Escalation] Failed to fetch status:", escalationRes.error.message);
        }
        setEscalationStatus((escalationRes.data?.status as any) || null);
        setMessagesLoading(false);
      } catch (e) {
        clearTimeout(timeoutId);
        if (mounted) {
          setMessagesLoadError("Connection failed. Try refreshing.");
          setMessagesLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [threadId, setMessages]);

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
    <div className="flex h-dvh flex-col lg:flex-row bg-background text-foreground overflow-hidden">
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
      <main className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-2 border-b border-border bg-sidebar px-3 py-1.5 lg:hidden">
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
        <MessageList
          messages={messages}
          messagesLoading={messagesLoading}
          messagesLoadError={messagesLoadError}
          isPending={isPending}
          isRateLimited={isRateLimited}
          onReload={() => regenerate({ body: { isRetry: true } })}
          onEdit={async (messageId, newText) => {
            // Find the message we are editing to get its created_at
            const { data: editedMsg } = await supabase
              .from("messages")
              .select("created_at")
              .eq("id", messageId)
              .maybeSingle();

            if (!editedMsg) {
              toast.error("Message not found");
              return;
            }

            // Update UI and DB
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

            if (updateError) {
              toast.error("Failed to save edit");
              return;
            }

            // Delete all subsequent messages in this conversation in the DB
            const { error: deleteError } = await supabase
              .from("messages")
              .delete()
              .eq("conversation_id", threadId)
              .gt("created_at", editedMsg.created_at);

            if (deleteError) {
              console.error("Failed to clean up subsequent messages:", deleteError);
            }

            // Update local state: keep messages up to and including the edited user message
            const msgs = (messagesRaw as any[]);
            const editedIdx = msgs.findIndex((m: any) => m.id === messageId);
            if (editedIdx === -1) return;

            const baseMessages = msgs.slice(0, editedIdx + 1).map((m: any) =>
              m.id === messageId
                ? { ...m, content: newText, parts: [{ type: "text", text: newText }] }
                : m
            );

            setMessages(baseMessages);

            // Trigger reload to generate the new assistant response
            regenerate({
              body: { isRetry: true }
            });
          }}
          userId={userId ?? undefined}
          onPromptClick={(prompt) => {
            setInput(prompt);
          }}
        />

        {/* Input area */}
        <div className="flex-shrink-0">
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
          onFileChange={handleFileChange}
          onRemoveFile={() => {
            setAttachedFile(null);
            setDocUploadError(null);
          }}
          onUpgrade={() => setShowPlans(true)}
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
