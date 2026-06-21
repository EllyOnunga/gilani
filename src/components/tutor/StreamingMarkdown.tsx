import React from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";

type Props = { content: string; isStreaming: boolean };

export const StreamingMarkdown = React.memo(function StreamingMarkdown({
  content,
  isStreaming,
}: Props) {
  if (isStreaming) {
    return (
      <span className="whitespace-pre-wrap text-sm leading-relaxed">
        {content}
        <span
          className="inline-block w-[2px] h-[1.1em] bg-primary opacity-90 ml-0.5 align-text-bottom rounded-full"
          style={{ animation: "streaming-cursor-blink 0.65s infinite step-start" }}
        />
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes streaming-cursor-blink {
            0%, 100% { opacity: 0.9; }
            50% { opacity: 0; }
          }
        `}} />
      </span>
    );
  }
  if (!content) return null;

  // Fast, immediate fade — no setTimeout delay before this mounts, so the
  // handoff from the raw streaming <span> feels instant rather than leaving
  // a perceptible gap before content appears.
  return (
    <div className="animate-in fade-in duration-150">
      <MarkdownRenderer content={content} />
    </div>
  );
});
