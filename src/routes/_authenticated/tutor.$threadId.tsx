import React, { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Plus, X, Send } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { withTimeout } from "@/lib/async";

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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ✅ Fixed: authToken is now populated from Supabase session
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setAuthToken(session.access_token);
    });
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

  // Load sidebar thread list
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const { data: { session }, error: sessionError } = await withTimeout(
          sessionPromise,
          5000,
          "Session fetch timed out"
        ).catch((e) => {
          console.error("[TutorThread] session timeout:", e);
          return { data: { session: null }, error: e };
        });

        if (sessionError) {
          if (mounted) setThreadsLoadError(`Authentication error: ${sessionError.message}. Please sign in again.`);
          return;
        }

        const userId = session?.user?.id;
        if (!userId) {
          if (mounted) setThreadsLoadError("Not authenticated. Please sign in.");
          return;
        }

        const { data, error } = await supabase
          .from("conversations")
          .select("id,title,updated_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

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

  // Load messages for the current thread
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
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", threadId)
          .order("created_at", { ascending: true });

        clearTimeout(timeoutId);

        if (mounted) {
          if (error) {
            setMessagesLoadError(`Database error: ${error.message}`);
            setMessagesLoading(false);
            return;
          }
          setMessages(
            (data ?? []).map((m) => ({
              id: m.id ?? crypto.randomUUID(),
              role: m.role as "user" | "assistant",
              parts: [{ type: "text" as const, text: m.content || "" }],
            }))
          );
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

  // ✅ Fixed: use full typed route path with params
  const handleSelectThread = (id: string) => {
    navigate({
      to: "/_authenticated/tutor/$threadId",
      params: { threadId: id },
    });
  };

  const createNewThread = async () => {
    const { data: { session } } = await supabase.auth.getSession();
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

    // ✅ Fixed: use full typed route path with params
    navigate({
      to: "/_authenticated/tutor/$threadId",
      params: { threadId: newId },
    });
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

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {threadsLoadError && (
            <div className="mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              <p>{threadsLoadError}</p>
              <button
                onClick={() => navigate({ to: "/_authenticated/login" } as any)}
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
                onClick={() => navigate({ to: "/_authenticated/tutor" })}
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
                  {m.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") ||
                    (status === "streaming" && idx === messages.length - 1 ? (
                      <span className="flex gap-1 items-center text-muted-foreground">
                        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>•</span>
                        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>•</span>
                        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>•</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No response generated. Please resend your question.
                      </span>
                    ))}
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
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-muted-foreground text-center">
            Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
}
