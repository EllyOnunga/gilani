import React, { useEffect, useRef, useState } from "react";
import { Copy, RefreshCw, Check, ThumbsUp, ThumbsDown, Pencil, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { MarkdownRenderer } from "./MarkdownRenderer";

type Props = {
  message: any;
  idx: number;
  isLast: boolean;
  isPending: boolean;
  isRateLimited?: boolean;
  onReload: () => void;
  /** Called when user clicks Edit — passes the display text to the parent to load into ChatInput */
  onEditRequest?: (text: string) => void;
  /** Resolved user ID from the parent — avoids each bubble doing its own session fetch */
  userId?: string | null;
  /** Pre-loaded vote value from parent's bulk fetch — avoids N+1 queries */
  initialVote?: 1 | -1 | null;
  onVote?: (messageId: string, vote: 1 | -1 | null) => void;
};



const MemoMarkdown = React.memo(
  ({ content }: { content: string }) => <MarkdownRenderer content={content} />,
  (prev, next) => prev.content === next.content
);

export const MessageBubble = React.memo(function MessageBubble({ message: m, idx, isLast, isPending, isRateLimited, onReload, onEditRequest, userId, initialVote, onVote}: Props) {
  const [copied, setCopied] = useState(false);
  // Initialise from the parent's pre-loaded bulk fetch; fall back to null
  const [vote, setVote] = useState<1 | -1 | null>(initialVote ?? null);
  const [voting, setVoting] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  // Sync if parent re-delivers a different initialVote (e.g. after bulk reload)
  const prevInitialVoteRef = useRef(initialVote);
  useEffect(() => {
    if (prevInitialVoteRef.current !== initialVote) {
      prevInitialVoteRef.current = initialVote;
      setVote(initialVote ?? null);
    }
  }, [initialVote]);

  const COLLAPSE_THRESHOLD = 300;

  const attachmentName = React.useMemo(() => {
    if (m.role !== "user") return null;
    // Check parts text first, then fall back to content field
    const partsText =
      m.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("") || "";
    const rawText = partsText || (m as any).content || "";
    const match = rawText.match(/\[Document Attached:\s*([^\]\n]+)\]/);
    return match ? match[1].trim() : null;
  }, [m.id, m.role, m.parts, (m as any).content]);

  const displayText = React.useMemo(() => {
    const partsText =
      m.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("") || "";
    const rawText = partsText || (m as any).content || "";
    return m.role === "user"
      ? rawText
          // Strip document content block (with or without trailing newlines)
          .replace(/<DocumentContent[^>]*>[\s\S]*?<\/DocumentContent>\n*/g, "")
          // Strip attachment marker line (relax the \n\n requirement)
          .replace(/\[Document Attached:[^\]]+\]\n*/g, "")
          // Strip the "Student Query:" prefix wrapper
          .replace(/^Student Query:\s*(\(See attached document\))?\s*/m, "")
          .trim()
      : rawText;
  }, [m.id, m.role, m.parts, (m as any).content]);

  const isStreamActive = isPending && isLast;
  const visibleText = displayText;
  const showBubbleCard = visibleText.length > 0;

  // Show thinking until we have enough text to stream smoothly


  // NOTE: Individual vote loading removed — votes are now loaded in bulk at the
  // page level and passed down via the `initialVote` prop, eliminating N+1 queries.

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast.success("Copied!");
  };

  const handleVote = async (v: 1 | -1) => {
    const isValidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id || "");
    if (!userId || !m.id || !isValidId || voting) return;
    const newVote = vote === v ? null : v;
    // Optimistic update — update UI immediately
    const previousVote = vote;
    setVote(newVote);
    onVote?.(m.id, newVote);
    if (newVote !== null) {
      toast.success(newVote === 1 ? "Thanks for the feedback! 👍" : "Noted — we'll improve. 👎");
    }
    setVoting(true);
    try {
      if (newVote === null) {
        await supabase.from("message_feedback").delete()
          .eq("message_id", m.id).eq("user_id", userId);
      } else {
        await supabase.from("message_feedback").upsert(
          { message_id: m.id, user_id: userId, vote: newVote },
          { onConflict: "message_id,user_id" }
        );
      }
    } catch {
      // Revert on failure
      setVote(previousVote);
      onVote?.(m.id, previousVote);
      toast.error("Failed to save feedback");
    } finally {
      setVoting(false);
    }
  };

  const isUser = m.role === "user";

  return (
    <div
      className="flex relative group"
      style={{ justifyContent: isUser ? "flex-end" : "flex-start" }}
    >


      <div
        className={`${m.role === "user" ? "max-w-[88%] sm:max-w-[72%]" : "w-full max-w-[96%] sm:max-w-full"} rounded-2xl px-4 py-3 text-sm leading-relaxed relative transition-all duration-200 ${
          isUser
            ? "bg-primary/8 border border-primary/20 rounded-tr-sm shadow-sm"
            : isStreamActive && !showBubbleCard ? "opacity-0 pointer-events-none" : "bg-card border border-border text-foreground rounded-tl-sm shadow-sm"
        }`}
      >
        {!isUser ? (
          <div className="flex flex-col w-full">
            {visibleText ? (
              <div className="prose-ai relative">
                <div className="animate-in fade-in duration-300 fill-mode-both">
                  <MemoMarkdown content={isStreamActive ? visibleText + " ▋" : visibleText} />
                </div>
              </div>
            ) : (
              !isStreamActive ? (
                <span className="text-xs text-muted-foreground italic mt-1">
                  No response generated. Please resend your question.
                </span>
              ) : null
            )}

            {visibleText && !isStreamActive && (
              <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-border/40 transition-opacity duration-200">
                {/* Copy */}
                <button onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded hover:bg-muted"
                  title="Copy">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {/* Retry */}
                {isLast && (
                  <button onClick={isRateLimited ? undefined : onReload}
                    disabled={isRateLimited}
                    className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors px-2.5 py-1.5 rounded ${
                      isRateLimited
                        ? "opacity-40 cursor-not-allowed text-muted-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title={isRateLimited ? "Rate limit reached" : "Retry"}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
                {/* Divider */}
                <span className="w-px h-3 bg-border/60 mx-0.5" />
                {/* Thumbs up */}
                <button onClick={() => handleVote(1)} disabled={voting}
                  className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors px-2 py-1 rounded hover:bg-muted ${vote === 1 ? "text-green-500" : "text-muted-foreground hover:text-green-500"}`}
                  title="Good response">
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                {/* Thumbs down */}
                <button onClick={() => handleVote(-1)} disabled={voting}
                  className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors px-2 py-1 rounded hover:bg-muted ${vote === -1 ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
                  title="Bad response">
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* User message */
          <div className="flex flex-col gap-1.5">
            {attachmentName && (
              <div className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary w-fit max-w-full select-none">
                <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{attachmentName}</span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="whitespace-pre-wrap text-primary font-medium">
                {collapsed && displayText.length > COLLAPSE_THRESHOLD
                  ? visibleText.slice(0, COLLAPSE_THRESHOLD) + "…"
                  : visibleText}
              </span>
              {displayText.length > COLLAPSE_THRESHOLD && (
                <button
                  onClick={() => setCollapsed((p) => !p)}
                  className="self-start text-[10px] font-bold text-primary/60 hover:text-primary underline underline-offset-2 transition-colors"
                >
                  {collapsed ? "Show more" : "Show less"}
                </button>
              )}
            </div>

            {!isStreamActive && (
              <div className="flex items-center gap-1 mt-1.5 transition-opacity duration-200 justify-end border-t border-primary/20 pt-1">
                <button onClick={handleCopy}
                  className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider text-primary/50 hover:text-primary transition-colors px-2 py-1 rounded hover:bg-primary/10"
                  title="Copy">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {onEditRequest && (
                  <button
                    onClick={isRateLimited ? undefined : () => onEditRequest(displayText)}
                    disabled={isRateLimited}
                    className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider transition-colors px-2 py-1 rounded ${
                      isRateLimited
                        ? "opacity-40 cursor-not-allowed text-primary/30"
                        : "text-primary/50 hover:text-primary hover:bg-primary/10"
                    }`}
                    title={isRateLimited ? "Rate limit reached" : "Edit message"}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className={`absolute -bottom-6 ${isUser ? "right-2" : "left-8"} opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[9px] text-muted-foreground font-mono bg-background border border-border/60 px-1.5 py-0.5 rounded shadow-sm pointer-events-none z-10`}>
        {(m as any).createdAt
          ? new Date((m as any).createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "Just now"}
      </div>
    </div>
  );
}, (prev, next) => {
  // Only re-render if this bubble's content or streaming-relevant props changed
  if (prev.isPending !== next.isPending) return false;
  if (prev.isLast !== next.isLast) return false;
  if (prev.isRateLimited !== next.isRateLimited) return false;
  if (prev.onEditRequest !== next.onEditRequest) return false;
  if (prev.initialVote !== next.initialVote) return false;
  const getText = (m: any) =>
    m?.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("") || m?.content || "";
  if (prev.isPending || next.isPending) return false;
  return getText(prev.message) === getText(next.message) && prev.message?.id === next.message?.id;
}
);
