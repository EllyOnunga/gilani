import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Send, Trash2, AlertCircle, Camera, Clock } from "lucide-react";

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
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
};

function useRateLimitCountdown(chatError: string | null) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!chatError) { setSecondsLeft(0); return; }

    // Parse "Try again in Xs" or "Resets in Xs"
    const match = chatError.match(/(?:Try again|Resets) in (\d+)s/);
    const daily = chatError.toLowerCase().includes("daily");
    setIsDaily(daily);

    if (match) {
      const secs = parseInt(match[1], 10);
      setSecondsLeft(secs);
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

  return { secondsLeft, isDaily };
}

export function ChatInput({
  input,
  isPending,
  parsingFile,
  attachedFile,
  chatError,
  onInputChange,
  onSubmit,
  onFileChange,
  onRemoveFile,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isRateLimited = !!(
    chatError?.includes("Rate limit") ||
    chatError?.includes("rate limit") ||
    chatError?.includes("Daily") ||
    chatError?.includes("quota")
  );
  const { secondsLeft, isDaily } = useRateLimitCountdown(isRateLimited ? chatError : null);
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

  const progressPct = secondsLeft > 0
    ? Math.min(100, (secondsLeft / (isDaily ? 86400 : 60)) * 100)
    : 0;

  return (
    <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 bg-background border-t border-border/60">
      {/* Rate limit banner with countdown */}
      {isRateLimited && (
        <div className="mb-2 rounded-xl border border-amber-300/50 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-700/40 overflow-hidden">
          <div className="flex items-start gap-2.5 px-3 py-2.5">
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
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                {isDaily
                  ? "You’ve hit your daily AI message cap. It resets at midnight."
                  : "You’re sending messages too fast. Take a short break."}
                {secondsLeft > 0 && (
                  <span className="ml-1 font-mono font-bold tabular-nums">
                    {secondsLeft}s
                  </span>
                )}
              </p>
            </div>
            {secondsLeft > 0 && !isDaily && (
              <div className="flex-shrink-0 flex items-center justify-center">
                <div className="relative h-8 w-8">
                  <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor"
                      className="text-amber-200 dark:text-amber-800" strokeWidth="3" />
                    <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor"
                      className="text-amber-500 dark:text-amber-400"
                      strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 12}`}
                      strokeDashoffset={`${2 * Math.PI * 12 * (1 - (secondsLeft / 60))}`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold text-amber-600 dark:text-amber-400">
                    {secondsLeft}
                  </span>
                </div>
              </div>
            )}
          </div>
          {/* Progress bar draining down */}
          {secondsLeft > 0 && !isDaily && (
            <div className="h-0.5 bg-amber-200/50 dark:bg-amber-800/50">
              <div
                className="h-full bg-amber-400 dark:bg-amber-500 transition-all duration-1000 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Attached file pill */}
      {attachedFile && (
        <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 shadow-sm">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <FileText className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground leading-tight">{attachedFile.name}</p>
            <p className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-tight">
              {(attachedFile.size / 1024).toFixed(1)} KB
              {attachedFile.text.length > 8000 && (
                <span className="ml-1.5 text-amber-500">· will be truncated to 8 000 chars</span>
              )}
            </p>
          </div>
          <button onClick={onRemoveFile}
            className="flex-shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Remove attachment" type="button">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main input */}
      <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card shadow-sm ring-0 transition-all duration-150 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
        <div className="pb-2 pl-2 pt-2">
          <input type="file" id="chat-file-attachment" className="hidden"
            accept=".pdf,.docx,.txt,.md,.csv,.jpg,.jpeg,.png,.webp"
            onChange={onFileChange} disabled={isDisabled} />
          <label htmlFor="chat-file-attachment"
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition-colors ${isDisabled ? "pointer-events-none opacity-40" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            title="Attach a file (PDF, DOCX, TXT, MD, CSV, JPG, PNG, WEBP — max 10 MB)">
            {parsingFile ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Paperclip className="h-4 w-4" />}
          </label>
        </div>

        <div className="pb-2 pt-2">
          <input type="file" id="chat-camera-capture" className="hidden"
            accept="image/*" capture="environment"
            onChange={onFileChange} disabled={isDisabled} />
          <label htmlFor="chat-camera-capture"
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition-colors ${isDisabled ? "pointer-events-none opacity-40" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            title="Take a photo (OCR will extract text)">
            <Camera className="h-4 w-4" />
          </label>
        </div>

        <textarea ref={textareaRef}
          className="min-h-[40px] flex-1 resize-none bg-transparent py-2.5 pr-1 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          rows={1} value={input} onChange={onInputChange}
          placeholder={
            isPending       ? "Waiting for response…" :
            isRateLimited   ? secondsLeft > 0 ? `Cooling down… ${secondsLeft}s` : "Rate limit reached…" :
            parsingFile     ? "Parsing document…" :
                              "Ask a question… (Enter to send)"
          }
          disabled={isDisabled} onKeyDown={handleKeyDown} style={{ maxHeight: 160 }} />

        <div className="pb-2 pr-2 pt-2">
          <button type="button" onClick={(e) => onSubmit(e as any)}
            disabled={isDisabled || (!input.trim() && !attachedFile)}
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-150 ${isDisabled || (!input.trim() && !attachedFile) ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed" : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95"}`}
            title="Send (Enter)">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between px-1 min-h-[14px]">
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
    </div>
  );
}
