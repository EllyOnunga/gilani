import React, { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Plus, X, Send } from "lucide-react";
import { fetchWithTimeout, getErrorMessage, withTimeout } from "@/lib/async";

type Thread = {
  id: string;
  title?: string | null;
  updated_at?: string | null;
};

type Message = {
  id?: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string | null;
};

function TutorThread() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesLoadError, setMessagesLoadError] = useState<string | null>(null);
  const [pendingAssistantIndex, setPendingAssistantIndex] = useState<number | null>(null);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pendingAssistantIndexRef = useRef<number | null>(null);

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
          console.error("session timeout:", e);
          return { data: { session: null }, error: e };
        });

        if (sessionError) {
          console.error("session error:", sessionError);
          if (mounted) setThreads([]);
          return;
        }
        const userId = session?.user?.id;
        if (!userId) {
          if (mounted) setThreads([]);
          return;
        }
        const { data, error } = await supabase
          .from("conversations")
          .select("id,title,updated_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });
        if (error) {
          console.error("load threads", error);
          return;
        }
        if (mounted && data) setThreads(data as Thread[]);
      } catch (e) {
        console.error("thread load exception:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const loadMessages = async () => {
      if (!threadId) {
        setMessagesLoading(false);
        return;
      }

      // Must have threads loaded first - if empty, user has no threads
      if (threads.length === 0) {
        if (mounted) {
          setMessagesLoading(false);
          setMessages([]);
          setMessagesLoadError(null);
        }
        return;
      }

      // Check if thread belongs to user
      const threadBelongsToUser = threads.some((t) => t.id === threadId);
      if (!threadBelongsToUser) {
        if (mounted) {
          setMessagesLoading(false);
          setMessagesLoadError("Thread not found or access denied.");
        }
        return;
      }

      setMessagesLoading(true);
      setMessagesLoadError(null);
      setPendingAssistantIndex(null);
      pendingAssistantIndexRef.current = null;

      // Timeout safeguard - will show error after 5 seconds
      timeoutId = setTimeout(() => {
        if (mounted) {
          setMessagesLoading(false);
          setMessagesLoadError("Loading timed out. The database may be unavailable.");
        }
      }, 5000);

      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", threadId)
          .order("created_at", { ascending: true });

        clearTimeout(timeoutId);

        if (mounted) {
          if (error) {
            console.error("load messages error:", error);
            setMessagesLoadError(`Database error: ${error.message}`);
            setMessagesLoading(false);
            return;
          }
          setMessages((data ?? []) as Message[]);
          setMessagesLoading(false);
        }
      } catch (e) {
        clearTimeout(timeoutId);
        if (mounted) {
          console.error("load messages exception:", e);
          setMessagesLoadError("Connection failed. Try refreshing.");
          setMessagesLoading(false);
        }
      }
    };

    loadMessages();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [threadId, threads]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const handleSelectThread = (id: string) => {
    navigate({ to: `/tutor/${id}` });
  };

  const handleSend = async () => {
    if (!input.trim() || !threadId || sending) return;
    setChatError(null);
    const text = input;
    setInput("");
    setSending(true);

    const userMsg: Message = {
      conversation_id: threadId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    const assistantPlaceholder: Message = {
      conversation_id: threadId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages((m) => {
      const next = [...m, userMsg, assistantPlaceholder];
      const nextPending = next.length - 1;
      pendingAssistantIndexRef.current = nextPending;
      setPendingAssistantIndex(nextPending);
      return next;
    });

    const updateAssistantPlaceholder = (content: string) => {
      setMessages((m) => {
        const copy = [...m];
        const idx =
          pendingAssistantIndexRef.current ?? copy.map((x) => x.role).lastIndexOf("assistant");
        if (idx >= 0) copy[idx] = { ...copy[idx], content };
        return copy;
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetchWithTimeout(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ threadId, messages: [{ role: "user", content: text }] }),
        },
        20000,
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : `Chat request failed with status ${res.status}`;
        throw new Error(message);
      }

      if (!res.body) {
        const full = await res.text();
        updateAssistantPlaceholder(full);
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let assistantText = "";
        let stalledReadTimer: ReturnType<typeof setTimeout> | undefined;

        while (!done) {
          const stalledReadPromise = new Promise<never>((_, reject) => {
            stalledReadTimer = setTimeout(() => {
              reject(new Error("Tutor response timed out while streaming."));
            }, 25000);
          });
          const { value, done: doneReading } = await Promise.race([reader.read(), stalledReadPromise]);
          if (stalledReadTimer) clearTimeout(stalledReadTimer);
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value);
            assistantText += chunk;
            updateAssistantPlaceholder(assistantText);
          }
        }

        if (!assistantText.trim()) {
          throw new Error("Tutor returned an empty response. Please try again.");
        }
      }
    } catch (err) {
      const message = getErrorMessage(err, "Failed to send message");
      setChatError(message);
      setMessages((m) => {
        const copy = [...m];
        const idx =
          pendingAssistantIndexRef.current ?? copy.map((x) => x.role).lastIndexOf("assistant");
        if (idx >= 0) {
          copy[idx] = {
            ...copy[idx],
            content: `Sorry, I could not respond right now. ${message}`,
          };
        }
        return copy;
      });
      console.error("send error", err);
    } finally {
      setSending(false);
      pendingAssistantIndexRef.current = null;
      setPendingAssistantIndex(null);
    }
  };

  const createNewThread = async () => {
    const title = "New thread";
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    const { data, error } = await supabase
      .from("conversations")
      .insert([{ title, user_id: userId }])
      .select()
      .single();
    if (error) {
      console.error("create thread", error);
      return;
    }
    const newId = (data as any).id;
    setThreads((t) => [{ id: newId, title }, ...t]);
    navigate({ to: `/tutor/${newId}` });
    setThreadsOpen(false);
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
        {threads.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6 italic">
            No sessions yet. Start a new one!
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen flex-col lg:flex-row bg-background text-foreground">
      {threadsOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setThreadsOpen(false)}
        />
      )}

      <aside className="hidden lg:flex lg:w-64 flex-col border-r border-border bg-sidebar p-4 overflow-hidden">
        {ThreadList}
      </aside>

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

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border bg-sidebar px-4 py-3 lg:hidden">
          <button
            onClick={() => setThreadsOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
            Study Sessions
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                onClick={() => navigate({ to: "/tutor" })}
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
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border text-foreground rounded-tl-sm"
                  }`}
                >
                  {m.content ||
                    (sending && idx === pendingAssistantIndex ? (
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

        <div className="border-t border-border bg-background p-3 sm:p-4">
          <div className="flex items-end gap-2 sm:gap-3">
            <textarea
              className="flex-1 min-h-[44px] max-h-36 resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question… (Enter to send)"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
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

export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  component: TutorThread,
});