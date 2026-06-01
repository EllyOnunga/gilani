import React, { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { EmptyState } from "./EmptyState";

type Props = {
  messages: any[];
  messagesLoading: boolean;
  messagesLoadError: string | null;
  isPending: boolean;
  onReload: () => void;
  onPromptClick: (prompt: string) => void;
};

export function MessageList({
  messages,
  messagesLoading,
  messagesLoadError,
  isPending,
  onReload,
  onPromptClick,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll
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
  }, [messages]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4"
    >
      {/* Loading state */}
      {messagesLoading && (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading messages…</p>
        </div>
      )}

      {/* Error state */}
      {messagesLoadError && (
        <div className="mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          <p>{messagesLoadError}</p>
        </div>
      )}

      {/* Empty state */}
      {!messagesLoading && !messagesLoadError && messages.length === 0 && (
        <EmptyState onPromptClick={onPromptClick} />
      )}

      {/* Message bubbles */}
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
          />
        ))}

      {/* Thinking bubble */}
      {isPending && messages[messages.length - 1]?.role === "user" && (
        <div className="flex justify-start animate-in-slide">
          <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-card border border-border text-foreground rounded-tl-sm w-full animate-pulse">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-medium">
                GilaniAI is thinking…
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}