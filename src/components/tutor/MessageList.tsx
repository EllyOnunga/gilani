import React, { useRef, useEffect, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { EmptyState } from "./EmptyState";
import { Loader2 } from "lucide-react";

type Props = {
  messages: any[];
  messagesLoading: boolean;
  messagesLoadError: string | null;
  isPending: boolean;
  onReload: () => void;
  onPromptClick: (prompt: string) => void;
  onEdit?: (messageId: string, newText: string) => void;
  userId?: string;
};

const THINKING_STEPS = [
  "Reading your question…",
  "Checking curriculum context…",
  "Retrieving your notes…",
  "Composing a response…",
];

function ThinkingBubble() {
  const [stepIdx, setStepIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setStepIdx((i) => (i + 1) % THINKING_STEPS.length);
        setFade(true);
      }, 250);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex justify-start items-end gap-2 animate-in-slide">
      <div className="flex-shrink-0 mb-1">
        <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="font-mono text-[8px] font-bold text-primary">G</span>
        </div>
      </div>
      <div className="max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-3 bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span
            className="font-mono text-[10px] text-muted-foreground transition-opacity duration-250"
            style={{ opacity: fade ? 1 : 0 }}
          >
            {THINKING_STEPS[stepIdx]}
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 bg-muted/60 rounded-full animate-pulse" style={{ width: "85%" }} />
          <div className="h-2 bg-muted/40 rounded-full animate-pulse" style={{ width: "65%", animationDelay: "200ms" }} />
          <div className="h-2 bg-muted/30 rounded-full animate-pulse" style={{ width: "45%", animationDelay: "400ms" }} />
        </div>
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  messagesLoading,
  messagesLoadError,
  isPending,
  onReload,
  onPromptClick,
  onEdit,
  userId,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || messages.length === 0) return;
    const threshold = 150;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    const lastMessage = messages[messages.length - 1];
    const justSent = lastMessage?.role === "user";
    if (isAtBottom || justSent) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isPending]);

  // Show ThinkingBubble when submitted but no assistant message yet streaming
  const showThinking =
    isPending && messages[messages.length - 1]?.role === "user";

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-5">
      {messagesLoading && (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Loading messages…</p>
        </div>
      )}

      {messagesLoadError && (
        <div className="mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          <p>{messagesLoadError}</p>
        </div>
      )}

      {!messagesLoading && !messagesLoadError && messages.length === 0 && (
        <EmptyState onPromptClick={onPromptClick} />
      )}

      {!messagesLoading &&
        !messagesLoadError &&
        messages.map((m, idx: number) => (
          <MessageBubble
            key={m.id ?? idx}
            message={m}
            idx={idx}
            isLast={idx === messages.length - 1}
            isPending={isPending}
            onReload={onReload}
            onEdit={onEdit}
            userId={userId}
          />
        ))}

      {showThinking && <ThinkingBubble />}

      <div ref={messagesEndRef} />
    </div>
  );
}
