import React, { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Plus, X, Send } from "lucide-react";
import { fetchWithTimeout, getErrorMessage } from "@/lib/async";

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
  const [threadsOpen, setThreadsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // load threads
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("load threads", error);
        return;
      }
      if (mounted && data) setThreads(data as Thread[]);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!threadId) return;
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", threadId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("load messages", error);
        return;
      }
      if (mounted && data) setMessages(data as Message[]);
      // mark thread selected in UI maybe; no routing change here
    })();
    return () => {
      mounted = false;
    };
  }, [threadId]);

  useEffect(() => {
    // simple scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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

    // optimistic user message
    const userMsg: Message = {
      conversation_id: threadId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);

    // Create placeholder assistant message that we'll stream into
    const assistantPlaceholder: Message = {
      conversation_id: threadId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, assistantPlaceholder]);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        90000,
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
        // replace placeholder with full body
        setMessages((m) => {
          const copy = [...m];
          const idx = copy.map((x) => x.role).lastIndexOf("assistant");
          if (idx >= 0) copy[idx] = { ...copy[idx], content: full };
          return copy;
        });
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let assistantText = "";

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value);
            assistantText += chunk;
            // update placeholder assistant message progressively
            setMessages((m) => {
              const copy = [...m];
              const idx = copy.map((x) => x.role).lastIndexOf("assistant");
              if (idx >= 0) copy[idx] = { ...copy[idx], content: assistantText };
              return copy;
            });
          }
        }
      }

      // server is responsible for persisting the assistant response and user message
    } catch (err) {
      const message = getErrorMessage(err, "Failed to send message");
      setChatError(message);
      // Replace assistant placeholder with a visible failure so UI never looks stuck.
      setMessages((m) => {
        const copy = [...m];
        const idx = copy.map((x) => x.role).lastIndexOf("assistant");
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
    }
  };

  const createNewThread = async () => {
    const title = "New thread";
    const {
      data: { session },
    } = await supabase.auth.getSession();
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

  // ── Thread list panel (reused in both desktop sidebar and mobile drawer) ──
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
      {/* Mobile backdrop */}
      {threadsOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setThreadsOpen(false)}
        />
      )}

      {/* Desktop thread sidebar */}
      <aside className="hidden lg:flex lg:w-64 flex-col border-r border-border bg-sidebar p-4 overflow-hidden">
        {ThreadList}
      </aside>

      {/* Mobile thread slide-over drawer */}
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

      {/* Main chat column */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile sub-header */}
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
          {chatError && (
            <div className="mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {chatError}
            </div>
          )}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-serif text-xl text-muted-foreground">Start a conversation</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Ask GilaniAI anything about your KCSE or CBC curriculum.
              </p>
            </div>
          )}
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border text-foreground rounded-tl-sm"
                }`}
              >
                {m.content || (
                  <span className="flex gap-1 items-center text-muted-foreground">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
                      •
                    </span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>
                      •
                    </span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>
                      •
                    </span>
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Sticky input bar */}
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
