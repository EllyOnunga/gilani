import React, { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Plus, X, Send, Loader2, ShieldAlert, CheckCircle2, Clock, Brain, Paperclip, Trash2, FileText, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { parseDocument } from "@/lib/document-parser";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { withTimeout } from "@/lib/async";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ✅ Route declaration at module level (moved to bottom export, defined here for use in component)
export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  component: TutorThread,
});

type Thread = {
  id: string;
  title?: string | null;
  updated_at?: string | null;
};

function TutorThread() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then((res) => {
      if (!active) return;
      const session = res?.data?.session;
      if (session?.access_token) setAuthToken(session.access_token);
      setAuthLoading(false);
    }).catch((err) => {
      console.error("[TutorThread] Failed to get auth session:", err);
      if (active) setAuthLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground font-medium">Verifying credentials…</p>
      </div>
    );
  }

  return <TutorThreadInner authToken={authToken} />;
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
  const [escalationStatus, setEscalationStatus] = useState<"open" | "in_review" | "resolved" | null>(null);
  const [escalating, setEscalating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Client-side file attachment states
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string; size: number } | null>(null);
  const [parsingFile, setParsingFile] = useState(false);

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
        e.target.value = ""; // Reset element value
      }
    }
  };

  const handleDeleteThread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this study session? This will permanently erase all chat logs."
    );
    if (!confirmDelete) return;

    const toastId = toast.loading("Deleting session...");
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
      
      setThreads((prev) => prev.filter((t) => t.id !== id));
      toast.success("Session deleted successfully!", { id: toastId });
      
      // If we deleted the active thread, navigate back to tutor home
      if (id === threadId) {
        navigate({ to: "/tutor" } as any);
      }
    } catch (err: any) {
      console.error("Failed to delete thread:", err);
      toast.error(err.message || "Failed to delete session", { id: toastId });
    }
  };

  // Curriculum profiles state
  const [curriculum, setCurriculum] = useState<string>("KCSE");

  // Load student's saved curriculum from profiles
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
        if (mounted && data?.curriculum) {
          setCurriculum(data.curriculum);
        }
      } catch (err) {
        console.error("Failed to load user curriculum profile:", err);
      }
    })();
    return () => { mounted = false; };
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
      console.error("Failed to update curriculum profile:", err);
      toast.error(err.message || "Failed to update curriculum", { id: toastId });
    }
  };

  // Safety net: force all loading states off after 10s regardless of what else is happening.
  // Prevents permanent spinner when auth refresh fails or DB is slow.
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

  // ✅ Fixed: transport is memoized — no new object on every render,
  //    and re-creates only when threadId or authToken changes
  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/chat",
        body: { threadId },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      }),
    [threadId, authToken]
  );

  const { messages, setMessages, sendMessage, status } = useChat({
    transport,
    onError: (err) => setChatError(err instanceof Error ? err.message : String(err)),
    onFinish: () => setChatError(null),
  });

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
        // Build structured context using standard XML tags for optimal AI reasoning
        finalMessage = `[Document Attached: ${attachedFile.name}]\n\n<DocumentContent name="${attachedFile.name}">\n${attachedFile.text}\n</DocumentContent>\n\nStudent Query: ${trimmedInput}`;
      }

      // If this is the FIRST message in the thread (i.e. messages.length === 0)
      // and the current thread title is "New thread" or "Untitled"
      const currentThread = threads.find((t) => t.id === threadId);
      if (messages.length === 0 && (!currentThread?.title || currentThread.title === "New thread")) {
        // Derive a beautiful title from user input (up to 32 chars)
        let derivedTitle = trimmedInput;
        if (derivedTitle.length > 32) {
          derivedTitle = derivedTitle.slice(0, 29) + "...";
        }
        
        // Non-blocking background database update to keep UI fast
        supabase
          .from("conversations")
          .update({ title: derivedTitle })
          .eq("id", threadId)
          .then(({ error }) => {
            if (error) console.error("Failed to update thread title:", error);
          });
          
        // Update local sidebar threads state instantly
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, title: derivedTitle } : t))
        );
      }

      // Clear textbox and attachment instantly for real-time responsiveness
      setInput("");
      setAttachedFile(null);

      // Trigger sendMessage in the background without blocking the UI
      sendMessage({ text: finalMessage }).catch((error) => {
        console.error("[TutorThread] sendMessage background error:", error);
        toast.error("Failed to send message. Please try again.");
      });
    } catch (error) {
      console.error("[TutorThread] submit error:", error);
    }
  };

  const handleEscalate = async () => {
    if (!threadId) return;
    setEscalating(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes?.data?.session;
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not logged in");

      const { error } = await supabase.from("escalations").insert({
        conversation_id: threadId,
        user_id: userId,
        reason: "student_request",
        status: "open",
        detail: "Student manually requested teacher review.",
      });

      if (error) throw error;

      setEscalationStatus("open");
      toast.success("Conversation successfully escalated to a teacher!");
    } catch (err: any) {
      console.error("Failed to escalate:", err);
      toast.error(err?.message || "Failed to escalate conversation.");
    } finally {
      setEscalating(false);
    }
  };

  // Listen for global manual escalation events (e.g. from the sidebar layout)
  useEffect(() => {
    const handleGlobalEscalate = () => {
      if (!escalationStatus && !escalating && !messagesLoading) {
        handleEscalate();
      }
    };
    window.addEventListener("custom:trigger-escalation", handleGlobalEscalate);
    return () => {
      window.removeEventListener("custom:trigger-escalation", handleGlobalEscalate);
    };
  }, [handleEscalate, escalationStatus, escalating, messagesLoading]);

  // Load sidebar thread list
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const sessionResult = await withTimeout(
          sessionPromise,
          5000,
          "Session fetch timed out"
        ).catch((e) => {
          console.error("[TutorThread] session timeout:", e);
          return { data: { session: null }, error: e };
        }) as any;

        const session = sessionResult?.data?.session;
        const sessionError = sessionResult?.error;

        if (sessionError) {
          if (mounted) setThreadsLoadError(`Authentication error: ${sessionError.message || sessionError}. Please sign in again.`);
          return;
        }

        const userId = session?.user?.id;
        if (!userId) {
          if (mounted) setThreadsLoadError("Not authenticated. Please sign in.");
          return;
        }

        const { data, error } = await withTimeout(
          Promise.resolve(
            supabase
              .from("conversations")
              .select("id,title,updated_at")
              .eq("user_id", userId)
              .order("updated_at", { ascending: false })
          ),
          8000,
          "Database connection timed out"
        ) as any;

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
    return () => { mounted = false; };
  }, []);

  // Load messages and active escalation status for the current thread
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (!threadId) {
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);
    setMessagesLoadError(null);

    timeoutId = setTimeout(() => {
      if (mounted) {
        setMessagesLoading(false);
        setMessagesLoadError("Loading timed out. The database may be unavailable.");
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

        if (mounted) {
          if (messagesRes.error) {
            setMessagesLoadError(`Database error: ${messagesRes.error.message}`);
            setMessagesLoading(false);
            return;
          }
          setMessages(
            (messagesRes.data ?? []).map((m) => ({
              id: m.id ?? crypto.randomUUID(),
              role: m.role as "user" | "assistant",
              parts: [{ type: "text" as const, text: m.content || "" }],
            }))
          );
          setEscalationStatus((escalationRes.data?.status as any) || null);
          setMessagesLoading(false);
        }
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
  }, [threadId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // 🔴 Real-time: listen for escalation status changes on this thread
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
            if (newStatus === "resolved") {
              toast.success("A teacher has reviewed your conversation and responded!", {
                duration: 6000,
              });
            } else if (newStatus === "in_review") {
              toast.info("A teacher is now reviewing your conversation.", { duration: 4000 });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  // 🔴 Real-time: listen for new teacher messages (assistant role) inserted into this thread
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
          // Only append if this is a teacher-injected assistant message (not from the AI stream)
          if (msg?.role === "assistant" && msg?.content?.includes("Teacher Review:")) {
            const teacherMsg = {
              id: msg.id ?? crypto.randomUUID(),
              role: "assistant" as const,
              parts: [{ type: "text" as const, text: msg.content || "" }],
            };
            setMessages((prev) => {
              const alreadyExists = prev.some((m) => m.id === teacherMsg.id);
              if (alreadyExists) return prev;
              return [...prev, teacherMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, messagesLoading]);

  // ✅ Fixed: use full typed route path with params
  const handleSelectThread = (id: string) => {
    navigate({
      to: "/tutor/$threadId",
      params: { threadId: id },
    } as any);
  };

  const createNewThread = async () => {
    const sessionRes = await supabase.auth.getSession();
    const session = sessionRes?.data?.session;
    const userId = session?.user?.id;
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

    navigate({
      to: "/tutor/$threadId",
      params: { threadId: newId },
    } as any);
  };

  const ThreadList = (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Sessions
        </p>
        <button
          onClick={createNewThread}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3 w-3" /> New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {threads.map((t) => (
          <div
            key={t.id}
            className={`group relative flex items-center justify-between rounded-lg transition-colors ${
              t.id === threadId
                ? "bg-primary/10 text-primary font-semibold"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <button
              onClick={() => {
                handleSelectThread(t.id);
                setThreadsOpen(false);
              }}
              className="flex-1 text-left px-3 py-2.5 min-w-0 pr-10"
            >
              <div className="text-sm truncate">{t.title || "Untitled"}</div>
              {t.updated_at && (
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  {new Date(t.updated_at).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              )}
            </button>
            
            <button
              onClick={(e) => handleDeleteThread(t.id, e)}
              className="absolute right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
              title="Delete conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {threads.length === 0 && !threadsLoading && (
          <p className="text-xs text-muted-foreground text-center py-6 italic">
            No sessions yet. Start a new one!
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen flex-col lg:flex-row bg-background text-foreground">
      {/* Mobile overlay */}
      {threadsOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setThreadsOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 flex-col border-r border-border bg-sidebar p-4 overflow-hidden">
        {ThreadList}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar border-r border-border p-4 transition-transform duration-300 ease-in-out lg:hidden ${
          threadsOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-serif text-lg font-bold text-primary">Sessions</span>
          <button
            onClick={() => setThreadsOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {ThreadList}
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-border bg-sidebar px-4 py-3 lg:hidden">
          <button
            onClick={() => setThreadsOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
            Study Sessions
          </button>
        </div>

        {/* AI Thinking indicator removed in favor of inline ThoughtAccordion */}

        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3.5 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">
              {threads.find((t) => t.id === threadId)?.title || "Untitled Session"}
            </h2>
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
              Curriculum Grounded Assistant
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Curriculum Selector Dropdown */}
            <select
              value={curriculum}
              onChange={(e) => handleCurriculumChange(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-accent transition-colors"
              title="Select your study curriculum standards"
            >
              <option value="KCSE">KCSE (KNEC)</option>
              <option value="CBC">CBC Curriculum</option>
              <option value="8-4-4">8-4-4 Standards</option>
              <option value="IGCSE Cambridge">IGCSE Cambridge</option>
              <option value="IGCSE Edexcel">IGCSE Edexcel</option>
            </select>
            {escalationStatus === "open" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-amber-700">
                <Clock className="h-3 w-3 animate-pulse" /> Review Pending
              </span>
            )}
            {escalationStatus === "in_review" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-blue-700">
                <Clock className="h-3 w-3 animate-pulse" /> Teacher Reviewing
              </span>
            )}
            {escalationStatus === "resolved" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-green-700">
                <CheckCircle2 className="h-3 w-3" /> Reviewed
              </span>
            )}
            {!escalationStatus && threadId && (
              <button
                onClick={handleEscalate}
                disabled={escalating || messagesLoading}
                className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-accent disabled:opacity-50 transition-colors"
                title="Escalate this study session to a human teacher for review"
              >
                {escalating ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : (
                  <ShieldAlert className="h-3 w-3 text-red-500" />
                )}
                Escalate
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {threadsLoadError && (
            <div className="mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              <p>{threadsLoadError}</p>
              <button
                onClick={() => navigate({ to: "/login" } as any)}
                className="mt-2 underline underline-offset-2 hover:text-destructive/80"
              >
                Sign in
              </button>
            </div>
          )}

          {messagesLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
              <span className="flex gap-1 items-center text-muted-foreground">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>•</span>
              </span>
              <p className="text-sm text-muted-foreground">Loading thread messages…</p>
            </div>
          )}

          {!messagesLoading && messagesLoadError && (
            <div className="mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              <p>{messagesLoadError}</p>
              <button
                onClick={() => navigate({ to: "/tutor" } as any)}
                className="mt-2 underline underline-offset-2 hover:text-destructive/80"
              >
                Start a new session
              </button>
            </div>
          )}

          {chatError && (
            <div className="mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {chatError}
            </div>
          )}

          {!messagesLoading && !messagesLoadError && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-serif text-xl text-muted-foreground">Start a conversation</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Ask GilaniAI anything about your KCSE or CBC curriculum.
              </p>
            </div>
          )}

          {!messagesLoading &&
            !messagesLoadError &&
            messages.map((m, idx) => (
              <div
                key={m.id ?? idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border text-foreground rounded-tl-sm"
                  }`}
                >
                  {(() => {
                    // Primary: accumulate text from parts[] (AI SDK v6 UIMessage format,
                    // populated by TextStreamChatTransport during streaming and by setMessages
                    // when loading from DB)
                    const partsText = m.parts
                      ?.filter((p: any) => p.type === "text")
                      .map((p: any) => p.text || "")
                      .join("") || "";

                    // Fallback: m.content getter (UIMessage.finalStep.content)
                    // covers edge cases where parts may be empty/missing
                    const displayText = partsText || (m as any).content || "";

                    if (m.role === "assistant") {
                      const isLast = idx === messages.length - 1;
                      const isStreamActive = isPending;
                      
                      return (
                        <div className="flex flex-col w-full">
                          <ThoughtAccordion
                            messageId={m.id || String(idx)}
                            isLastMessage={isLast}
                            isStreaming={isStreamActive}
                            messageText={displayText}
                          />
                          {displayText ? (
                            <div className="mt-1 prose-ai">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                              >
                                {displayText}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            isLast && isStreamActive ? null : (
                              <span className="text-xs text-muted-foreground italic mt-1">
                                No response generated. Please resend your question.
                              </span>
                            )
                          )}
                        </div>
                      );
                    }

                    return (
                      <span className="whitespace-pre-wrap">{displayText}</span>
                    );
                  })()}
                </div>
              </div>
            ))}

          {/* Virtual Assistant thinking bubble during early stream request phase */}
          {isPending && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start animate-in-slide">
              <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-card border border-border text-foreground rounded-tl-sm w-full">
                <div className="flex flex-col w-full">
                  <ThoughtAccordion
                    messageId="temp-thinking-indicator"
                    isLastMessage={true}
                    isStreaming={true}
                    messageText=""
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-background p-3 sm:p-4">
          {/* Attached file preview */}
          {attachedFile && (
            <div className="mb-2.5 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 animate-in-slide">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground">{attachedFile.name}</p>
                  <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                    {(attachedFile.size / 1024).toFixed(1)} KB • Document text loaded
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAttachedFile(null)}
                className="rounded-md p-1 hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                title="Remove attachment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 sm:gap-3">
            {/* Paperclip Button */}
            <input
              type="file"
              id="chat-file-attachment"
              className="hidden"
              accept=".pdf,.docx,.txt,.md,.csv"
              onChange={handleFileChange}
              disabled={isPending || parsingFile}
            />
            <label
              htmlFor="chat-file-attachment"
              className={`flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-card shadow-sm hover:bg-accent transition-colors ${
                isPending || parsingFile ? "opacity-50 pointer-events-none" : ""
              }`}
              title="Attach a document (PDF, DOCX, TXT, MD, CSV)"
            >
              {parsingFile ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              )}
            </label>

            <textarea
              className="flex-1 min-h-[44px] max-h-36 resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
              rows={1}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question… (Enter to send)"
              disabled={isPending || parsingFile}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(e);
                }
              }}
            />
            <button
              onClick={(e) => submit(e as any)}
              disabled={isPending || parsingFile || !input.trim()}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              title="Send"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-muted-foreground text-center">
            {isPending ? (
              <span className="text-primary/70">GilaniAI is thinking… please wait</span>
            ) : (
              "Shift+Enter for new line"
            )}
          </p>
        </div>
      </main>
    </div>
  );
}

