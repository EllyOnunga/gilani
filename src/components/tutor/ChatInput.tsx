import { useEffect, useRef } from "react";
import {
  FileText,
  Loader2,
  Paperclip,
  Send,
  Trash2,
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

  // Auto-resize textarea when input changes (typing, pasting, clearing, or starter prompts)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      if (input !== "") {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
      }
    }
  }, [input]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  return (
    <div className="border-t border-border bg-background p-3 sm:p-4">
      {/* Attached file preview */}
      {attachedFile && (
        <div className="mb-2.5 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate text-foreground">{attachedFile.name}</p>
              <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                {(attachedFile.size / 1024).toFixed(1)} KB • Document text loaded
              </p>
            </div>
          </div>
          <button
            onClick={onRemoveFile}
            className="rounded-md p-1 hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
            title="Remove attachment"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="text-[10px] text-muted-foreground text-center px-4 py-1">
        GilaniAI may produce inaccurate information. Verify with official sources.
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* File attachment */}
        <input
          type="file"
          id="chat-file-attachment"
          className="hidden"
          accept=".pdf,.docx,.txt,.md,.csv"
          onChange={onFileChange}
          disabled={isPending || parsingFile}
        />
        <label
          htmlFor="chat-file-attachment"
          className={`flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-card shadow-sm hover:bg-accent transition-colors ${
            isPending || parsingFile ? "opacity-50 pointer-events-none" : ""
          }`}
          title="Attach a document (PDF, DOCX, TXT, MD, CSV)"
        >
          {parsingFile ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          )}
        </label>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="flex-1 min-h-[44px] max-h-36 resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
          rows={1}
          value={input}
          onChange={handleChange}
          placeholder={
            isPending
              ? "Waiting for response..."
              : isRateLimited
                ? "AI rate limit reached. Please wait a few minutes..."
                : "Ask a question… (Enter to send)"
          }
          disabled={isPending || parsingFile || isRateLimited}
          onKeyDown={handleKeyDown}
        />

        {/* Send Button */}
        <button
          onClick={(e) => onSubmit(e as any)}
          disabled={isPending || parsingFile || !input.trim() || isRateLimited}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          title="Send"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between mt-1.5 px-1 min-h-[14px]">
        <p className="font-mono text-[9px] text-muted-foreground">
          {isPending ? (
            <span className="text-primary/75 animate-pulse font-bold">
              GilaniAI is thinking… please wait
            </span>
          ) : isRateLimited ? (
            <span className="text-destructive font-bold">
              Rate limit reached — please wait a few minutes
            </span>
          ) : (
            "Shift+Enter for new line"
          )}
        </p>
        {input.length > 0 && (
          <span className="font-mono text-[9px] text-muted-foreground font-semibold">
            {input.length} characters
          </span>
        )}
      </div>
    </div>
  );
}
