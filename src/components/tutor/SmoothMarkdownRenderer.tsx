import { useState, useEffect, useRef } from "react";
import { MarkdownRenderer } from "@/components/tutor/MarkdownRenderer";

interface SmoothMarkdownRendererProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

export function SmoothMarkdownRenderer({
  content,
  isStreaming,
  className,
}: SmoothMarkdownRendererProps) {
  // If not streaming at mount time (i.e. this is a historical/saved message),
  // start fully revealed so we NEVER play the typewriter animation for old messages.
  const [displayedLength, setDisplayedLength] = useState(() => (isStreaming ? 0 : content.length));
  // Track whether we've finished the typewriter animation
  const [animationDone, setAnimationDone] = useState(() => !isStreaming);

  const targetRef = useRef(content);
  const isStreamingRef = useRef(isStreaming);

  // Keep refs current every render without triggering effects
  useEffect(() => {
    targetRef.current = content;
    isStreamingRef.current = isStreaming;
  });

  // Single stable typewriter interval — created once, runs for the life of the component
  useEffect(() => {
    const interval = setInterval(() => {
      const target = targetRef.current;
      const streaming = isStreamingRef.current;

      setDisplayedLength((prev) => {
        if (prev >= target.length) {
          // Caught up — if streaming has also ended, mark animation as done
          if (!streaming) setAnimationDone(true);
          return prev;
        }

        // Typewriter pacing:
        // - Normal: 3–4 chars per tick (feels like typing)
        // - Catching up (stream ended, we're behind): faster to avoid a long wait
        // - Very far behind: accelerate further so we don't lag forever
        const diff = target.length - prev;
        let step: number;
        if (!streaming) {
          // Stream ended — catch up quickly but not instantly (no dump)
          step = diff > 300 ? Math.ceil(diff / 8) : diff > 80 ? 12 : 5;
        } else {
          // Still streaming — gentle typewriter feel
          step = diff > 500 ? Math.ceil(diff / 40) : diff > 100 ? 5 : 3;
        }

        const next = Math.min(target.length, prev + step);
        if (next === target.length && !streaming) setAnimationDone(true);
        return next;
      });
    }, 22); // ~45 ticks/sec

    return () => clearInterval(interval);
  }, []);

  // Reset when a new streaming session begins (content resets to empty)
  useEffect(() => {
    if (isStreaming && content.length === 0) {
      setDisplayedLength(0);
      setAnimationDone(false);
    }
  }, [isStreaming, content.length]);

  // If not streaming and already caught up, keep in sync with any content growth
  // (e.g. if parent updates content after initial render without streaming).
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedLength(content.length);
      setAnimationDone(true);
    }
  }, [isStreaming, content]);

  // Once animation finishes and streaming is done, switch to static render
  if (animationDone && !isStreaming) {
    return <MarkdownRenderer content={content} isStreaming={false} className={className} />;
  }

  // During streaming or finishing animation — render the buffered slice
  return (
    <MarkdownRenderer
      content={content.slice(0, displayedLength)}
      isStreaming={!animationDone}
      className={className}
    />
  );
}
