import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Download,
  FileDown,
  ListChecks,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { PomodoroTimer } from "./PomodoroTimer";
import { ExportMenu } from "./ExportModal";

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
}: Props) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2.5 sm:px-6 sm:py-3.5 gap-2">
      {/* Title */}
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold truncate">{title}</h2>
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5 hidden sm:block">
          Curriculum Grounded Assistant
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
        {/* Curriculum Selector */}
        <select
          value={curriculum}
          onChange={(e) => onCurriculumChange(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-accent transition-colors max-w-[90px] sm:max-w-none"
          title="Select your study curriculum standards"
        >
          <option value="KCSE">KCSE</option>
          <option value="CBC">CBC</option>
          <option value="8-4-4">8-4-4</option>
          <option value="IGCSE Cambridge">Cambridge</option>
          <option value="IGCSE Edexcel">Edexcel</option>
        </select>

        {/* Pomodoro Timer */}
        <PomodoroTimer />

        {/* Quiz Button */}
        <button
          onClick={() => navigate({ to: "/quizzes", search: { topic: threadTitle } } as any)}
          className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-accent transition-colors"
          title="Generate a quiz from this session"
        >
          <ListChecks className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Quiz</span>
        </button>

        {/* Export */}
        <ExportMenu onExportPDF={onExportPDF} onExportWord={onExportWord} />

        {/* Escalation Status */}
        {escalationStatus === "open" && (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-amber-700">
            <Clock className="h-3 w-3 animate-pulse" /> Pending
          </span>
        )}
        {escalationStatus === "in_review" && (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-blue-700">
            <Clock className="h-3 w-3 animate-pulse" /> Reviewing
          </span>
        )}
        {escalationStatus === "resolved" && (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-green-700">
            <CheckCircle2 className="h-3 w-3" /> Reviewed
          </span>
        )}

        {/* Escalate Button */}
        {!escalationStatus && threadId && (
          <button
            onClick={onEscalate}
            disabled={escalating || messagesLoading}
            className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider hover:bg-accent disabled:opacity-50 transition-colors"
            title="Escalate this study session to a human teacher for review"
          >
            {escalating ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
              <ShieldAlert className="h-3 w-3 text-amber-500" />
            )}
            <span className="hidden sm:inline">{escalating ? "Escalating..." : "Escalate"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
