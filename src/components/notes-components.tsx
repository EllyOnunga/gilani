import { useRef, useState } from "react";
import {
    Loader2,
    Upload,
    X,
    FileText,
    AlertCircle,
    Clock,
    CreditCard,
} from "lucide-react";
import { formatFileSize } from "@/hooks/notes-helpers";

// ─── Document Upload Zone ──────────────────────────────────────────────────────

export function DocumentUploadZone({
    parsingFile,
    onFileChange,
}: {
    parsingFile: boolean;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="relative rounded-xl border border-border bg-background p-2 sm:p-3 overflow-hidden">
            <input
                id="mobile-doc-upload"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,.md,.csv,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={onFileChange}
                onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
                disabled={parsingFile}
            />
            <label
                htmlFor="mobile-doc-upload"
                className={`flex w-full items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-sm font-semibold transition-colors ${parsingFile
                        ? "pointer-events-none cursor-not-allowed bg-muted text-muted-foreground opacity-50"
                        : "cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
                    }`}
            >
                {parsingFile ? (
                    <>
                        <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                        <span className="whitespace-nowrap">Parsing...</span>
                    </>
                ) : (
                    <>
                        <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline whitespace-nowrap">Upload Document (PDF, DOCX, TXT, CSV — max 2MB)</span>
                        <span className="sm:hidden whitespace-nowrap">Upload (max 2MB)</span>
                    </>
                )}
            </label>
        </div>
    );
}

// ─── Attached File Pill ────────────────────────────────────────────────────────

export function AttachedFilePill({
    file,
    onRemove,
}: {
    file: { name: string; size: number } | null;
    onRemove: () => void;
}) {
    if (!file) return null;

    return (
        <div className="mb-2 flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-primary/25 bg-primary/5 px-2 sm:px-3 py-1.5 sm:py-2">
            <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary flex-shrink-0" />
            <span className="truncate text-[10px] sm:text-xs font-semibold text-foreground flex-1">
                {file.name}{" "}
                <span className="font-mono text-[9px] sm:text-[10px] text-muted-foreground font-normal">
                    ({formatFileSize(file.size)})
                </span>
            </span>
            <button
                type="button"
                onClick={onRemove}
                className="flex-shrink-0 rounded-md sm:rounded-lg p-0.5 sm:p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors active:scale-95"
                title="Remove file"
            >
                <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
        </div>
    );
}

// ─── Error Banner ──────────────────────────────────────────────────────────────

export function ErrorBanner({
    error,
    onDismiss,
}: {
    error: string;
    onDismiss: () => void;
}) {
    return (
        <div className="flex items-start gap-2 sm:gap-2.5 rounded-lg sm:rounded-xl border border-destructive/20 bg-destructive/5 p-2.5 sm:p-3.5 text-left text-[10px] sm:text-xs dark:bg-destructive/10 dark:border-destructive/30 shadow-sm">
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <span className="font-semibold text-destructive dark:text-red-300">Upload Issue</span>
                <p className="text-destructive/80 dark:text-red-400/85 mt-0.5 font-medium leading-relaxed">
                    {error}
                </p>
            </div>
            <button
                type="button"
                onClick={onDismiss}
                className="rounded-md sm:rounded-lg p-0.5 sm:p-1 text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0 active:scale-95"
                title="Dismiss error"
            >
                <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
        </div>
    );
}

// ─── Rate Limit Banner ─────────────────────────────────────────────────────────

export function RateLimitBanner({
    error,
    secondsLeft,
    maxSeconds,
    isDaily,
    onDismiss,
}: {
    error: string;
    secondsLeft: number;
    maxSeconds: number;
    isDaily: boolean;
    onDismiss: () => void;
}) {
    return (
        <div className="rounded-xl border overflow-hidden border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/30">
            <div className="flex items-start gap-2 sm:gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3">
                <div className="flex-shrink-0 mt-0.5">
                    {secondsLeft > 0 ? (
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                        <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold text-amber-800 dark:text-amber-300">
                        {isDaily ? "Daily notes limit reached" : "Slow down a little…"}
                    </p>
                    <p className="text-[9px] sm:text-[11px] mt-0.5 text-amber-700/80 dark:text-amber-400/80">
                        {isDaily
                            ? `You've used your daily notes allowance.${secondsLeft > 0 ? ` Resets in ${secondsLeft}s.` : " Resets at midnight (EAT)."}`
                            : `You're saving notes too fast. Take a short break.${secondsLeft > 0 ? ` Try again in ${secondsLeft}s.` : ""}`}
                    </p>
                </div>
                <div className="flex-shrink-0 flex flex-col gap-1.5 sm:gap-2">
                    {secondsLeft > 0 && (
                        <div className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-md sm:rounded-lg bg-amber-500/20 px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold text-amber-900 dark:text-amber-300 tabular-nums border border-amber-500/30">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {secondsLeft}s
                        </div>
                    )}
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent("custom:open-plans"))}
                        className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-md sm:rounded-lg bg-primary px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
                    >
                        <CreditCard className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span className="hidden sm:inline">Upgrade</span>
                    </button>
                </div>
                <button
                    onClick={onDismiss}
                    className="flex-shrink-0 rounded-md sm:rounded-lg p-0.5 sm:p-1 text-muted-foreground hover:bg-muted transition-colors active:scale-95"
                    title="Dismiss"
                >
                    <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </button>
            </div>
            {secondsLeft > 0 && maxSeconds > 0 && (
                <div className="h-0.5 bg-amber-200/50 dark:bg-amber-800/50">
                    <div
                        className="h-full bg-amber-400 dark:bg-amber-500 transition-all duration-1000 ease-linear"
                        style={{ width: `${Math.min(100, (secondsLeft / maxSeconds) * 100)}%` }}
                    />
                </div>
            )}
        </div>
    );
}