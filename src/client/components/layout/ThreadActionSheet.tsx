import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/client/components/ui/dialog";
import { ShieldAlert, Clock, CheckCircle2, Pencil, Download, Trash2, Loader2 } from "lucide-react";
import type { Thread } from "@/client/components/layout/hooks/useAuthedShell";

type Props = {
  thread: Thread;
  escalationStatus: "open" | "in_review" | "resolved" | null;
  isExporting: boolean;
  onClose: () => void;
  onRename: () => void;
  onExport: () => void;
  onEscalate: () => void;
  onDelete: () => void;
};

export function ThreadActionSheet({
  thread,
  escalationStatus,
  isExporting,
  onClose,
  onRename,
  onExport,
  onEscalate,
  onDelete,
}: Props) {
  const escalateLabel =
    escalationStatus === "resolved"
      ? "Teacher Reviewed"
      : escalationStatus === "in_review" || escalationStatus === "open"
        ? "Review Pending"
        : "Escalate to Teacher";

  const EscalateIcon =
    escalationStatus === "resolved"
      ? CheckCircle2
      : escalationStatus === "in_review" || escalationStatus === "open"
        ? Clock
        : ShieldAlert;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-xs rounded-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="truncate text-sm font-semibold">
            {thread.title || "Untitled Chat"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 flex flex-col">
          <button
            onClick={onEscalate}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
          >
            <EscalateIcon
              className={`h-4 w-4 ${escalationStatus === "resolved" ? "text-green-500" : "text-amber-500"} ${escalationStatus === "in_review" || escalationStatus === "open" ? "animate-pulse" : ""}`}
            />
            {escalateLabel}
          </button>
          <button
            onClick={onRename}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
          >
            <Pencil className="h-4 w-4" /> Rename
          </button>
          <button
            onClick={onExport}
            disabled={isExporting}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExporting ? "Exporting..." : "Export as PDF"}
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
