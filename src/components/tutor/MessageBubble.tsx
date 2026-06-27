import React, { useEffect, useRef, useState, useMemo, memo } from "react";
import { Copy, RefreshCw, Check, ThumbsUp, ThumbsDown, Pencil, FileText, Trash2, Download, ShieldAlert, Timer, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SmoothMarkdownRenderer } from "@/components/tutor/SmoothMarkdownRenderer";
import { PomodoroTimer } from "@/components/tutor/PomodoroTimer";

type Props = {
  message: any;
  idx: number;
  isLast: boolean;
  isPending: boolean;
  isRateLimited?: boolean;
  onReload: () => void;
  onEditRequest?: (text: string) => void;
  userId?: string | null;
  initialVote?: 1 | -1 | null;
  onVote?: (messageId: string, vote: 1 | -1 | null) => void;
  onDelete?: (messageId: string) => void;
  // Session action props (only shown on last assistant bubble)
  onExportPDF?: () => void;

  onEscalate?: () => void;
  escalationStatus?: "open" | "in_review" | "resolved" | null;
  escalating?: boolean;
  messagesLoading?: boolean;
};

// Memoize the entire component to prevent unnecessary re-renders
export const MessageBubble = memo(function MessageBubble({
  message: m,
  idx,
  isLast,
  isPending,
  isRateLimited,
  onReload,
  onEditRequest,
  userId,
  initialVote,
  onVote,
  onDelete,
  onExportPDF,
  onEscalate,
  escalationStatus,
  escalating,
  messagesLoading,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [vote, setVote] = useState<1 | -1 | null>(initialVote ?? null);
  const [voting, setVoting] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const prevInitialVoteRef = useRef(initialVote);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync vote state when parent updates
  useEffect(() => {
    if (prevInitialVoteRef.current !== initialVote) {
      prevInitialVoteRef.current = initialVote;
      setVote(initialVote ?? null);
    }
  }, [initialVote]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const COLLAPSE_THRESHOLD = 300;

  // Memoize expensive computations
  const attachmentName = useMemo(() => {
    if (m.role !== "user") return null;
    const partsText =
      m.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("") || "";
    const rawText = partsText || m.content || "";
    const match = rawText.match(/\[Document Attached:\s*([^\]\n]+)\]/);
    return match ? match[1].trim() : null;
  }, [m.id, m.role, m.parts, m.content]);

  const displayText = useMemo(() => {
    const partsText =
      m.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("") || "";
    const rawText = partsText || m.content || "";
    return m.role === "user"
      ? rawText
        .replace(/<DocumentContent[^>]*>[\s\S]*?<\/DocumentContent>\n*/g, "")
        .replace(/\[Document Attached:[^\]]+\]\n*/g, "")
        .replace(/^Student Query:\s*(\(See attached document\))?\s*/m, "")
        .trim()
      : rawText;
  }, [m.id, m.role, m.parts, m.content]);

  const isStreamActive = isPending && isLast;
  const showBubbleCard = displayText.length > 0;
  const isUser = m.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    toast.success("Copied!");

    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 1800);
  };

  const handleVote = async (v: 1 | -1) => {
    const isValidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id || "");
    if (!userId || !m.id || !isValidId || voting) return;

    const newVote = vote === v ? null : v;
    const previousVote = vote;

    // Optimistic update
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

  return (
    <div
      className="flex relative group"
      style={{ justifyContent: isUser ? "flex-end" : "flex-start" }}
    >
      <div
        className={`${isUser ? "max-w-[88%] sm:max-w-[72%]" : "w-full max-w-[96%] sm:max-w-full"
          } px-4 py-3 text-sm leading-relaxed relative transition-all duration-200 ${isUser
            ? "bg-card border border-border text-foreground rounded-2xl rounded-tr-sm shadow-sm"
            : isStreamActive && !showBubbleCard
              ? "opacity-0 pointer-events-none"
              : "bg-transparent text-foreground"
          }`}
      >
        {!isUser ? (
          <>
            <div className="flex flex-col w-full">
              {showBubbleCard ? (
                <div className="prose-ai relative">
                  {/* Use SmoothMarkdownRenderer for word-by-word streaming */}
                  <SmoothMarkdownRenderer
                    content={displayText}
                    isStreaming={isStreamActive}
                    className={
                      isStreamActive
                        ? "transition-opacity duration-200 streaming-cursor"
                        : "transition-opacity duration-200"
                    }
                  />
                </div>
              ) : (
                !isStreamActive && (
                  <span className="text-xs text-muted-foreground italic mt-1">
                    No response generated. Please resend your question.
                  </span>
                )
              )}

              {showBubbleCard && !isStreamActive && (
                <div className="flex items-center gap-1 mt-2 transition-opacity duration-200">
                  {/* Copy */}
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded hover:bg-muted"
                    title="Copy"
                    aria-label="Copy message"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>

                  {/* Retry */}
                  {isLast && (
                    <button
                      onClick={isRateLimited ? undefined : onReload}
                      disabled={isRateLimited}
                      className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors px-2.5 py-1.5 rounded ${isRateLimited
                        ? "opacity-40 cursor-not-allowed text-muted-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      title={isRateLimited ? "Rate limit reached" : "Retry"}
                      aria-label="Retry message"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Divider */}
                  <span className="w-px h-3 bg-border/60 mx-0.5" />

                  {/* Thumbs up */}
                  <button
                    onClick={() => handleVote(1)}
                    disabled={voting}
                    className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors px-2 py-1 rounded hover:bg-muted ${vote === 1 ? "text-green-500" : "text-muted-foreground hover:text-green-500"
                      }`}
                    title="Good response"
                    aria-label="Vote up"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </button>

                  {/* Thumbs down */}
                  <button
                    onClick={() => handleVote(-1)}
                    disabled={voting}
                    className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors px-2 py-1 rounded hover:bg-muted ${vote === -1 ? "text-destructive" : "text-muted-foreground hover:text-destructive"
                      }`}
                    title="Bad response"
                    aria-label="Vote down"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </button>

                  {/* Session actions — only on last assistant bubble */}
                  {isLast && (onExportPDF || onEscalate) && (
                    <>
                      <span className="w-px h-3 bg-border/60 mx-0.5" />

                      {/* Study Timer */}
                      <button
                        onClick={() => setTimerOpen(true)}
                        className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                        title="Study Timer"
                        aria-label="Open study timer"
                      >
                        <Timer className="h-3.5 w-3.5" />
                      </button>

                      {/* Export PDF */}
                      {onExportPDF && (
                        <button
                          onClick={onExportPDF}
                          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                          title="Export PDF"
                          aria-label="Export as PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                      )}


                      {/* Escalate */}
                      {onEscalate && (
                        escalationStatus ? (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded ${escalationStatus === "resolved" ? "text-green-600" :
                              escalationStatus === "in_review" ? "text-blue-600" : "text-amber-600"
                            }`}>
                            {escalationStatus === "resolved"
                              ? <><CheckCircle2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Reviewed</span></>
                              : <><Clock className="h-3.5 w-3.5 animate-pulse" /><span className="hidden sm:inline">{escalationStatus === "in_review" ? "Reviewing" : "Pending"}</span></>
                            }
                          </span>
                        ) : (
                          <button
                            onClick={onEscalate}
                            disabled={escalating || messagesLoading}
                            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 transition-colors px-2 py-1 rounded hover:bg-amber-50 disabled:opacity-50"
                            title="Escalate to teacher"
                            aria-label="Escalate to teacher"
                          >
                            {escalating
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <ShieldAlert className="h-3.5 w-3.5" />
                            }
                            <span className="hidden sm:inline">{escalating ? "Escalating…" : "Escalate"}</span>
                          </button>
                        ) as React.ReactNode
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <PomodoroTimer open={timerOpen} onOpenChange={setTimerOpen} showTrigger={false} />
          </>
        ) : (
          /* User message */
          <div className="flex flex-col gap-1.5">
            {attachmentName && (
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground w-fit max-w-full select-none">
                <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{attachmentName}</span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="whitespace-pre-wrap text-foreground font-medium">
                {collapsed && displayText.length > COLLAPSE_THRESHOLD
                  ? displayText.slice(0, COLLAPSE_THRESHOLD) + "…"
                  : displayText}
              </span>
              {displayText.length > COLLAPSE_THRESHOLD && (
                <button
                  onClick={() => setCollapsed((p) => !p)}
                  className="self-start text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  aria-expanded={!collapsed}
                >
                  {collapsed ? "Show more" : "Show less"}
                </button>
              )}
            </div>

            {!isStreamActive && (
              <div className="flex items-center gap-1 mt-1.5 transition-opacity duration-200 justify-end">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
                  title="Copy"
                  aria-label="Copy message"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {onEditRequest && (
                  <button
                    onClick={isRateLimited ? undefined : () => onEditRequest(displayText)}
                    disabled={isRateLimited}
                    className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider transition-colors px-2 py-1 rounded ${isRateLimited
                      ? "opacity-40 cursor-not-allowed text-muted-foreground/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    title={isRateLimited ? "Rate limit reached" : "Edit message"}
                    aria-label="Edit message"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(m.id)}
                    className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider transition-colors px-2 py-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
                    title="Delete message"
                    aria-label="Delete message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div
        className={`absolute -bottom-6 ${isUser ? "right-2" : "left-8"
          } opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[9px] text-muted-foreground font-mono bg-background border border-border/60 px-1.5 py-0.5 rounded shadow-sm pointer-events-none z-10`}
      >
        {m.createdAt
          ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "Just now"}
      </div>
    </div>
  );
});