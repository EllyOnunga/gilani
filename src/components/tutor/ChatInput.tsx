import { useEffect, useRef, useState, useMemo } from "react";
import { FileText, Loader2, Paperclip, Send, Square, Trash2, AlertCircle, Clock, CreditCard, X } from "lucide-react";

type AttachedFile = {
  name: string;
  size: number;
  text: string;
};

type Props = {
  input: string;
  isPending: boolean;
  parsingFile: boolean;
  attachedFile: AttachedFile | null;
  chatError: string | null;
  docUploadError: string | null;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  onClearDocError: () => void;
  onUpgrade?: () => void;
  onStop?: () => void;
  messagesUsed?: number;
  messagesMax?: number;
  /** Optional ref so parent can programmatically focus the textarea (e.g. after clicking Edit on a bubble) */
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
}

function useRateLimitCountdown(chatError: string | null) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const [maxSeconds, setMaxSeconds] = useState(60);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!chatError) { setSecondsLeft(0); setCustomMessage(null); return; }

    let secs = 0;
    let daily = chatError.toLowerCase().includes("daily");
    let msg: string | null = null;

    // Try to parse JSON from Supabase/API response
    try {
      const parsed = JSON.parse(chatError);
      if (parsed.retryAfterMs) {
        secs = Math.ceil(parsed.retryAfterMs / 1000);
      }
      if (parsed.isDaily !== undefined) {
        daily = !!parsed.isDaily;
      }
      msg = parsed.error || parsed.message || null;
    } catch {
      // Fallback: Parse "Try again in Xs" or "Resets in Xs"
      const match = chatError.match(/(?:Try again|Resets) in (\d+)s/);
      if (match) {
        secs = parseInt(match[1], 10);
      }
    }

    setIsDaily(daily);
    setCustomMessage(msg);

    if (secs > 0) {
      setSecondsLeft(secs);
      setMaxSeconds(secs);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) { clearInterval(timerRef.current!); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [chatError]);

  return { secondsLeft, isDaily, maxSeconds, customMessage };
}

