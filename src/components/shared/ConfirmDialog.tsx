import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  destructive = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!busy ? onCancel : undefined}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4 z-10">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-xl shrink-0 ${destructive ? "bg-red-50 text-red-500" : "bg-primary/10 text-primary"}`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
              destructive
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