function AiThinkingIndicator() {
  return null; // Deprecated, replaced by inline ThoughtAccordion
}

// ─── Rich Markdown Renderer ──────────────────────────────────────────────────
// Custom react-markdown component map: maps markdown elements to styled React
// components. No raw asterisks or pound signs ever appear in the rendered UI.
const markdownComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  // ── Headings ──────────────────────────────────────────────────────────────
  h1: ({ children }) => (
    <h1 className="text-lg font-extrabold mt-4 mb-1.5 text-primary border-b border-primary/20 pb-1 leading-snug">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold mt-3.5 mb-1 text-blue-600 dark:text-blue-400 leading-snug">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold mt-3 mb-0.5 text-purple-600 dark:text-purple-400 leading-snug">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold mt-2 mb-0.5 text-teal-600 dark:text-teal-400">
      {children}
    </h4>
  ),

  // ── Paragraphs ────────────────────────────────────────────────────────────
  p: ({ children }) => (
    <p className="text-sm leading-relaxed mb-2 last:mb-0">
      {children}
    </p>
  ),

  // ── Inline emphasis ───────────────────────────────────────────────────────
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-muted-foreground">{children}</em>
  ),

  // ── Links ─────────────────────────────────────────────────────────────────
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 transition-colors font-medium"
    >
      {children}
      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-70" />
    </a>
  ),

  // ── Images ────────────────────────────────────────────────────────────────
  img: ({ src, alt }) => (
    <figure className="my-3">
      <img
        src={src}
        alt={alt || ""}
        className="rounded-xl border border-border max-w-full shadow-sm"
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement("p");
            fallback.className = "text-xs text-muted-foreground italic";
            fallback.textContent = `[Image unavailable: ${alt || src}]`;
            parent.appendChild(fallback);
          }
        }}
      />
      {alt && (
        <figcaption className="text-[10px] font-mono text-muted-foreground mt-1 text-center italic">
          {alt}
        </figcaption>
      )}
    </figure>
  ),

  // ── Lists ─────────────────────────────────────────────────────────────────
  ul: ({ children }) => (
    <ul className="list-none pl-0 my-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1 marker:text-primary marker:font-semibold">{children}</ol>
  ),
  li: ({ children, node, ...props }: any) => {
    const isOrdered = node?.parent?.type === "element" && node?.parent?.tagName === "ol";
    return (
      <li className={`text-sm leading-relaxed flex items-start gap-2 ${isOrdered ? "list-item" : ""}`}>
        {!isOrdered && (
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/60" />
        )}
        <span>{children}</span>
      </li>
    );
  },

  // ── Blockquotes ───────────────────────────────────────────────────────────
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/50 pl-3 my-2 bg-primary/5 rounded-r-lg py-1.5 text-sm text-muted-foreground italic">
      {children}
    </blockquote>
  ),

  // ── Inline code ───────────────────────────────────────────────────────────
  code: ({ inline, children, ...props }: any) =>
    inline ? (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-primary">
        {children}
      </code>
    ) : (
      <code className="block bg-[#1e1e2e] text-green-300 font-mono text-[11px] leading-relaxed p-3 rounded-xl overflow-x-auto">
        {children}
      </code>
    ),

  // ── Code blocks ───────────────────────────────────────────────────────────
  pre: ({ children }) => (
    <pre className="my-2 rounded-xl overflow-hidden bg-[#1e1e2e] shadow-inner">
      {children}
    </pre>
  ),

  // ── Horizontal rule ───────────────────────────────────────────────────────
  hr: () => <hr className="my-3 border-border/60" />,

  // ── Tables ────────────────────────────────────────────────────────────────
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/60 text-xs uppercase tracking-wider font-semibold">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-sm">{children}</td>
  ),
};

