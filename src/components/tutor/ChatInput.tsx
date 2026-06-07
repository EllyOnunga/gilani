import { useEffect, useRef } from "react";
import { FileText, Loader2, Paperclip, Send, Trash2, AlertCircle } from "lucide-react";

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
  const isRateLimited = !!(chatError?.includes("rate limit") || chatError?.includes("quota"));
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

  return (
    <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 bg-background border-t border-border/60">

      {/* Rate limit / error banner */}
      {isRateLimited && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-destructive" />
          <p className="text-xs font-medium text-destructive">
            Rate limit reached — please wait a few minutes before sending
          </p>
        </div>
      )}

      {/* Attached file pill */}
      {attachedFile && (
        <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 shadow-sm">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <FileText className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground leading-tight">
              {attachedFile.name}
            </p>
            <p className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-tight">
              {(attachedFile.size / 1024).toFixed(1)} KB
              {attachedFile.text.length > 8000 && (
                <span className="ml-1.5 text-amber-500">· will be truncated to 8 000 chars</span>
              )}
            </p>
          </div>
          <button
            onClick={onRemoveFile}
            className="flex-shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Remove attachment"
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main input container */}
      <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card shadow-sm ring-0 transition-all duration-150 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">

        {/* File attach button — inside left of container */}
        <div className="pb-2 pl-2 pt-2">
          <input
            type="file"
            id="chat-file-attachment"
            className="hidden"
            accept=".pdf,.docx,.txt,.md,.csv"
            onChange={onFileChange}
            disabled={isDisabled}
          />
          <label
            htmlFor="chat-file-attachment"
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition-colors
              ${isDisabled
                ? "pointer-events-none opacity-40"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            title="Attach a document (PDF, DOCX, TXT, MD, CSV — max 10 MB)"
          >
            {parsingFile ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </label>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="min-h-[40px] flex-1 resize-none bg-transparent py-2.5 pr-1 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          rows={1}
          value={input}
          onChange={onInputChange}
          placeholder={
            isPending
              ? "Waiting for response…"
              : isRateLimited
                ? "Rate limit reached — please wait…"
                : parsingFile
                  ? "Parsing document…"
                  : "Ask a question… (Enter to send)"
          }
          disabled={isDisabled}
          onKeyDown={handleKeyDown}
          style={{ maxHeight: 160 }}
        />

        {/* Send button */}
        <div className="pb-2 pr-2 pt-2">
          <button
            type="button"
            onClick={(e) => onSubmit(e as any)}
            disabled={isDisabled || (!input.trim() && !attachedFile)}
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-150
              ${isDisabled || (!input.trim() && !attachedFile)
                ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95"
              }`}
            title="Send (Enter)"
          >
            {isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Send className="h-3.5 w-3.5" />
            }
          </button>
        </div>
      </div>

      {/* Footer row */}
      <div className="mt-1.5 flex items-center justify-between px-1 min-h-[14px]">
        <p className="font-mono text-[9px] text-muted-foreground/70">
          {isPending ? (
            <span className="animate-pulse font-bold text-primary/70">
              GilaniAI is thinking…
            </span>
          ) : (
            "Shift+Enter for new line · PDF, DOCX, TXT supported"
          )}
        </p>
        {input.length > 0 && (
          <span className={`font-mono text-[9px] font-semibold tabular-nums transition-colors ${input.length > 3000 ? "text-amber-500" : "text-muted-foreground/70"
            }`}>
            {input.length.toLocaleString()} chars
          </span>
        )}
      </div>
    </div>
  );
}