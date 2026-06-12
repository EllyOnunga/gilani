import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Clock, Download, ListChecks, Loader2, ShieldAlert } from "lucide-react";
import { PomodoroTimer } from "./PomodoroTimer";
import { ExportMenu } from "./ExportModal";

const CURRICULA = [
  { value: "KCSE", label: "KCSE (KNEC)" },
  { value: "CBC", label: "CBC Curriculum" },
  { value: "8-4-4", label: "8-4-4 Standards" },
  { value: "IGCSE Cambridge", label: "IGCSE Cambridge" },
  { value: "IGCSE Edexcel", label: "IGCSE Edexcel" },
];

type Props = {
  title: string;
  curriculum: string;
  onCurriculumChange: (val: string) => void;
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
  curriculum,
  onCurriculumChange,
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
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold truncate leading-tight">{title || "New session"}</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5 hidden sm:block">
          {curriculum} · Curriculum-grounded AI
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Curriculum Selector */}
        <select
          value={curriculum}
          onChange={(e) => onCurriculumChange(e.target.value)}
          className="hidden sm:block rounded-lg border border-border bg-background px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-accent transition-colors"
          title="Select your study curriculum"
        >
          {CURRICULA.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {/* Pomodoro — hidden on xs */}
        <div className="hidden sm:block">
          <PomodoroTimer />
        </div>

        {/* Quiz Button */}
        <button
          onClick={() => navigate({ to: "/quizzes", search: { topic: threadTitle } } as any)}
          className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-accent transition-colors"
          title="Generate a quiz from this session"
        >
          <ListChecks className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Quiz</span>
        </button>

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