interface ThoughtAccordionProps {
  messageId: string;
  isLastMessage: boolean;
  isStreaming: boolean;
  messageText: string;
}

function ThoughtAccordion({ messageId, isLastMessage, isStreaming, messageText }: ThoughtAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hasStartedGenerating, setHasStartedGenerating] = useState(false);
  const [finalDuration, setFinalDuration] = useState<number | null>(null);

  // Cycling pedagogical steps for visual feedback
  const steps = [
    "Consulting Kenyan national curriculum standards...",
    "Reviewing context from your uploaded study notes...",
    "Brainstorming relevant real-world illustrations...",
    "Structuring step-by-step Socratic pedagogical guidance...",
    "Polishing primary English and secondary Swahili definitions...",
  ];

  // Derive a stable, realistic historical duration for past messages based on their text content
  const historicalDuration = useMemo(() => {
    // Generate a pseudo-random but stable number between 3 and 7 based on the message ID
    let hash = 0;
    for (let i = 0; i < messageId.length; i++) {
      hash = messageId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs((hash % 5) + 3);
  }, [messageId]);

  // Keep track of the active ticking timer for the currently streaming message
  useEffect(() => {
    if (!isStreaming || !isLastMessage) return;

    if (messageText.trim() !== "") {
      // Once text starts streaming, freeze the duration
      if (!hasStartedGenerating) {
        setHasStartedGenerating(true);
        setFinalDuration(seconds || 1);
        setIsOpen(false); // Auto-collapse when writing begins!
      }
      return;
    }

    // Expand thought box by default while thinking
    setIsOpen(true);

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, isLastMessage, messageText, hasStartedGenerating, seconds]);

  const duration = finalDuration !== null ? finalDuration : (isStreaming && isLastMessage && !hasStartedGenerating ? seconds : historicalDuration);
  const activeStepIdx = Math.min(Math.floor(duration / 1.5), steps.length - 1);
  const isThinking = isStreaming && isLastMessage && !hasStartedGenerating;

  return (
    <div className="bg-muted/30 border border-border/50 rounded-xl p-3 my-1.5 w-full select-none transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left font-sans text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          {isThinking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <Brain className="h-3.5 w-3.5 text-primary/70" />
          )}
          <span className="font-semibold uppercase tracking-wider font-mono text-[9px]">
            {isThinking
              ? `Thinking process (${duration}s...)`
              : `Thought process (${duration}s)`}
          </span>
        </div>
        <ChevronUp
          className={`h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-300 ${
            isOpen ? "" : "rotate-180"
          }`}
        />
      </button>

      {isOpen && (
        <div className="mt-3 border-t border-border/40 pt-2.5 font-mono text-[10px] text-muted-foreground/80 space-y-2 animate-in-slide">
          <div className="space-y-1.5">
            {steps.map((step, idx) => {
              const completed = idx < activeStepIdx;
              const active = idx === activeStepIdx && isThinking;
              
              let statusSymbol = "•";
              if (completed) statusSymbol = "✓";
              else if (active) statusSymbol = "⚡";

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 transition-colors duration-300 ${
                    completed ? "text-primary/70 font-semibold" : ""
                  } ${active ? "text-primary animate-pulse font-bold" : ""}`}
                >
                  <span className="w-3 flex-shrink-0 text-center">{statusSymbol}</span>
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
