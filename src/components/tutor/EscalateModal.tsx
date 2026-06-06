import { Loader2 } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 mb-safe">
        <h3 className="font-serif text-lg font-bold text-foreground">Escalate to Teacher</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Enter your teacher's email address to send this conversation directly to them for review.
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
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          {!teacherEmail && (
            <p className="text-[10px] text-muted-foreground">
              You must enter your teacher's email to escalate.
            </p>
          )}
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isEscalating || !teacherEmail.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {isEscalating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Escalate
          </button>
        </div>
      </div>
    </div>
  );
}
