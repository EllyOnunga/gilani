import { Loader2, ShieldAlert, X } from "lucide-react";

type Props = {
  teacherEmail: string;
  onEmailChange: (email: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isEscalating?: boolean;
  error?: string;
};

export function EscalateModal({
  teacherEmail,
  onEmailChange,
  onConfirm,
  onCancel,
  isEscalating,
  error,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl mb-safe overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-amber-50 dark:bg-amber-950/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-foreground leading-tight">
                Request Teacher Review
              </h3>
              <p className="font-mono text-[9px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
                Human oversight
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground hover:bg-black/5 transition-colors"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enter your teacher's email to send this conversation for review.
            They must be registered on GilaniAI.
          </p>

          <div className="space-y-1.5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Teacher Email <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              value={teacherEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="teacher@school.ac.ke"
              autoFocus
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors"
              required
            />
            {error && (
              <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
                ⚠ {error}
              </p>
            )}
            {!teacherEmail && !error && (
              <p className="text-[10px] text-muted-foreground">
                Your teacher will receive an email notification.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-3 border-t border-border bg-muted/20">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isEscalating || !teacherEmail.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60 transition-colors"
          >
            {isEscalating ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
            ) : (
              <><ShieldAlert className="h-3.5 w-3.5" /> Escalate</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
