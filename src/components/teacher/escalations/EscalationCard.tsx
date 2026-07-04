import { useState, useRef, Suspense, lazy } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, BookOpen, Loader2, Send, Keyboard, Edit3, Eye } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { CopyButton } from "./CopyButton";
import type { Escalation } from "@/components/teacher/hooks/useTeacherEscalations";

const MarkdownRenderer = lazy(() => import("@/components/tutor/MarkdownRenderer").then((m) => ({ default: m.MarkdownRenderer })));

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  distress_keyword: { label: "Distress keyword", color: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-900" },
  student_request: { label: "Student request", color: "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900" },
  low_confidence: { label: "Low confidence", color: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900" },
};

type Props = {
  esc: Escalation;
  isOpen: boolean;
  onOpen: () => void;
  convoMessages: any[];
  loadingMessages: boolean;
  answer: string;
  setAnswer: (v: string) => void;
  saving: boolean;
  onResolve: (id: string) => void;
  onCancel: () => void;
  urgent?: boolean;
};

export function EscalationCard({ esc, isOpen, onOpen, convoMessages, loadingMessages, answer, setAnswer, saving, onResolve, onCancel, urgent = false }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [showKeyboardHint, setShowKeyboardHint] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reasonMeta = REASON_LABELS[esc.reason] ?? { label: esc.reason, color: "text-muted-foreground border-border" };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (answer.trim() && !saving) onResolve(esc.id);
    }
  };

  return (
    <div className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow ${urgent ? "border-red-300 dark:border-red-800" : "border-border"} ${isOpen ? "shadow-md" : ""}`}>
      <button onClick={onOpen} className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 h-9 w-9 rounded-full overflow-hidden border border-border bg-background flex items-center justify-center shadow-inner">
            {esc.student_avatar ? (
              esc.student_avatar.startsWith("preset:") ? (
                <span className="font-serif text-xs font-bold text-primary capitalize">{esc.student_name ? esc.student_name.substring(0, 2) : "ST"}</span>
              ) : (
                <img src={esc.student_avatar} alt="Avatar" className="h-full w-full object-cover" />
              )
            ) : (
              <span className="font-serif text-xs font-bold text-primary capitalize">{esc.student_name ? esc.student_name.substring(0, 2) : "ST"}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-sans text-sm font-bold text-foreground">{esc.student_name || "Student"}</span>
              <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${reasonMeta.color}`}>{reasonMeta.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground">#{esc.conversation_id ? esc.conversation_id.slice(0, 8) : "—"}</span>
              {esc.status === "resolved" && (
                <span className="rounded-full border border-green-300 dark:border-green-700 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-green-700 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {esc.created_at ? new Date(esc.created_at).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${isOpen ? "border-border bg-muted text-muted-foreground" : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"}`}>
            {isOpen ? "Collapse" : "Respond"}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border animate-in-slide">
          <div className="px-4 sm:px-5 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Conversation History</p>
              </div>
              <span className="font-mono text-[9px] text-muted-foreground">{convoMessages.length} message{convoMessages.length !== 1 ? "s" : ""}</span>
            </div>
            {loadingMessages ? (
              <div className="flex items-center gap-2 py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Loading messages…</span>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                {convoMessages.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-4">No messages found.</p> : convoMessages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
              </div>
            )}
          </div>

          <div className="px-4 sm:px-5 pb-5 pt-2 space-y-3 border-t border-border/50">
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2">
                <Send className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Your Expert Response</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setShowKeyboardHint(!showKeyboardHint)} className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent transition-colors" title="Keyboard shortcuts">
                  <Keyboard className="h-3 w-3" />
                </button>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button type="button" onClick={() => setShowPreview(false)} className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors ${!showPreview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}>
                    <Edit3 className="h-3 w-3" /> Write
                  </button>
                  <button type="button" onClick={() => setShowPreview(true)} className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors border-l border-border ${showPreview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}>
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                </div>
              </div>
            </div>

            {showKeyboardHint && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground space-y-1">
                <p><kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">Enter</kbd> — Submit response</p>
                <p>Supports markdown: <code className="text-primary">**bold**</code>, <code className="text-primary">$math$</code>, <code className="text-primary">```code```</code></p>
              </div>
            )}

            {showPreview ? (
              <div className="min-h-[140px] rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed">
                {answer.trim() ? (
                  <Suspense fallback={<p className="text-sm text-muted-foreground">{answer}</p>}>
                    <MarkdownRenderer content={answer} className="text-sm" />
                  </Suspense>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Nothing to preview yet. Start writing to see the formatted output.</p>
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
                <p className="font-mono text-[10px] text-muted-foreground">{answer.trim().length} chars</p>
                {answer.trim() && <CopyButton text={answer} />}
              </div>
              <div className="flex gap-2">
                <button onClick={onCancel} className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors">Cancel</button>
                <button onClick={() => onResolve(esc.id)} disabled={saving || !answer.trim()} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
