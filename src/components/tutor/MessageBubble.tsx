import React, { useEffect, useRef, useState } from "react";
import { Copy, RefreshCw, Check, ThumbsUp, ThumbsDown, Pencil, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { MarkdownRenderer } from "./MarkdownRenderer";
import { StreamingText } from "./StreamingText";

type Props = {
  message: any;
  idx: number;
  isLast: boolean;
  isPending: boolean;
  isRateLimited?: boolean;
  onReload: () => void;
  onEdit?: (messageId: string, newText: string) => void;
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

export const MessageBubble = React.memo(function MessageBubble({ message: m, idx, isLast, isPending, isRateLimited, onReload, onEdit, userId, initialVote, onVote}: Props) {
  const [copied, setCopied] = useState(false);
  // Initialise from the parent's pre-loaded bulk fetch; fall back to null
  const [vote, setVote] = useState<1 | -1 | null>(initialVote ?? null);
  const [voting, setVoting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
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
  const editRef = useRef<HTMLTextAreaElement>(null);

  const attachmentName = React.useMemo(() => {
    if (m.role !== "user") return null;
    // Check parts text first, then fall back to content field
    const partsText =
      m.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("") || "";
    const rawText = partsText || (m as any).content || "";
    const match = rawText.match(/\[Document Attached:\s*([^\]\n]+)\]/);
    return match ? match[1].trim() : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.id, m.role, (m.parts as any)?.[0]?.text, (m as any).content]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.id, m.role, (m.parts as any)?.[0]?.text, (m as any).content]);

  const isStreamActive = isPending && isLast;
  const visibleText = displayText;
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [streamReady, setStreamReady] = useState(false);

  useEffect(() => {
    if (!isStreamActive) setStreamReady(false);
  }, [isStreamActive]);

  useEffect(() => {
    if (isStreamActive && visibleText.length >= 20 && !streamReady) setStreamReady(true);
  }, [visibleText, isStreamActive, streamReady]);

  useEffect(() => {
    if (!isStreamActive && visibleText) {
      const t = setTimeout(() => setShowMarkdown(true), 150);
      return () => clearTimeout(t);
    } else {
      setShowMarkdown(false);
    }
  }, [isStreamActive]);

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

  const startEdit = () => {
    setEditText(displayText);
    setCollapsed(false);
    setEditing(true);
    setTimeout(() => { editRef.current?.focus(); editRef.current?.select(); }, 50);
  };

  const submitEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === displayText) { setEditing(false); return; }
    onEdit?.(m.id, trimmed);
    setEditing(false);
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
            ? "bg-card border border-border text-foreground rounded-tr-sm shadow-sm"
            : isStreamActive && !streamReady ? "text-foreground" : "bg-card border border-border text-foreground rounded-tl-sm shadow-sm"
        }`}
      >
        {!isUser ? (
          <div className="flex flex-col w-full">
            {streamReady || (!isStreamActive && visibleText) ? (
              <div className="prose-ai relative">
                {!showMarkdown ? (
                  <StreamingText text={visibleText} />
                ) : (
                  <div className="animate-in fade-in duration-500 fill-mode-both">
                    <MemoMarkdown content={displayText} />
                  </div>
                )}
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
            {editing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(); } if (e.key === "Escape") setEditing(false); }}
                  className="w-full rounded-xl bg-background border border-border text-foreground text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[72px] shadow-inner"
                  rows={3}
                />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => setEditing(false)}
                    className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-colors">
                    Cancel
                  </button>
                  <button onClick={submitEdit}
                    className="rounded-lg px-3 py-1.5 text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="whitespace-pre-wrap">
                  {collapsed && displayText.length > COLLAPSE_THRESHOLD
                    ? visibleText.slice(0, COLLAPSE_THRESHOLD) + "…"
                    : visibleText}
                </span>
                {displayText.length > COLLAPSE_THRESHOLD && (
                  <button
                    onClick={() => setCollapsed((p) => !p)}
                    className="self-start text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    {collapsed ? "Show more" : "Show less"}
                  </button>
                )}
              </div>
            )}

            {!editing && !isStreamActive && (
              <div className="flex items-center gap-1 mt-1.5 transition-opacity duration-200 justify-end border-t border-border/40 pt-1">
                <button onClick={handleCopy}
                  className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                  title="Copy">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {onEdit && (
                  <button onClick={isRateLimited ? undefined : startEdit}
                    disabled={isRateLimited}
                    className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider transition-colors px-2 py-1 rounded ${
                      isRateLimited
                        ? "opacity-40 cursor-not-allowed text-muted-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
  const getText = (m: any) =>
    m?.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("") || m?.content || "";
  if (prev.isPending || next.isPending) return false;
  return getText(prev.message) === getText(next.message) && prev.message?.id === next.message?.id;
}
);
