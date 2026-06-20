import React, { useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { EmptyState } from "./EmptyState";
import { Loader2 } from "lucide-react";

type Props = {
  messages: any[];
  messagesLoading: boolean;
  messagesLoadError: string | null;
  isPending: boolean;
  isRateLimited?: boolean;
  onReload: () => void;
  onPromptClick: (prompt: string) => void;
  onEditRequest?: (text: string) => void;
  /** Resolved user ID passed from page level — avoids each bubble resolving its own session */
  userId?: string | null;
  /** Map of messageId → vote, bulk-loaded at page level to eliminate N+1 queries */
  userVotes?: Record<string, 1 | -1>;
  onVote?: (messageId: string, vote: 1 | -1 | null) => void;
};

export const MessageList = React.memo(function MessageList({
  messages,
  messagesLoading,
  messagesLoadError,
  isPending,
  isRateLimited,
  onReload,
  onPromptClick,
  onEditRequest,
  userId,
  userVotes,
  onVote,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll on new messages (not during streaming)
  useEffect(() => {
    if (isPending) return;
    const container = scrollContainerRef.current;
    if (!container || messages.length === 0) return;
    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
    const lastMessage = messages[messages.length - 1];
    if (remaining < 150 || lastMessage?.role === "user") {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // Jump to bottom instantly once messages finish loading for this thread
  useEffect(() => {
    if (messagesLoading || messages.length === 0) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    // Double rAF ensures layout has painted the newly rendered messages
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    });
  }, [messagesLoading]);

  // During streaming: continuously scroll to bottom
  useEffect(() => {
    if (!isPending) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const id = setInterval(() => {
      container.scrollTop = container.scrollHeight;
    }, 50);
    return () => clearInterval(id);
  }, [isPending]);

  return (
    <div ref={scrollContainerRef} className={`flex-1 min-h-0 overflow-y-auto px-2 py-2 sm:pb-5 sm:px-5 sm:py-5 space-y-3 ${isRateLimited ? "pb-80" : "pb-56"}`}>
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
            isPending={isPending && idx === messages.length - 1}
            isRateLimited={isRateLimited}
            onReload={onReload}
            onEditRequest={onEditRequest}
            userId={userId}
            initialVote={userVotes?.[m.id] ?? null}
            onVote={onVote}
          />
        ))}

      {isPending && messages[messages.length - 1]?.role === "user" && (
        <div className="flex items-center gap-1.5 py-2 px-1 animate-in fade-in duration-300">
          <span className="text-sm text-primary font-medium">Thinking</span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block w-1.5 h-1.5 rounded-full bg-primary"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
});
