import React, { useEffect, useRef, useState } from "react";

interface ThinkingIndicatorProps {
  isPending: boolean;
  isLastMessage: boolean;
  messageText: string;
}

const STALL_DELAY_MS = 1500;

export function ThinkingIndicator({ isPending, isLastMessage, messageText }: ThinkingIndicatorProps) {
  const [stalled, setStalled] = useState(messageText.trim() === "");
  const lastTextRef = useRef(messageText);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isPending || !isLastMessage) {
      setStalled(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (messageText !== lastTextRef.current) {
      // New text arrived — hide indicator, restart stall timer
      lastTextRef.current = messageText;
      setStalled(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setStalled(true), STALL_DELAY_MS);
    } else if (timerRef.current === null) {
      // Initial mount with pending — start timer immediately
      timerRef.current = setTimeout(() => setStalled(true), STALL_DELAY_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [messageText, isPending, isLastMessage]);

  const show = isPending && isLastMessage && (messageText.trim() === "" || stalled);
  if (!show) return null;

  return (
    <div className="flex items-center gap-2 mb-2 animate-in fade-in duration-300">
      <div className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
        <span className="absolute inline-flex h-full w-full rounded-full bg-primary/30 animate-ping" />
        <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-serif text-xs font-bold">
          G
        </span>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        Thinking
        <span className="inline-flex w-4 justify-start">
          <span className="animate-pulse">...</span>
        </span>
      </span>
    </div>
  );
}
