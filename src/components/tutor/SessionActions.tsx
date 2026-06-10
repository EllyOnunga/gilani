import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Download,
  ListChecks,
  Loader2,
  MoreHorizontal,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className="pt-3 border-t border-border/50">
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground px-1 mb-2">
        Session
      </p>

      {/* Curriculum select + actions menu */}
      <div className="flex items-center gap-1.5">
        <select
          value={curriculum}
          onChange={(e) => onCurriculumChange(e.target.value)}
          className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {CURRICULA.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        {/* ··· menu button */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center justify-center rounded-lg border border-border bg-background p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Session actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute bottom-full right-0 mb-1 w-48 rounded-lg border border-border bg-popover shadow-md z-50 py-1 text-xs">

              {/* Study Timer */}
              <button
                onClick={() => { setTimerOpen(true); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Timer className="h-3.5 w-3.5" />
                Study Timer
              </button>

              {/* Quiz */}
              <button
                onClick={() => {
                  navigate({ to: "/quizzes", search: { topic: threadTitle } } as any);
                  setMenuOpen(false);
                  onClose?.();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <ListChecks className="h-3.5 w-3.5" />
                Generate Quiz
              </button>

              <div className="my-1 border-t border-border/50" />

              {/* Export PDF */}
              <button
                onClick={() => { onExportPDF(); setMenuOpen(false); onClose?.(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export PDF
              </button>

              {/* Export Word */}
              <button
                onClick={() => { onExportWord(); setMenuOpen(false); onClose?.(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export Word
              </button>

              {/* Escalation */}
              {threadId && (
                <>
                  <div className="my-1 border-t border-border/50" />
                  {escalationStatus ? (
                    <div
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-medium ${
                        escalationStatus === "open"
                          ? "text-amber-700"
                          : escalationStatus === "in_review"
                            ? "text-blue-700"
                            : "text-green-700"
                      }`}
                    >
                      {escalationStatus === "open" && <><Clock className="h-3.5 w-3.5 animate-pulse" /> Pending Review</>}
                      {escalationStatus === "in_review" && <><Clock className="h-3.5 w-3.5 animate-pulse" /> Teacher Reviewing</>}
                      {escalationStatus === "resolved" && <><CheckCircle2 className="h-3.5 w-3.5" /> Reviewed</>}
                    </div>
                  ) : (
                    <button
                      onClick={() => { onEscalate(); setMenuOpen(false); onClose?.(); }}
                      disabled={escalating || messagesLoading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
                    >
                      {escalating
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <ShieldAlert className="h-3.5 w-3.5" />}
                      {escalating ? "Escalating..." : "Escalate to Teacher"}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <PomodoroTimer open={timerOpen} onOpenChange={setTimerOpen} showTrigger={false} />
    </div>
  );
}
