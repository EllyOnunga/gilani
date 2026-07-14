import React from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";

type Props = {
  content: string;
  isStreaming: boolean;
  className?: string;
};

/**
 * StreamingMarkdown renders markdown progressively during a live AI stream.
 * Passes `isStreaming` into MarkdownRenderer so incomplete LaTeX/mhchem
 * expressions are silenced (error colour = transparent) instead of showing
 * red error boxes while the model is still typing.
 */
export const StreamingMarkdown = React.memo(function StreamingMarkdown({
  content,
  isStreaming,
  className = "",
}: Props) {
  if (!content) return null;

  return (
    <div className={`markdown-content text-foreground ${className}`}>
      <MarkdownRenderer content={content} isStreaming={isStreaming} />
      {isStreaming && (
        <span
          className="inline-block w-[2px] h-[1.1em] bg-primary opacity-90 ml-0.5 align-text-bottom rounded-full"
          style={{ animation: "streaming-cursor-blink 0.65s infinite step-start" }}
        />
      )}
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes streaming-cursor-blink { 0%, 100% { opacity: 0.9; } 50% { opacity: 0; } }`,
        }}
      />
    </div>
  );
});
