import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, RefreshCw, Check, ThumbsUp, ThumbsDown, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { ThinkingIndicator } from "./ThinkingIndicator";
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
  userId?: string;
};



const MemoMarkdown = React.memo(
  ({ content }: { content: string }) => <MarkdownRenderer content={content} />,
  (prev, next) => prev.content === next.content
);

export const MessageBubble = React.memo(function MessageBubble({ message: m, idx, isLast, isPending, isRateLimited, onReload, onEdit, userId}: Props) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<1 | -1 | null>(null);
  const [voting, setVoting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setResolvedUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setResolvedUserId(session?.user?.id ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  const COLLAPSE_THRESHOLD = 300;
  const editRef = useRef<HTMLTextAreaElement>(null);

  const displayText = React.useMemo(() => {
    const partsText =
      m.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("") || "";
    const rawText = partsText || (m as any).content || "";
    return m.role === "user"
      ? rawText
          .replace(/<DocumentContent[^>]*>[\s\S]*?<\/DocumentContent>\n\n/g, "")
          .replace(/\[Document Attached: [^\]]+\]\n\n/g, "")
          .replace(/Student Query: (\(See attached document\))?/g, "")
          .trim()
      : rawText;
  }, [m.parts, m.content, m.role]);

  const isStreamActive = isPending && isLast;
  const visibleText = displayText;
  const [showMarkdown, setShowMarkdown] = useState(false);

  useEffect(() => {
    if (!isStreamActive && visibleText) {
      const t = setTimeout(() => setShowMarkdown(true), 150);
      return () => clearTimeout(t);
    } else {
      setShowMarkdown(false);
    }
  }, [isStreamActive]);

  // Show thinking only while waiting for first token
  const showThinking = isStreamActive && !visibleText;


  // Load existing vote for this message
  useEffect(() => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id || "");
    if (!resolvedUserId || !m.id || !isUUID || m.role !== "assistant") return;
    supabase
      .from("message_feedback")
      .select("vote")
      .eq("message_id", m.id)
      .eq("user_id", resolvedUserId)
      .maybeSingle()
      .then(({ data }) => { if (data) setVote(data.vote as 1 | -1); });
  }, [m.id, resolvedUserId, m.role]);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast.success("Copied!");
  };

  const handleVote = async (v: 1 | -1) => {
    const isValidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id || "");
    if (!resolvedUserId || !m.id || !isValidId || voting) return;
    const newVote = vote === v ? null : v;
    // Optimistic update — update UI immediately
    const previousVote = vote;
    setVote(newVote);
    if (newVote !== null) {
      toast.success(newVote === 1 ? "Thanks for the feedback! 👍" : "Noted — we'll improve. 👎");
    }
    setVoting(true);
    try {
      if (newVote === null) {
        await supabase.from("message_feedback").delete()
          .eq("message_id", m.id).eq("user_id", resolvedUserId);
      } else {
        await supabase.from("message_feedback").upsert(
          { message_id: m.id, user_id: resolvedUserId, vote: newVote },
          { onConflict: "message_id,user_id" }
        );
      }
    } catch {
      // Revert on failure
      setVote(previousVote);
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
            ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
            : "bg-card border border-border text-foreground rounded-tl-sm shadow-sm"
        }`}
      >
        {!isUser ? (
          <div className="flex flex-col w-full">
            <ThinkingIndicator show={showThinking} />
            {visibleText || isStreamActive ? (
              <div className="prose-ai relative">
                {!showMarkdown ? (
                  <StreamingText text={visibleText} />
                ) : (
                  <div className="animate-in fade-in duration-500 fill-mode-both">
                    <MemoMarkdown content={displayText} />
                  </div>
                )}
                {isStreamActive && !visibleText && (
                  <span className="inline-flex items-center gap-[3px] ml-1 align-middle">
                    <span className="text-xs text-muted-foreground font-medium">Thinking</span>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="inline-block w-1 h-1 rounded-full bg-primary"
                        style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                      />
                    ))}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic mt-1">
                No response generated. Please resend your question.
              </span>
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
            {editing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(); } if (e.key === "Escape") setEditing(false); }}
                  className="w-full rounded-lg bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground text-sm px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary-foreground/40 min-h-[60px]"
                  rows={3}
                />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => setEditing(false)}
                    className="rounded px-2 py-0.5 text-[10px] font-bold text-primary-foreground/70 hover:text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/10 transition-colors">
                    Cancel
                  </button>
                  <button onClick={submitEdit}
                    className="rounded px-2 py-0.5 text-[10px] font-bold bg-primary-foreground text-primary hover:bg-primary-foreground/90 transition-colors">
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
                    className="self-start text-[10px] font-bold text-primary-foreground/60 hover:text-primary-foreground underline underline-offset-2 transition-colors"
                  >
                    {collapsed ? "Show more" : "Show less"}
                  </button>
                )}
              </div>
            )}

            {!editing && !isStreamActive && (
              <div className="flex items-center gap-1 mt-1 transition-opacity duration-200 justify-end">
                <button onClick={handleCopy}
                  className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider text-primary-foreground/60 hover:text-primary-foreground transition-colors px-2 py-1 rounded hover:bg-primary-foreground/10"
                  title="Copy">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                {onEdit && (
                  <button onClick={isRateLimited ? undefined : startEdit}
                    disabled={isRateLimited}
                    className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider transition-colors px-1.5 py-0.5 rounded ${
                      isRateLimited
                        ? "opacity-40 cursor-not-allowed text-primary-foreground/40"
                        : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
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
  return getText(prev.message) === getText(next.message) && prev.message?.id === next.message?.id;
}
);