export function ChatInput({
  input,
  isPending,
  parsingFile,
  attachedFile,
  chatError,
  docUploadError,
  onInputChange,
  onSubmit,
  onFileChange,
  onRemoveFile,
  onClearDocError,
  onUpgrade,
  onStop,
  messagesUsed = 0,
  messagesMax = 10,
  inputRef: externalInputRef,
}: Props) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = externalInputRef ?? internalRef;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isRateLimited = useMemo(() => {
    if (!chatError) return false;
    try {
      const parsed = JSON.parse(chatError);
      if (parsed.retryAfterMs || parsed.isDaily || (parsed.error && (
        parsed.error.toLowerCase().includes("limit") ||
        parsed.error.toLowerCase().includes("daily") ||
        parsed.error.toLowerCase().includes("quota") ||
        parsed.error.toLowerCase().includes("slow down")
      ))) {
        return true;
      }
    } catch {
      // ignore
    }
    const errLower = chatError.toLowerCase();
    return (
      errLower.includes("rate limit") ||
      errLower.includes("daily") ||
      errLower.includes("quota") ||
      errLower.includes("slow down") ||
      errLower.includes("too many requests") ||
      errLower.includes("exceeded")
    );
  }, [chatError]);

  const { secondsLeft, isDaily, maxSeconds, customMessage } = useRateLimitCountdown(isRateLimited ? chatError : null);
  const isDisabled = isPending || parsingFile || isRateLimited;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      if (input !== "") {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
      }
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  const progressPct = secondsLeft > 0 && maxSeconds > 0
    ? Math.min(100, (secondsLeft / maxSeconds) * 100)
    : 0;

  return (
    <div className="px-2 pb-2 pt-1 sm:px-4 sm:pb-4 sm:pt-3 sm:bg-background/95 sm:backdrop-blur-sm sm:border-t sm:border-border/40">
      <div className="lg:max-w-3xl lg:mx-auto">
      {/* Rate limit banner with countdown */}
      {isRateLimited && (
        <div className="mb-2.5 rounded-2xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/30 backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="flex flex-col sm:flex-row items-start gap-2.5 px-3.5 py-3">
            <div className="flex-shrink-0 mt-0.5">
              {secondsLeft > 0
                ? <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                : <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                {isDaily ? "Daily limit reached" : "Slow down a little…"}
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 font-medium leading-relaxed">
                {customMessage || (isDaily
                  ? `You've hit your daily AI message cap.${secondsLeft > 0 ? ` Resets in ${formatTime(secondsLeft)}.` : " Resets at midnight (EAT)."}`
                  : `You're sending messages too fast. Take a short break.${secondsLeft > 0 ? ` Try again in ${formatTime(secondsLeft)}.` : ""}`)}
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {secondsLeft > 0 && (
                <div className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-300 tabular-nums border border-amber-500/30">
                  <Clock className="h-3 w-3" /> {formatTime(secondsLeft)}
                </div>
              )}
              {isDaily && onUpgrade && (
                <button
                  onClick={onUpgrade}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all duration-200"
                >
                  <CreditCard className="h-3 w-3" /> Upgrade
                </button>
              )}
            </div>
          </div>
          {/* Progress bar draining down */}
          {secondsLeft > 0 && (
            <div className="h-0.5 bg-amber-200/50 dark:bg-amber-800/50">
              <div
                className="h-full bg-amber-400 dark:bg-amber-500 transition-all duration-1000 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* General AI/Server Error Banner */}
      {chatError && !isRateLimited && (
        <div className="mb-2.5 rounded-2xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 dark:border-destructive/30 backdrop-blur-sm shadow-sm animate-in-slide">
          <div className="flex items-start gap-2.5 px-3.5 py-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="h-4 w-4 text-destructive dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-destructive dark:text-red-300">
                Chat Session Issue
              </p>
              <p className="text-[11px] text-destructive/80 dark:text-red-400/85 mt-0.5 font-medium leading-relaxed">
                {(() => {
                  try {
                    const parsed = JSON.parse(chatError);
                    return parsed.error || parsed.message || chatError;
                  } catch {
                    return chatError;
                  }
                })()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Error Banner */}
      {docUploadError && (
        <div className="mb-2.5 rounded-2xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 dark:border-destructive/30 backdrop-blur-sm shadow-sm">
          <div className="flex items-start gap-2.5 px-3.5 py-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="h-4 w-4 text-destructive dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-destructive dark:text-red-300">
                Document Upload Issue
              </p>
              <p className="text-[11px] text-destructive/80 dark:text-red-400/85 mt-0.5 font-medium">
                {docUploadError}
              </p>
            </div>
            <button
              onClick={onClearDocError}
              className="flex-shrink-0 rounded-lg p-1 text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
              title="Dismiss error"
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Attached file pill */}
      {attachedFile && (
        <div className="mb-2.5 flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5/30 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3 shadow-sm">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground leading-tight">{attachedFile.name}</p>
            <p className="font-mono text-[9px] text-muted-foreground mt-1 leading-tight">
              {formatFileSize(attachedFile.size)}
              {attachedFile.text.length > 8000 && (
                <span className="ml-1.5 text-amber-500 font-medium">· will be truncated to 8 000 chars</span>
              )}
            </p>
          </div>
          <button onClick={onRemoveFile}
            className="flex-shrink-0 rounded-xl p-1.5 text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive active:scale-90"
            title="Remove attachment" type="button">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main input */}
      <div className="relative flex items-end gap-1.5 sm:gap-2 rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-[0_4px_20px_rgb(0,0,0,0.03)] focus-within:ring-2 focus-within:ring-primary/10">
        {/* File input: hidden with onClick reset so the file blob is untouched during onChange */}
        <input
          id="chat-file-input"
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.txt,.md,.csv,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={onFileChange}
          onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
          disabled={isDisabled}
        />
        {/* label+htmlFor: native OS command — no JS click() required */}
        <div className="pb-2 pl-2 pt-2 flex items-center justify-center">
          <label
            htmlFor={isDisabled ? undefined : "chat-file-input"}
            aria-label="Attach a file (PDF, DOCX, TXT, MD, CSV — max 2MB)"
            aria-disabled={isDisabled}
            className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl transition-all duration-200 ${
              isDisabled
                ? "opacity-40 cursor-not-allowed pointer-events-none"
                : "cursor-pointer text-muted-foreground hover:bg-muted/80 hover:text-foreground active:scale-90"
            }`}
            title="Attach a file (PDF, DOCX, TXT, MD, CSV — max 2MB)">
            {parsingFile ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Paperclip className="h-4 w-4" />}
          </label>
        </div>

        <textarea ref={textareaRef}
          className="min-h-[44px] sm:min-h-[40px] flex-1 resize-none bg-transparent py-3 sm:py-2.5 pr-1 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          rows={1} value={input} onChange={onInputChange}
          placeholder={
            isPending       ? "Waiting for response…" :
            isRateLimited   ? secondsLeft > 0 ? `Cooling down… ${formatTime(secondsLeft)}` : "Rate limit reached…" :
            parsingFile     ? "Parsing document…" :
            "Ask anything…"
          }
          disabled={isDisabled} onKeyDown={handleKeyDown} style={{ maxHeight: 160, overflowY: 'hidden' }} />

        <div className="pb-2 pr-2 pt-2">
          <button type="button" onClick={(e) => { if (isPending) { onStop?.(); } else { onSubmit(e as any); } }}
            disabled={!isPending && (isDisabled || (!input.trim() && !attachedFile))}
            className={`flex h-9 w-9 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center transition-all duration-200 ${
              isPending
                ? "rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95"
                : isDisabled || (!input.trim() && !attachedFile)
                  ? "rounded-full bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                  : "rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-primary/20 hover:scale-105 active:scale-95 hover:-translate-y-0.5"
            }`}
            title={isPending ? "Stop generating" : "Send (Enter)"}>
            {isPending ? <Square className="h-3 w-3 fill-current" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Footer hint — desktop only */}
      <div className="mt-1.5 hidden md:flex items-center justify-between px-1 min-h-[14px]">
        <p className="font-mono text-[9px] text-muted-foreground/70">
          {isPending
            ? <span className="animate-pulse font-bold text-primary/70">GilaniAI is thinking…</span>
            : isRateLimited && isDaily
              ? <span className="text-amber-600 font-semibold">Daily cap reached · resets at midnight</span>
              : "Shift+Enter for new line · PDF, DOCX, TXT supported"
          }
        </p>
        {input.length > 0 && (
          <span className={`font-mono text-[9px] font-semibold tabular-nums transition-colors ${input.length > 3000 ? "text-amber-500" : "text-muted-foreground/70"}`}>
            {input.length.toLocaleString()} chars
          </span>
        )}
      </div>
      {/* Mobile: only show char count when typing */}
      {input.length > 0 && (
        <div className="mt-1 flex justify-end px-1 sm:hidden">
          <span className={`font-mono text-[9px] font-semibold tabular-nums ${input.length > 3000 ? "text-amber-500" : "text-muted-foreground/70"}`}>
            {input.length.toLocaleString()} chars
          </span>
        </div>
      )}
      </div>{/* end lg:max-w-3xl wrapper */}
    </div>
  );
}
