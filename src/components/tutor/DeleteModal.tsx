import { Loader2 } from "lucide-react";

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
};

export function DeleteModal({ onConfirm, onCancel, isDeleting }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 mb-safe">
        <h3 className="font-serif text-lg font-bold text-foreground">Delete Study Session?</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Are you sure you want to permanently delete this study session? This will erase all
          message history and cannot be undone.
        </p>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60 transition-colors"
          >
            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
