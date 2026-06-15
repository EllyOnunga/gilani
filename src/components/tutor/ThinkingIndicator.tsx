import React, { useEffect, useRef, useState } from "react";

interface ThinkingIndicatorProps {
  isPending: boolean;
  isLastMessage: boolean;
  messageText: string;
}

const STALL_DELAY_MS = 1000;

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
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary/70"
            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        {stalled && messageText ? "Still thinking…" : "Thinking…"}
      </span>
    </div>
  );
}
