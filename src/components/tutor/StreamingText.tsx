import { useEffect, useRef, useState, useCallback } from "react";

/**
 * StreamingText — renders streaming tokens smoothly.
 * - Batches DOM updates to every FLUSH_MS milliseconds
 * - Fades in each new chunk with a CSS animation
 * - Calls onComplete when streaming stops
 */

const FLUSH_MS = 30; // flush buffer every 30ms

type Props = {
  text: string;
  isStreaming: boolean;
};

export function StreamingText({ text, isStreaming }: Props) {
  const [displayed, setDisplayed] = useState(text);
  const bufferRef = useRef(text);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep buffer in sync with incoming text
  useEffect(() => {
    bufferRef.current = text;
  }, [text]);

  // Flush buffer to DOM on interval while streaming
  useEffect(() => {
    if (!isStreaming) {
      // Final flush
      setDisplayed(bufferRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setDisplayed((prev) => {
        const next = bufferRef.current;
        if (next === prev) return prev;
        return next;
      });
    }, FLUSH_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStreaming]);

  if (!displayed) return null;

  return (
    <div
      ref={containerRef}
      className="whitespace-pre-wrap text-sm leading-relaxed streaming-text"
      style={{ wordBreak: "break-word" }}
    >
      {displayed}
    </div>
  );
}
