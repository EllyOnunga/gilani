import React, { useEffect, useRef, useState } from "react";
import { Copy, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import { ThoughtAccordion } from "./ThoughtAccordion";

const LazyMarkdownRenderer = React.lazy(() =>
  import("./MarkdownRenderer").then((m) => ({ default: m.MarkdownRenderer })),
);

type Props = {
  message: any;
  idx: number;
  isLast: boolean;
  isPending: boolean;
  onReload: () => void;
};

// Tracks how many chars have been "revealed" for the fade-in effect
function useStreamReveal(text: string, isStreaming: boolean) {
  const [revealed, setRevealed] = useState(text.length);
  const prevTextRef = useRef(text);

  useEffect(() => {
    if (!isStreaming) {
      setRevealed(text.length);
      return;
    }
    const newChars = text.length - prevTextRef.current.length;
    if (newChars > 0) {
      // Each chunk reveals instantly but we track the boundary for cursor
      setRevealed(text.length);
      prevTextRef.current = text;
    }
  }, [text, isStreaming]);

  return revealed;
}

export function MessageBubble({ message: m, idx, isLast, isPending, onReload }: Props) {
  const [copied, setCopied] = useState(false);

  const partsText =
    m.parts
      ?.filter((p: any) => p.type === "text")
      .map((p: any) => p.text || "")
      .join("") || "";

  const rawText = partsText || (m as any).content || "";
  const displayText =
    m.role === "user"
      ? rawText
          .replace(/<DocumentContent[^>]*>[\s\S]*?<\/DocumentContent>\n\n/g, "")
          .replace(/\[Document Attached: [^\]]+\]\n\n/g, "")
          .replace(/Student Query: (\(See attached document\))?/g, "")
          .trim()
      : rawText;

  const isStreamActive = isPending && isLast;
  useStreamReveal(displayText, isStreamActive);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast.success("Copied!");
  };

  return (
    <div
      className="flex relative group"
      style={{ justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
    >
      {/* Avatar dot for assistant */}
      {m.role === "assistant" && (
        <div className="flex-shrink-0 mt-1 mr-2">
          <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="font-mono text-[8px] font-bold text-primary">G</span>
          </div>
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative transition-all duration-200 ${
          m.role === "user"
            ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
            : "bg-card border border-border text-foreground rounded-tl-sm shadow-sm"
        }`}
      >
        {m.role === "assistant" ? (
          <div className="flex flex-col w-full">
            <ThoughtAccordion
              messageId={m.id || String(idx)}
              isLastMessage={isLast}
              isStreaming={isPending}
              messageText={displayText}
            />
            {displayText ? (
              <div className={`prose-ai relative ${isStreamActive ? "streaming-content" : ""}`}>
                <React.Suspense fallback={<div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-3 bg-muted/50 rounded animate-pulse" style={{ width: `${85 - i * 15}%` }} />
                  ))}
                </div>}>
                  <LazyMarkdownRenderer content={displayText} />
                </React.Suspense>
                {isStreamActive && (
                  <span className="inline-block w-[2px] h-[1em] ml-0.5 bg-primary align-middle"
                    style={{ animation: "cursor-blink 0.7s step-end infinite" }} />
                )}
              </div>
            ) : isStreamActive ? null : (
              <span className="text-xs text-muted-foreground italic mt-1">
                No response generated. Please resend your question.
              </span>
            )}

            {displayText && !isStreamActive && (
              <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                  title="Copy answer"
                >
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </button>
                {isLast && (
                  <button
                    onClick={onReload}
                    className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                    title="Regenerate"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
                <span className="ml-auto font-mono text-[8px] text-muted-foreground/50">GilaniAI</span>
              </div>
            )}
          </div>
        ) : (
          <span className="whitespace-pre-wrap">{displayText}</span>
        )}
      </div>

      {/* Timestamp */}
      <div
        className={`absolute -bottom-5 ${
          m.role === "user" ? "right-2" : "left-8"
        } opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[9px] text-muted-foreground font-mono bg-background border border-border/60 px-1.5 py-0.5 rounded shadow-sm pointer-events-none z-10`}
      >
        {(m as any).createdAt
          ? new Date((m as any).createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "Just now"}
      </div>
    </div>
  );
}
