import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface NoteStatusBadgeProps {
  status: string;
}

export function NoteStatusBadge({ status }: NoteStatusBadgeProps) {
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
        <Loader2 className="h-3 w-3 animate-spin" /> Processing
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        <AlertCircle className="h-3 w-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="h-3 w-3" /> Ready
    </span>
  );
}
