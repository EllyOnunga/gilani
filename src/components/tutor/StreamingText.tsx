import React, { useEffect, useState, useRef } from "react";

type Props = {
  text: string;
  isStreaming?: boolean;
  onComplete?: () => void;
};

export function StreamingText({ text, isStreaming = true, onComplete }: Props) {
  // Keep refs so the interval always reads the latest values without restarting
  const textRef = useRef(text);
  const isStreamingRef = useRef(isStreaming);
  const onCompleteRef = useRef(onComplete);

  const [displayedText, setDisplayedText] = useState("");
  const displayedRef = useRef("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep the refs in sync on every render
  textRef.current = text;
  isStreamingRef.current = isStreaming;
  onCompleteRef.current = onComplete;

  // Start the ticker once on mount; stop it on unmount
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const target = textRef.current;
      const current = displayedRef.current;
      const streaming = isStreamingRef.current;

      if (!target) return;

      // Already caught up
      if (current === target) {
        if (!streaming && onCompleteRef.current) {
          onCompleteRef.current();
        }
        return;
      }

      // If the text was replaced (edit/regenerate) or current is ahead, snap
      if (current.length > target.length || !target.startsWith(current)) {
        displayedRef.current = target;
        setDisplayedText(target);
        return;
      }

      const gap = target.length - current.length;

      let step = 1;
      if (!streaming) {
        // Stream completed: flush remaining text very fast (within 100-200ms)
        step = Math.max(20, Math.ceil(gap / 3));
      } else {
        // Adaptive step while streaming: catch up faster when far behind
        if (gap > 120) step = 16;
        else if (gap > 60) step = 8;
        else if (gap > 30) step = 4;
        else if (gap > 10) step = 2;
      }

      const next = target.substring(0, current.length + step);
      displayedRef.current = next;
      setDisplayedText(next);
    }, 16); // ~60fps tick (16ms) — ultra-smooth

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // lifetime ticker

  if (!displayedText) return null;

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ wordBreak: "break-word" }}>
      {displayedText}
      {isStreaming && (
        <span
          className="inline-block w-[2px] h-[1.1em] bg-primary opacity-90 ml-0.5 align-text-bottom rounded-full"
          style={{
            animation: "streaming-cursor-blink 0.65s infinite step-start",
          }}
        />
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes streaming-cursor-blink {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0; }
        }
      `}} />
    </div>
  );
}
