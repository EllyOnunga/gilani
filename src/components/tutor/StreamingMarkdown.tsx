import React from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";

type Props = {
  content: string;
  isStreaming: boolean;
  className?: string;
};

export const StreamingMarkdown = React.memo(function StreamingMarkdown({
  content,
  isStreaming,
  className = "",
}: Props) {
  if (!content) return null;

  // During streaming, show raw text with cursor for better perceived performance
  // Once streaming ends, apply full preprocessing and render formatted markdown
  if (isStreaming) {
    return (
      <div className={`relative ${className}`}>
        <span className="whitespace-pre-wrap text-sm leading-relaxed">
          {content}
          <span
            className="inline-block w-[2px] h-[1.1em] bg-primary opacity-90 ml-0.5 align-text-bottom rounded-full"
            style={{ animation: "streaming-cursor-blink 0.65s infinite step-start" }}
          />
        </span>
        <style dangerouslySetInnerHTML={{
          __html: `@keyframes streaming-cursor-blink { 0%, 100% { opacity: 0.9; } 50% { opacity: 0; } }`
        }} />
      </div>
    );
  }

  // Only render fully processed markdown when streaming is COMPLETE
  return (
    <div className={`markdown-content text-foreground ${className} animate-in fade-in duration-150`}>
      <MarkdownRenderer content={content} />
    </div>
  );
});