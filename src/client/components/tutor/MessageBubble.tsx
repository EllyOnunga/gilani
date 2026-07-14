import React, { useEffect, useRef, useState, useMemo, memo } from "react";
import {
  Copy,
  RefreshCw,
  Check,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  FileText,
  Trash2,
  Download,
  ShieldAlert,
  Timer,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/client/supabase";
import { SmoothMarkdownRenderer } from "@/client/components/tutor/SmoothMarkdownRenderer";
import { PomodoroTimer } from "@/client/components/tutor/PomodoroTimer";
import { ThinkingSweep } from "@/client/components/tutor/ThinkingSweep";

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
  pauseLabel?: string | null;
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
  pauseLabel,
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
      m.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text || "")
        .join("") || "";
    const rawText = partsText || m.content || "";
    const match = rawText.match(/\[Document Attached:\s*([^\]\n]+)\]/);
    return match ? match[1].trim() : null;
  }, [m.id, m.role, m.parts, m.content]);

  const displayText = useMemo(() => {
    const partsText =
      m.parts
        ?.filter((p: any) => p.type === "text")
        .map((p: any) => p.text || "")
        .join("") || "";
    const rawText = partsText || m.content || "";
    return m.role === "user"
      ? rawText
          .replace(/<DocumentContent[^>]*>[\s\S]*?<\/DocumentContent>\n*/g, "")
          .replace(/\[Document Attached:[^\]]+\]\n*/g, "")
          .replace(/^Student Query:\s*(\(See attached document\))?\s*/m, "")
          .trim()
      : rawText;
  }, [m.id, m.role, m.parts, m.content]);

  const { reasoningSteps, toolSteps } = useMemo(() => {
    const part = m.parts?.find((p: any) => p.type === "thinking-steps");
    const steps = Array.isArray(part?.steps) ? part.steps : [];

    const dbToolSteps = steps.filter(
      (s: any) => s.type === "tool-call" || s.type === "tool-result",
    );

    const liveToolSteps: any[] = [];
    const seenCalls = new Set<string>();
    const seenResults = new Set<string>();
    if (m.toolInvocations && m.toolInvocations.length > 0) {
      for (const inv of m.toolInvocations) {
        const invId = inv.toolCallId || inv.toolName;
        if (!seenCalls.has(invId)) {
          seenCalls.add(invId);
          liveToolSteps.push({
            type: "tool-call",
            toolName: inv.toolName,
            input: inv.args,
          });
        }
        if ("result" in inv && !seenResults.has(invId)) {
          seenResults.add(invId);
          liveToolSteps.push({
            type: "tool-result",
            toolName: inv.toolName,
            output: inv.result,
          });
        }
      }
    }

    const finalToolSteps = liveToolSteps.length > 0 ? liveToolSteps : dbToolSteps;

    return {
      reasoningSteps: steps.filter((s: any) => s.type === "reasoning"),
      toolSteps: finalToolSteps,
    };
  }, [m.id, m.parts, m.toolInvocations]);

  const [showThinkingPanel, setShowThinkingPanel] = useState(false);

  const isStreamActive = isPending && isLast;
  // Detect a silent mid-stream pause (no tool, no new text for a beat) so we
  // can still show a "Thinking..." indicator instead of a stuck blinking cursor.
  const [isStalled, setIsStalled] = useState(false);
  const lastTextRef = useRef<string>("");
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!isStreamActive) {
      setIsStalled(false);
      return;
    }
    if (displayText !== lastTextRef.current) {
      lastTextRef.current = displayText;
      setIsStalled(false);
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
      stallTimerRef.current = setTimeout(() => setIsStalled(true), 1500);
    }
    return () => {
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    };
  }, [displayText, isStreamActive]);
  useEffect(() => {
    if (!isStreamActive) return;
    stallTimerRef.current = setTimeout(() => setIsStalled(true), 1500);
    return () => {
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    };
  }, [isStreamActive]);
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
    const isValidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      m.id || "",
    );
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
        await supabase
          .from("message_feedback")
          .delete()
          .eq("message_id", m.id)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("message_feedback")
          .upsert(
            { message_id: m.id, user_id: userId, vote: newVote },
            { onConflict: "message_id,user_id" },
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
    <div className={`flex w-full group py-4 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex flex-col relative ${
          isUser ? "max-w-[85%] sm:max-w-[75%]" : "w-full px-3 sm:px-8"
        }`}
      >
        {/* Live tool call indicator — rendered OUTSIDE the bubble so it's visible even before text appears */}
        {!isUser && isStreamActive && toolSteps.length > 0 && !showBubbleCard && (
          <div className="mb-2 flex flex-wrap gap-2 animate-in fade-in duration-300 w-full max-w-[96%]">
            {toolSteps.map((step: any, i: number) => {
              if (step.type !== "tool-call") return null;
              const isDone = toolSteps.some(
                (s: any) => s.type === "tool-result" && s.toolName === step.toolName,
              );
              return (
                <div
                  key={`${step.toolName}-${i}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-mono border transition-all duration-300 ${
                    isDone
                      ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/50"
                      : "bg-amber-950/40 text-amber-400 border-amber-800/50"
                  }`}
                >
                  {isDone ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-spin"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                  <span className="font-semibold">{step.toolName}</span>
                </div>
              );
            })}
          </div>
        )}
        <div
          className={`${
            isUser
              ? "px-5 py-3.5 bg-muted/60 text-foreground rounded-3xl rounded-tr-sm"
              : isStreamActive && !showBubbleCard
                ? "opacity-0 pointer-events-none"
                : "px-0 py-1 bg-transparent text-foreground"
          } text-[15px] leading-relaxed relative transition-all duration-200`}
        >
          {!isUser ? (
            <>
              <div className="flex flex-col w-full">
                {showBubbleCard ? (
                  <div className="prose-ai relative">
                    {reasoningSteps.length > 0 && (
                      <div className="mb-2">
                        <button
                          type="button"
                          onClick={() => setShowThinkingPanel((v) => !v)}
                          className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-muted-foreground/70 hover:text-foreground transition-colors"
                        >
                          Thinking{showThinkingPanel ? " ▲" : " ..."}
                        </button>
                        {showThinkingPanel && (
                          <div className="mt-1.5 space-y-1.5 rounded-lg border border-border/50 bg-muted/20 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                            {reasoningSteps.map((step: any, i: number) => (
                              <p
                                key={`reasoning-${i}-${(step.text || "").slice(0, 20)}`}
                                className="italic"
                              >
                                {step.text}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Use SmoothMarkdownRenderer for word-by-word streaming */}
                    <SmoothMarkdownRenderer
                      content={displayText}
                      isStreaming={isStreamActive}
                      className={
                        isStreamActive && !pauseLabel && !isStalled
                          ? "transition-opacity duration-200 streaming-cursor"
                          : "transition-opacity duration-200"
                      }
                    />
                    {isStreamActive && (pauseLabel || isStalled) && (
                      <div className="mt-1 animate-in fade-in duration-300">
                        <ThinkingSweep label={pauseLabel || "Thinking..."} />
                      </div>
                    )}

                    {toolSteps.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {toolSteps.map((step: any, i: number) => {
                          if (step.type !== "tool-call") return null;
                          const isDone = toolSteps.some(
                            (s: any) => s.type === "tool-result" && s.toolName === step.toolName,
                          );
                          return (
                            <div
                              key={`${step.toolName}-${i}`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all duration-300 ${
                                isDone
                                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/50"
                                  : "bg-amber-950/40 text-amber-400 border-amber-800/50"
                              }`}
                            >
                              {isDone ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="animate-spin"
                                >
                                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                              )}
                              <span className="font-semibold">{step.toolName}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  !isStreamActive && (
                    <span className="text-xs text-muted-foreground italic mt-1">
                      No response generated. Please resend your question.
                    </span>
                  )
                )}

                {/* Footer: action buttons (only once a final response exists) + persistent G avatar
                    The avatar renders in all three states — before, during, and after streaming —
                    since it lives outside the showBubbleCard/isStreamActive gates below. */}
                <div className="flex flex-col gap-1.5 mt-2">
                  {showBubbleCard && !isStreamActive && (
                    <div className="flex items-center gap-1 transition-opacity duration-200">
                      {/* Copy */}
                      <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded hover:bg-muted"
                        title="Copy"
                        aria-label="Copy message"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Retry */}
                      {isLast && (
                        <button
                          onClick={isRateLimited ? undefined : onReload}
                          disabled={isRateLimited}
                          className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors px-2.5 py-1.5 rounded ${
                            isRateLimited
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
                        className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors px-2 py-1 rounded hover:bg-muted ${
                          vote === 1
                            ? "text-green-500"
                            : "text-muted-foreground hover:text-green-500"
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
                        className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors px-2 py-1 rounded hover:bg-muted ${
                          vote === -1
                            ? "text-destructive"
                            : "text-muted-foreground hover:text-destructive"
                        }`}
                        title="Bad response"
                        aria-label="Vote down"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Persistent G avatar — only on the last assistant message,
                      visible before, during, and after streaming */}
                  {isLast && (
                    <div className="flex items-center">
                      <div
                        className="flex items-center justify-center text-2xl font-bold text-primary select-none leading-none"
                        aria-hidden="true"
                        title="GilaniAI"
                      >
                        G
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {onEditRequest && (
                    <button
                      onClick={isRateLimited ? undefined : () => onEditRequest(displayText)}
                      disabled={isRateLimited}
                      className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider transition-colors px-2 py-1 rounded ${
                        isRateLimited
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
          className={`absolute -bottom-2 ${
            isUser ? "right-2" : "left-12"
          } opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[9px] text-muted-foreground font-mono bg-background border border-border/60 px-1.5 py-0.5 rounded shadow-sm pointer-events-none z-10`}
        >
          {m.createdAt
            ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Just now"}
        </div>
      </div>
    </div>
  );
});
