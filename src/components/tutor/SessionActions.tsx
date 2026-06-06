import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Download,
  ListChecks,
  Loader2,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { useState } from "react";
import { PomodoroTimer } from "./PomodoroTimer";

const CURRICULA = [
  { value: "KCSE", label: "KCSE (KNEC)" },
  { value: "CBC", label: "CBC Curriculum" },
  { value: "8-4-4", label: "8-4-4 Standards" },
  { value: "IGCSE Cambridge", label: "IGCSE Cambridge" },
  { value: "IGCSE Edexcel", label: "IGCSE Edexcel" },
];

type Props = {
  curriculum: string;
  onCurriculumChange: (val: string) => void;
  escalationStatus: "open" | "in_review" | "resolved" | null;
  escalating: boolean;
  messagesLoading: boolean;
  onEscalate: () => void;
  onExportPDF: () => void;
  onExportWord: () => void;
  threadTitle: string;
  threadId: string;
  onClose?: () => void;
};

export function SessionActions({
  curriculum,
  onCurriculumChange,
  escalationStatus,
  escalating,
  messagesLoading,
  onEscalate,
  onExportPDF,
  onExportWord,
  threadTitle,
  threadId,
  onClose,
}: Props) {
  const navigate = useNavigate();
  const [timerOpen, setTimerOpen] = useState(false);

  return (
    <div className="space-y-3 pt-3 border-t border-border/50">
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground px-1">
        Session Actions
      </p>

      {/* Curriculum */}
      <div className="space-y-1">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground px-1">
          Curriculum
        </p>
        <select
          value={curriculum}
          onChange={(e) => onCurriculumChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {CURRICULA.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Pomodoro Timer */}
      <div>
        <PomodoroTimer open={timerOpen} onOpenChange={setTimerOpen} showTrigger={false} />
        <button
          onClick={() => setTimerOpen(true)}
          className="w-full flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          <Timer className="h-4 w-4" />
          Study Timer
        </button>
      </div>

      {/* Quiz */}
      <button
        onClick={() => {
          navigate({ to: "/quizzes", search: { topic: threadTitle } } as any);
          onClose?.();
        }}
        className="w-full flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
      >
        <ListChecks className="h-4 w-4" />
        Generate Quiz
      </button>

      {/* Export */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            onExportPDF();
            onClose?.();
          }}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          <Download className="h-4 w-4" />
          PDF
        </button>
        <button
          onClick={() => {
            onExportWord();
            onClose?.();
          }}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          <Download className="h-4 w-4" />
          Word
        </button>
      </div>

      {/* Escalation */}
      {threadId && (
        <div>
          {escalationStatus ? (
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                escalationStatus === "open"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : escalationStatus === "in_review"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-green-200 bg-green-50 text-green-700"
              }`}
            >
              {escalationStatus === "open" && (
                <>
                  <Clock className="h-4 w-4 animate-pulse" /> Pending Review
                </>
              )}
              {escalationStatus === "in_review" && (
                <>
                  <Clock className="h-4 w-4 animate-pulse" /> Teacher Reviewing
                </>
              )}
              {escalationStatus === "resolved" && (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Reviewed
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                onEscalate();
                onClose?.();
              }}
              disabled={escalating || messagesLoading}
              className="w-full flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              {escalating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              {escalating ? "Escalating..." : "Escalate to Teacher"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
