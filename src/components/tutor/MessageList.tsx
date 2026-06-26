import React, { useRef, useEffect, useCallback, useMemo } from "react";
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
  onDelete?: (messageId: string) => void;
  userId?: string | null;
  userVotes?: Record<string, 1 | -1>;
  onVote?: (messageId: string, vote: 1 | -1 | null) => void;
  onExportPDF?: () => void;
  onExportWord?: () => void;
  onEscalate?: () => void;
  escalationStatus?: "open" | "in_review" | "resolved" | null;
  escalating?: boolean;
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
  onDelete,
  userId,
  userVotes,
  onVote,
  onExportPDF,
  onExportWord,
  onEscalate,
  escalationStatus,
  escalating,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(true);
  const lastMessageCountRef = useRef(0);

  // Memoize the "should show thinking" logic
  const showThinking = useMemo(() => {
    if (!isPending) return false;
    const last = messages[messages.length - 1];
    if (!last) return true;
    if (last.role === "user") return true;
    const text =
      last.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("") ||
      last.content ||
      "";
    return text.trim().length === 0;
  }, [isPending, messages]);

  // Smart scroll: only auto-scroll if user is near bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if user is near the bottom (within 200px)
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const shouldScroll = distanceFromBottom < 200 || isAutoScrollingRef.current;

    if (shouldScroll) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    }
  }, []);

  // Scroll on new messages (not during streaming)
  useEffect(() => {
    if (isPending) return;
    if (messages.length === 0) return;

    const messageCountChanged = messages.length !== lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;

    if (messageCountChanged) {
      scrollToBottom("smooth");
    }
  }, [messages.length, scrollToBottom, isPending]);

  // Jump to bottom instantly when messages finish loading
  useEffect(() => {
    if (messagesLoading || messages.length === 0) return;

    // Use double rAF to ensure layout is painted
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom("instant");
        isAutoScrollingRef.current = true;
      });
    });
  }, [messagesLoading, scrollToBottom]);

  // Auto-scroll during streaming with ResizeObserver
  useEffect(() => {
    const container = scrollContainerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    let lastHeight = inner.scrollHeight;
    let rafId: number;

    const handleResize = () => {
      const newHeight = inner.scrollHeight;

      if (newHeight > lastHeight) {
        // Check if user is near bottom
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

        if (distanceFromBottom < 200) {
          // Use rAF for smooth scrolling during streaming
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
          });
        }

        lastHeight = newHeight;
      }
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(inner);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Detect when user manually scrolls up (disable auto-scroll)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      isAutoScrollingRef.current = distanceFromBottom < 100;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
      className={`flex-1 min-h-0 overflow-y-auto px-2 py-2 sm:px-5 sm:py-5 ${isRateLimited ? "pb-80" : "pb-56"
        }`}
      style={{ scrollBehavior: "smooth" }}
    >
      <div ref={innerRef} className="space-y-3 flex flex-col pb-4">
        {/* Loading state */}
        {messagesLoading && (
          <div
            className="flex flex-col items-center justify-center h-full gap-3"
            role="status"
            aria-label="Loading messages"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Loading messages…
            </p>
          </div>
        )}

        {/* Error state */}
        {messagesLoadError && (
          <div
            className="mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive"
            role="alert"
          >
            <p>{messagesLoadError}</p>
          </div>
        )}

        {/* Empty state */}
        {!messagesLoading && !messagesLoadError && messages.length === 0 && (
          <EmptyState onPromptClick={onPromptClick} />
        )}

        {/* Messages */}
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
              onDelete={onDelete}
              userId={userId}
              initialVote={userVotes?.[m.id] ?? null}
              onVote={onVote}
              onExportPDF={onExportPDF}
              onExportWord={onExportWord}
              onEscalate={onEscalate}
              escalationStatus={escalationStatus}
              escalating={escalating}
              messagesLoading={messagesLoading}
            />
          ))}

        {/* Thinking indicator — shimmer skeleton, matches assistant bubble layout */}
        {showThinking && (
          <div
            className="w-full max-w-[96%] sm:max-w-full animate-in fade-in duration-500"
            role="status"
            aria-label="AI is thinking"
          >
            <div className="flex flex-col gap-2.5 px-1 py-3">
              {["w-[72%]", "w-[88%]", "w-[55%]"].map((width, i) => (
                <div
                  key={i}
                  className={`h-3 rounded-full bg-muted animate-pulse ${width}`}
                  style={{ animationDelay: `${i * 120}ms` }}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>
    </div>
  );
});