import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  Loader2,
  Paperclip,
  Send,
  Square,
  Trash2,
  AlertCircle,
  Clock,
  CreditCard,
  X,
  Camera,
  Mic,
} from "lucide-react";

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
  /** Called when a rate-limit countdown finishes so the parent can clear the error and refresh status */
  onRateLimitExpired?: () => void;
  messagesUsed?: number;
  messagesMax?: number;
  /** Optional ref so parent can programmatically focus the textarea (e.g. after clicking Edit on a bubble) */
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  onScanClick?: () => void;
  onVoiceClick?: () => void;
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

function useRateLimitCountdown(chatError: string | null, onExpired?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const [maxSeconds, setMaxSeconds] = useState(60);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    if (!chatError) {
      setSecondsLeft(0);
      setCustomMessage(null);
      return;
    }

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
          if (s <= 1) {
            clearInterval(timerRef.current!);
            // Notify parent so it can clear the error & re-fetch status
            onExpiredRef.current?.();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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
  onRateLimitExpired,
  messagesUsed = 0,
  messagesMax = undefined,
  inputRef: externalInputRef,
  onScanClick,
  onVoiceClick,
}: Props) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = externalInputRef ?? internalRef;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isRateLimited = useMemo(() => {
    if (!chatError) return false;
    try {
      const parsed = JSON.parse(chatError);
      if (
        parsed.retryAfterMs ||
        parsed.isDaily ||
        (parsed.error &&
          (parsed.error.toLowerCase().includes("limit") ||
            parsed.error.toLowerCase().includes("daily") ||
            parsed.error.toLowerCase().includes("quota") ||
            parsed.error.toLowerCase().includes("slow down")))
      ) {
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

  // Warn when approaching limit (80–99%)
  const usagePct = (messagesMax ?? 0) > 0 ? messagesUsed / (messagesMax ?? 1) : 0;
  const isApproachingLimit =
    (messagesMax ?? 999_999) < 999_999 &&
    usagePct >= 0.8 &&
    // Only show the soft warning when the user hasn't actually hit the hard wall.
    // messagesUsed < messagesMax guards against stale counts that equal the max
    // after a reset but before the server clears them (Bug 3).
    messagesUsed < (messagesMax ?? 999_999) &&
    !isRateLimited;
  const remaining = Math.max(0, (messagesMax ?? 0) - messagesUsed);

  const { secondsLeft, isDaily, maxSeconds, customMessage } = useRateLimitCountdown(
    isRateLimited ? chatError : null,
    onRateLimitExpired,
  );
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

  const progressPct =
    secondsLeft > 0 && maxSeconds > 0 ? Math.min(100, (secondsLeft / maxSeconds) * 100) : 0;

  return (
    <div className="px-2 pb-2 pt-1 sm:px-4 sm:pb-4 sm:pt-3 sm:bg-background/95 sm:backdrop-blur-sm sm:border-t sm:border-border/40">
      <div className="lg:max-w-3xl lg:mx-auto">
        {/* Approaching-limit soft warning — auto-hides when usage drops below 80% */}
        {isApproachingLimit && (
          <div className="mb-2.5 rounded-2xl border border-orange-200 bg-orange-50/60 dark:bg-orange-950/20 dark:border-orange-900/30 backdrop-blur-sm overflow-hidden shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                <p className="text-[11px] font-semibold text-orange-800 dark:text-orange-300 leading-snug">
                  {remaining <= 1
                    ? `You've used all ${messagesMax} messages today`
                    : `You've hit ${Math.round(usagePct * 100)}% of your daily limit`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {onUpgrade && (
                  <button
                    onClick={onUpgrade}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-orange-600 active:scale-95 transition-all duration-200"
                  >
                    <CreditCard className="h-2.5 w-2.5" /> Upgrade
                  </button>
                )}
              </div>
            </div>
            {/* thin usage bar */}
            <div className="h-0.5 bg-orange-100 dark:bg-orange-900/40">
              <div
                className="h-full bg-orange-400 dark:bg-orange-500 transition-all duration-500"
                style={{ width: `${Math.min(100, usagePct * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Rate limit banner */}
        {isRateLimited && (
          <div className="mb-2 rounded-xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 dark:border-destructive/30 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="h-3.5 w-3.5 flex-shrink-0 text-destructive dark:text-red-400" />
                <p className="text-[11px] font-semibold text-destructive dark:text-red-300 leading-snug">
                  {isDaily
                    ? secondsLeft > 0
                      ? `Daily limit hit — resets in ${formatTime(secondsLeft)}`
                      : "Daily limit hit — resets at midnight (EAT)"
                    : secondsLeft > 0
                      ? `Too many messages — try again in ${formatTime(secondsLeft)}`
                      : "Too many messages — please wait a moment"}
                </p>
              </div>
              {onUpgrade && (
                <button
                  onClick={onUpgrade}
                  className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg bg-destructive px-2.5 py-1 text-[10px] font-bold text-white hover:bg-destructive/90 active:scale-95 transition-all"
                >
                  <CreditCard className="h-2.5 w-2.5" /> Upgrade
                </button>
              )}
            </div>
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
          <div className="mb-2.5 flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3 shadow-sm">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground leading-tight">
                {attachedFile.name}
              </p>
              <p className="font-mono text-[9px] text-muted-foreground mt-1 leading-tight">
                {formatFileSize(attachedFile.size)}
                {attachedFile.text.length > 8000 && (
                  <span className="ml-1.5 text-amber-500 font-medium">
                    · will be truncated to 8 000 chars
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onRemoveFile}
              className="flex-shrink-0 rounded-xl p-1.5 text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive active:scale-90"
              title="Remove attachment"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main input */}
        <div className="relative flex items-end gap-1.5 sm:gap-2 rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-[0_4px_20px_rgb(0,0,0,0.03)] focus-within:ring-2 focus-within:ring-primary/10">
          {/* File input: hidden with onClick reset so the file blob is untouched during onChange */}
          <input
            id="chat-file-input"
            type="file"
            className="hidden"
            accept=".pdf,.docx,.doc,.txt,.md,.csv,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={onFileChange}
            onClick={(e) => {
              (e.target as HTMLInputElement).value = "";
            }}
            disabled={isDisabled}
          />
          {/* label+htmlFor: native OS command — no JS click() required */}
          <div className="pb-2 pl-2 pt-2 flex items-center justify-center">
            <label
              htmlFor={isDisabled ? undefined : "chat-file-input"}
              aria-label="Attach a file (PDF, DOCX, TXT, MD, CSV — max 2MB)"
              aria-disabled={isDisabled}
              className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl transition-all duration-200 border border-transparent ${isDisabled
                  ? "opacity-40 cursor-not-allowed pointer-events-none"
                  : "cursor-pointer text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border/60 active:scale-90"
                }`}
              title="Attach a file (PDF, DOCX, TXT, MD, CSV — max 2MB)"
            >
              {parsingFile ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </label>
          </div>

          <textarea
            ref={textareaRef}
            className="min-h-[44px] sm:min-h-[40px] flex-1 resize-none bg-transparent py-3 sm:py-2.5 pr-1 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 transition-opacity duration-200"
            rows={1}
            value={input}
            onChange={onInputChange}
            placeholder={
              isPending
                ? "Waiting for response…"
                : isRateLimited
                  ? secondsLeft > 0
                    ? `Cooling down… ${formatTime(secondsLeft)}`
                    : "Rate limit reached…"
                  : parsingFile
                    ? "Parsing document…"
                    : "Ask GilaniAI anything…"
            }
            disabled={isDisabled}
            onKeyDown={handleKeyDown}
            style={{ maxHeight: 160, overflowY: "hidden" }}
          />

          <div className="pb-2 pr-2 pt-2 flex items-center gap-1">
            <button
              type="button"
              onClick={onScanClick}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border/60 active:scale-90 ${isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
              title="Scan homework"
              disabled={isDisabled}
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onVoiceClick}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border/60 active:scale-90 ${isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
              title="Voice input"
              disabled={isDisabled}
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                if (isPending) {
                  onStop?.();
                } else {
                  onSubmit(e as any);
                }
              }}
              disabled={!isPending && (isDisabled || (!input.trim() && !attachedFile))}
              title={isPending ? "Stop generating" : "Send (Enter)"}
              className={`flex flex-shrink-0 items-center justify-center gap-1.5 rounded-full transition-all duration-200 ${isPending
                  ? "h-8 w-8 bg-transparent border-2 border-primary text-primary hover:bg-primary/10 active:scale-95"
                  : isDisabled || (!input.trim() && !attachedFile)
                    ? "h-8 w-8 bg-muted text-muted-foreground opacity-40 cursor-not-allowed"
                    : "h-8 sm:h-8 px-3 sm:px-3.5 bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 hover:scale-105 active:scale-95"
                }`}
            >
              {isPending ? (
                <Square className="h-3 w-3" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-[11px] font-bold tracking-wide">Send</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer hint — desktop only */}
        <div className="mt-1.5 hidden md:flex items-center justify-between px-1 min-h-[14px]">
          <p className="font-mono text-[9px] text-muted-foreground/70">
            {isRateLimited && isDaily ? (
              <span className="text-amber-600 font-semibold">
                Daily cap reached · resets at midnight
              </span>
            ) : (
              "Shift+Enter for new line · PDF, DOCX, TXT supported"
            )}
          </p>
          {input.length > 0 && (
            <span
              className={`font-mono text-[9px] font-semibold tabular-nums transition-colors ${input.length > 3000 ? "text-amber-500" : "text-muted-foreground/70"}`}
            >
              {input.length.toLocaleString()} chars
            </span>
          )}
        </div>
        {/* Disclaimer — always visible, single line, mobile & desktop */}
        <div className="mt-1 flex justify-center px-1 w-full min-w-0 overflow-hidden">
          <Link
            to="/faq"
            hash="can-the-ai-make-mistakes"
            className="block w-full min-w-0 font-mono text-[8px] text-muted-foreground/60 text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis hover:text-muted-foreground/90 hover:underline"
          >
            GilaniAI can make mistakes. Please check responses.
          </Link>
        </div>

        {/* Mobile: only show char count when typing */}
        {input.length > 0 && (
          <div className="mt-1 flex justify-end px-1 sm:hidden animate-in fade-in duration-200">
            <span
              className={`font-mono text-[9px] font-semibold tabular-nums ${input.length > 3000 ? "text-amber-500" : "text-muted-foreground/70"}`}
            >
              {input.length.toLocaleString()} chars
            </span>
          </div>
        )}
      </div>
      {/* end lg:max-w-3xl wrapper */}
    </div>
  );
}
