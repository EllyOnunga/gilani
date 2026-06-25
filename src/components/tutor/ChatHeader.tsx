import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Clock, Download, Loader2, Menu, ShieldAlert } from "lucide-react";
import { PomodoroTimer } from "./PomodoroTimer";
import { ExportMenu } from "./ExportModal";

type Props = {
  title: string;
  escalationStatus: "open" | "in_review" | "resolved" | null;
  escalating: boolean;
  messagesLoading: boolean;
  onEscalate: () => void;
  onExportPDF: () => void;
  onExportWord: () => void;
  threadId: string;
  threadTitle: string;
};

export function ChatHeader({
  title,
  escalationStatus,
  escalating,
  messagesLoading,
  onEscalate,
  onExportPDF,
  onExportWord,
  threadId,
  threadTitle,
  className,
}: Props & { className?: string }) {
  const navigate = useNavigate();

  return (
    <div className={`flex items-center justify-between border-b border-border bg-card px-3 sm:px-5 py-2.5 gap-2 min-w-0 ${className ?? ""}`}>
      {/* Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("custom:open-sidebar"))}
          className="lg:hidden rounded-md p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground flex-shrink-0"
          title="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate leading-tight">{title || "New session"}</h2>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5 hidden sm:block">
            Socratic Study Session
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Pomodoro — hidden on xs */}
        <div className="hidden sm:block">
          <PomodoroTimer />
        </div>

        {/* Export */}
        <ExportMenu onExportPDF={onExportPDF} onExportWord={onExportWord} />

        {/* Escalation Status badges */}
        {escalationStatus === "open" && (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <Clock className="h-2.5 w-2.5 animate-pulse" /> Pending
          </span>
        )}
        {escalationStatus === "in_review" && (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <Clock className="h-2.5 w-2.5 animate-pulse" /> Reviewing
          </span>
        )}
        {escalationStatus === "resolved" && (
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-2.5 w-2.5" /> Reviewed
          </span>
        )}

        {/* Escalate Button */}
        {!escalationStatus && threadId && (
          <button
            onClick={onEscalate}
            disabled={escalating || messagesLoading}
            className="flex items-center gap-1 rounded-lg border border-amber-200/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/60 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 disabled:opacity-50 transition-colors"
            title="Request teacher review"
          >
            {escalating
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <ShieldAlert className="h-3 w-3" />
            }
            <span className="hidden sm:inline">{escalating ? "Escalating…" : "Escalate"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
