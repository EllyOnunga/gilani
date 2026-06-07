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
} from "@/lib/tutor.server-fns";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { exportAsPDF, exportAsWord } from "@/lib/export-utils";
import { withTimeout } from "@/lib/async";
import { toast } from "sonner";
import { ChatHeader } from "@/components/tutor/ChatHeader";
import { ChatInput } from "@/components/tutor/ChatInput";
import { ThreadSidebar } from "@/components/tutor/ThreadSidebar";
import { DeleteModal } from "@/components/tutor/DeleteModal";
import { EscalateModal } from "@/components/tutor/EscalateModal";
import { MessageList } from "@/components/tutor/MessageList";

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
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then((res) => {
        if (!active) return;
        const session = res?.data?.session;
        if (session?.access_token) setAuthToken(session.access_token);
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
  return <TutorThreadInner key={threadId} authToken={authToken} />;
}

function TutorThreadInner({ authToken }: { authToken: string | null }) {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
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
  const [curriculum, setCurriculum] = useState<string>("KCSE");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setParsingFile(true);
      const file = e.target.files[0];
      const toastId = toast.loading(`Extracting text from ${file.name}...`);
      try {
        const parsed = await parseDocument(file);
        setAttachedFile(parsed);
        toast.success("Document attached successfully!", { id: toastId });
      } catch (err: any) {
        toast.error(err.message || "Failed to attach document", { id: toastId });
      } finally {
        setParsingFile(false);
        e.target.value = "";
      }
    }
  };

  // Load curriculum
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sessionRes = await supabase.auth.getSession();
        const userId = sessionRes?.data?.session?.user?.id;
        if (!userId) return;
        const { data, error } = await supabase
          .from("profiles")
          .select("curriculum")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw error;
        if (mounted && data?.curriculum) setCurriculum(data.curriculum);
      } catch (err) {
        console.error("Failed to load user curriculum profile:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCurriculumChange = async (newVal: string) => {
    setCurriculum(newVal);
    const toastId = toast.loading(`Updating curriculum to ${newVal}...`);
    try {
      const sessionRes = await supabase.auth.getSession();
      const userId = sessionRes?.data?.session?.user?.id;
      if (!userId) throw new Error("Not logged in");
      const { error } = await supabase
        .from("profiles")
        .update({ curriculum: newVal })
        .eq("id", userId);
      if (error) throw error;
      toast.success(`Curriculum switched to ${newVal}!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to update curriculum", { id: toastId });
    }
  };

  // Safety timeout
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
      new TextStreamChatTransport({
        api: "/api/chat",
        body: { threadId },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      }),
    [threadId, authToken],
  );

  const chatHelpers: any = useChat({
    transport,
    onError: (err) => setChatError(err instanceof Error ? err.message : String(err)),
    onFinish: () => {
      setChatError(null);
    },
  });

  const { messages: messagesRaw, setMessages, sendMessage, status, reload } = chatHelpers;
  const messages = messagesRaw as UIMessage[];
  const isPending = status === "submitted" || status === "streaming";

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const submit = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    try {
      let finalMessage = trimmedInput;
      if (attachedFile) {
        const MAX_DOC_CHARS = 8000;
        const docText = attachedFile.text.length > MAX_DOC_CHARS
          ? attachedFile.text.slice(0, MAX_DOC_CHARS) + "\n\n[Document truncated to 8000 characters due to size limits]"
          : attachedFile.text;
        finalMessage = `[Document Attached: ${attachedFile.name}]\n\n<DocumentContent name="${attachedFile.name}">\n${docText}\n</DocumentContent>\n\nStudent Query: ${trimmedInput}`;
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
    setEscalating(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes?.data?.session;
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not logged in");

      let reviewerId: string | null = null;
      if (email) {
        try {
          reviewerId = await lookupTeacherByEmail({ data: email });
        } catch (err: any) {
          setEscalateEmailError(err.message || "No teacher found with that email.");
          setEscalating(false);
          return;
        }
      }

      const { error } = await supabase.from("escalations").insert({
        conversation_id: threadId,
        user_id: userId,
        reason: "student_request",
        status: "open",
        detail: "Student manually requested teacher review.",
        reviewer_id: reviewerId,
      });
      if (error) throw error;

      await createEscalationNotification({
        data: { conversationId: threadId, reviewerId, studentId: userId },
      });

      setEscalationStatus("open");
      setEscalateModalOpen(false);
      setTeacherEmail("");
      toast.success(
        reviewerId
          ? "Conversation escalated to your teacher!"
          : "Conversation escalated to available teachers!",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to escalate conversation.");
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
          supabase
            .from("escalations")
            .select("status")
            .eq("conversation_id", threadId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
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
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen flex-col lg:flex-row bg-background text-foreground">
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
        curriculum={curriculum}
        onCurriculumChange={handleCurriculumChange}
        escalationStatus={escalationStatus}
        escalating={escalating}
        messagesLoading={messagesLoading}
        onEscalate={() => setEscalateModalOpen(true)}
        onExportPDF={handleExportPDF}
        onExportWord={handleExportWord}
        threadTitle={threads.find((t) => t.id === threadId)?.title || ""}
      />
      {/* Main chat area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 lg:hidden">
          <button
            onClick={() => setThreadsOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
            title="Open sessions"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setThreadsOpen(true)}
            className="flex-1 mx-3 text-left text-sm font-semibold truncate hover:text-primary transition-colors"
            title="Click to switch or create session"
          >
            {threads.find((t) => t.id === threadId)?.title || "Untitled Session"}
          </button>
          <button
            onClick={createNewThread}
            className="flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
            title="New session"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        {/* Chat header */}
        <ChatHeader
          title={threads.find((t) => t.id === threadId)?.title || "Untitled Session"}
          curriculum={curriculum}
          onCurriculumChange={handleCurriculumChange}
          escalationStatus={escalationStatus}
          escalating={escalating}
          messagesLoading={messagesLoading}
          onEscalate={() => setEscalateModalOpen(true)}
          onExportPDF={handleExportPDF}
          onExportWord={handleExportWord}
          threadId={threadId}
          threadTitle={threads.find((t) => t.id === threadId)?.title || ""}
        />
        {/* Messages area */}
        <MessageList
          messages={messages}
          messagesLoading={messagesLoading}
          messagesLoadError={messagesLoadError}
          isPending={isPending}
          onReload={reload}
          onPromptClick={(prompt) => {
            setInput(prompt);
          }}
        />

        {/* Input area */}
        <ChatInput
          input={input}
          isPending={isPending}
          parsingFile={parsingFile}
          attachedFile={attachedFile}
          chatError={chatError}
          onInputChange={handleInputChange}
          onSubmit={submit}
          onFileChange={handleFileChange}
          onRemoveFile={() => setAttachedFile(null)}
        />
      </main>
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
              await deleteThreadFn({ data: id! });
              setThreads((prev) => prev.filter((t) => t.id !== id));
              toast.success("Session deleted successfully!", { id: toastId });
              if (id === threadId) {
                navigate({ to: "/tutor" } as any);
              }
            } catch (err: any) {
              console.error("Failed to delete thread:", err);
              toast.error(err.message || "Failed to delete session", { id: toastId });
            }
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
