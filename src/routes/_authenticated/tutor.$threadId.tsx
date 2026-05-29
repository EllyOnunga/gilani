import React, { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Plus, X, Send, Loader2, ShieldAlert, CheckCircle2, Clock, Brain } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { withTimeout } from "@/lib/async";
import { toast } from "sonner";

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

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const submit = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    try {
      await sendMessage({ text: trimmedInput });
      setInput("");
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

    if (threadsLoading) {
      setMessagesLoading(true);
      return;
    }

    if (threads.length === 0) {
      setMessagesLoading(false);
      setMessages([]);
      setMessagesLoadError(null);
      return;
    }

    const threadBelongsToUser = threads.some((t) => t.id === threadId);
    if (!threadBelongsToUser) {
      setMessagesLoading(false);
      setMessagesLoadError("Thread not found or access denied.");
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
  }, [threadId, threadsLoading, threads]);

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
          <button
            key={t.id}
            onClick={() => {
              handleSelectThread(t.id);
              setThreadsOpen(false);
            }}
            className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
              t.id === threadId
                ? "bg-primary/10 text-primary font-semibold"
                : "hover:bg-accent text-foreground"
            }`}
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

        {/* AI Thinking progress bar — visible at the very top of the chat when streaming */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            status === "streaming" ? "max-h-10 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2">
            <Brain className="h-3.5 w-3.5 text-primary animate-pulse flex-shrink-0" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-semibold">
              GilaniAI is formulating your answer…
            </p>
            <div className="ml-auto flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>

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

                    if (displayText) {
                      return (
                        <span className="whitespace-pre-wrap">{displayText}</span>
                      );
                    }

                    // No text yet — show thinking indicator for the last assistant message while streaming
                    if (status === "streaming" && m.role === "assistant" && idx === messages.length - 1) {
                      return <AiThinkingIndicator />;
                    }

                    return (
                      <span className="text-xs text-muted-foreground">
                        No response generated. Please resend your question.
                      </span>
                    );
                  })()}
                </div>
              </div>
            ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-background p-3 sm:p-4">
          <div className="flex items-end gap-2 sm:gap-3">
            <textarea
              className="flex-1 min-h-[44px] max-h-36 resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
              rows={1}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question… (Enter to send)"
              disabled={status === "streaming"}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(e);
                }
              }}
            />
            <button
              onClick={(e) => submit(e as any)}
              disabled={status === "streaming" || !input.trim()}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              title="Send"
            >
              {status === "streaming" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-muted-foreground text-center">
            {status === "streaming" ? (
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
  const steps = [
    "Consulting Kenyan national curriculum standards...",
    "Reviewing context from your uploaded study notes...",
    "Brainstorming relevant real-world illustrations...",
    "Structuring step-by-step Socratic pedagogical guidance...",
    "Polishing primary English and secondary Swahili definitions...",
  ];
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % steps.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-2 p-1.5 animate-pulse min-w-[200px]">
      <div className="flex gap-1.5 items-center text-primary font-mono text-[10px] uppercase tracking-widest font-bold">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>GilaniAI is formulating your response</span>
      </div>
      <p className="text-xs text-muted-foreground italic font-sans transition-all duration-300">
        ✨ {steps[stepIdx]}
      </p>
    </div>
  );
}
