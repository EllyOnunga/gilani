import React from "react";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ThoughtAccordion } from "./ThoughtAccordion";

type Props = {
  message: any;
  idx: number;
  isLast: boolean;
  isPending: boolean;
  onReload: () => void;
};

export function MessageBubble({ message: m, idx, isLast, isPending, onReload }: Props) {
  const partsText =
    m.parts
      ?.filter((p: any) => p.type === "text")
      .map((p: any) => p.text || "")
      .join("") || "";

  const displayText = partsText || (m as any).content || "";
  const isStreamActive = isPending;

  return (
    <div
      className="flex relative group"
      style={{ justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative ${
          m.role === "user"
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border text-foreground rounded-tl-sm"
        }`}
      >
        {m.role === "assistant" ? (
          <div className="flex flex-col w-full">
            <ThoughtAccordion
              messageId={m.id || String(idx)}
              isLastMessage={isLast}
              isStreaming={isStreamActive}
              messageText={displayText}
            />
            {displayText ? (
              <div className="mt-1 prose-ai relative">
                <MarkdownRenderer content={displayText} />
                {isLast && isStreamActive && (
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary/70 animate-cursor-blink align-middle" />
                )}
              </div>
            ) : isLast && isStreamActive ? null : (
              <span className="text-xs text-muted-foreground italic mt-1">
                No response generated. Please resend your question.
              </span>
            )}

            {/* Action bar */}
            {displayText && !isStreamActive && (
              <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(displayText);
                    toast.success("Copied to clipboard!");
                  }}
                  className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                  title="Copy answer"
                >
                  <Copy className="h-3 w-3" />
                </button>
                {isLast && (
                  <button
                    onClick={onReload}
                    className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                    title="Regenerate this response"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="whitespace-pre-wrap">{displayText}</span>
        )}
      </div>

      {/* Timestamp tooltip */}
      <div
        className={`absolute -bottom-5 ${
          m.role === "user" ? "right-2" : "left-2"
        } opacity-0 group-hover:opacity-100 transition-opacity duration-250 text-[9px] text-muted-foreground font-mono bg-background border border-border/60 px-1.5 py-0.5 rounded shadow-sm pointer-events-none z-10`}
      >
        {(m as any).createdAt
          ? new Date((m as any).createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Just now"}
      </div>
    </div>
  );
}