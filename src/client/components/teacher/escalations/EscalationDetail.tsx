import { useState, useRef, Suspense, lazy } from "react";
import { CheckCircle2, BookOpen, Loader2, Send, Keyboard, Edit3, Eye } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { CopyButton } from "./CopyButton";
import type { Escalation } from "@/client/components/teacher/hooks/useTeacherEscalations";

const MarkdownRenderer = lazy(() =>
  import("@/client/components/tutor/MarkdownRenderer").then((m) => ({
    default: m.MarkdownRenderer,
  })),
);

type Props = {
  esc: Escalation;
  convoMessages: any[];
  loadingMessages: boolean;
  answer: string;
  setAnswer: (v: string) => void;
  saving: boolean;
  onResolve: (id: string) => void;
  onCancel: () => void;
  /** "inline" = mobile accordion body (bordered box). "panel" = desktop side panel (no outer border, fills panel). */
  variant?: "inline" | "panel";
};

export function EscalationDetail({
  esc,
  convoMessages,
  loadingMessages,
  answer,
  setAnswer,
  saving,
  onResolve,
  onCancel,
  variant = "inline",
}: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (answer.trim() && !saving) onResolve(esc.id);
    }
  };

  const wrapperClass =
    variant === "inline" ? "border-t border-border animate-in-slide" : "h-full flex flex-col";

  return (
    <div className={wrapperClass}>
      <div className="px-4 sm:px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Conversation History
            </p>
          </div>
          <span className="font-mono text-[9px] text-muted-foreground">
            {convoMessages.length} message{convoMessages.length !== 1 ? "s" : ""}
          </span>
        </div>
        {loadingMessages ? (
          <div className="flex items-center gap-2 py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading messages…</span>
          </div>
        ) : (
          <div
            className={`overflow-y-auto rounded-xl border border-border bg-muted/20 p-3 space-y-3 ${variant === "panel" ? "flex-1 min-h-[160px]" : "max-h-96"}`}
          >
            {convoMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4">
                No messages found.
              </p>
            ) : (
              convoMessages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
            )}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-5 pb-5 pt-2 space-y-3 border-t border-border/50">
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-2">
            <Send className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Your Expert Response
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowKeyboardHint(!showKeyboardHint)}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent transition-colors"
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-3 w-3" />
            </button>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors ${!showPreview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
              >
                <Edit3 className="h-3 w-3" /> Write
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors border-l border-border ${showPreview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
              >
                <Eye className="h-3 w-3" /> Preview
              </button>
            </div>
          </div>
        </div>

        {showKeyboardHint && (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground space-y-1">
            <p>
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                Enter
              </kbd>{" "}
              — Submit response
            </p>
            <p>
              Supports markdown: <code className="text-primary">**bold**</code>,{" "}
              <code className="text-primary">$math$</code>,{" "}
              <code className="text-primary">```code```</code>
            </p>
          </div>
        )}

        {showPreview ? (
          <div className="min-h-[140px] rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed">
            {answer.trim() ? (
              <Suspense fallback={<p className="text-sm text-muted-foreground">{answer}</p>}>
                <MarkdownRenderer content={answer} className="text-sm" />
              </Suspense>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Nothing to preview yet. Start writing to see the formatted output.
              </p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={6}
            placeholder="Write a clear, helpful response. You can use markdown, $math$, and \ce{chemistry}…"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 resize-none leading-relaxed placeholder:text-muted-foreground/60 font-sans"
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="font-mono text-[10px] text-muted-foreground">
              {answer.trim().length} chars
            </p>
            {answer.trim() && <CopyButton text={answer} />}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onResolve(esc.id)}
              disabled={saving || !answer.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Mark Resolved
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
