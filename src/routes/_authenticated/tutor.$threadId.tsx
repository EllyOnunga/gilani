import React, { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const userId = session?.user?.id;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ threadId, messages: [{ role: 'user', content: text }] }),
      });

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
      console.error("send error", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r p-4 overflow-auto">
        <div className="mb-4">
          <button
            className="px-3 py-1 rounded bg-gray-100"
            onClick={() => {
              // crude new thread creation
              (async () => {
                const title = "New thread";
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;
                if (!userId) {
                  console.error("create thread: no active session found");
                  return;
                }
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
              })();
            }}
          >
            + New
          </button>
        </div>

        <div>
          {threads.map((t) => (
            <div
              key={t.id}
              className={
                "p-2 rounded mb-2 cursor-pointer " +
                (t.id === threadId ? "bg-gray-200 font-semibold" : "hover:bg-gray-50")
              }
              onClick={() => handleSelectThread(t.id)}
            >
              <div className="text-sm">{t.title || "Untitled"}</div>
              <div className="text-xs text-gray-500">{t.updated_at ? new Date(t.updated_at).toLocaleString() : ""}</div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-4 flex flex-col">
        <div className="flex-1 overflow-auto mb-4">
          <div>
            {messages.map((m, idx) => (
              <div key={idx} className={"mb-3"}>
                <div className={"text-xs text-gray-500 mb-1"}>{m.role}</div>
                <div className="p-2 rounded" style={{ background: m.role === "user" ? "#e6f2ff" : "#f3f4f6" }}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t pt-3">
          <textarea
            className="w-full border rounded p-2 mb-2"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex justify-end">
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              onClick={handleSend}
              disabled={sending || !input.trim()}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  component: TutorThread,
});
