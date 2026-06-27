import { useState, useEffect, useRef } from "react";
import { MarkdownRenderer } from "@/components/tutor/MarkdownRenderer";

interface SmoothMarkdownRendererProps {
  content: string;
  isStreaming: boolean; // Tells us if the AI is actively typing
  className?: string;
}

export function SmoothMarkdownRenderer({
  content,
  isStreaming,
  className,
}: SmoothMarkdownRendererProps) {
  // 1. INSTANT RENDER FOR SAVED/COMPLETED MESSAGES
  // If the message is loaded from the DB or streaming has finished,
  // bypass all buffering and render the full markdown instantly.
  if (!isStreaming) {
    return <MarkdownRenderer content={content} className={className} />;
  }

  // 2. SMOOTH BUFFERED RENDER FOR ACTIVE STREAMING
  // For actively streaming messages, we buffer the content to create a smooth,
  // gradual reveal effect. This prevents the text from appearing too fast/janky
  // while preserving all whitespace so Markdown parses correctly.
  const [bufferedContent, setBufferedContent] = useState("");
  const targetContentRef = useRef(content);

  useEffect(() => {
    targetContentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (!isStreaming) {
      setBufferedContent(content);
      return;
    }

    // Reveal characters gradually
    const interval = setInterval(() => {
      setBufferedContent((prev) => {
        const target = targetContentRef.current;
        if (prev.length >= target.length) return prev;

        // Calculate how many characters to reveal per tick.
        // If we fall behind, we reveal more to catch up smoothly.
        const diff = target.length - prev.length;
        const step = Math.max(1, Math.ceil(diff / 35));

        return target.slice(0, prev.length + step);
      });
    }, 30); // Update every from 2, 15, 25 to 30ms for a smooth visual pace

    return () => clearInterval(interval);
  }, [isStreaming]);

  return <MarkdownRenderer content={bufferedContent} className={className} />;
}
