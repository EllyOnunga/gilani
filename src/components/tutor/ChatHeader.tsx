import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Download,
  FileDown,
  ListChecks,
  Loader2,
  Menu,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { useState } from "react";
import { PomodoroTimer } from "./PomodoroTimer";
import { ExportMenu } from "./ExportModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
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

      {/* Persistent PomodoroTimer instance (hidden trigger on desktop, controlled by state on mobile) */}
      <PomodoroTimer open={timerDialogOpen} onOpenChange={setTimerDialogOpen} showTrigger={false} />

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
        {/* Curriculum Selector (Always visible) */}
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

        {/* ─── DESKTOP ACTIONS (hidden on mobile) ─── */}
        <div className="hidden sm:flex items-center gap-1.5">
          {/* Pomodoro Timer (Desktop Trigger) */}
          <PomodoroTimer />

          {/* Quiz Button */}
          <button
            onClick={() => navigate({ to: "/quizzes", search: { topic: threadTitle } } as any)}
            className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-accent transition-colors"
            title="Generate a quiz from this session"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span>Quiz</span>
          </button>

          {/* Export */}
          <ExportMenu onExportPDF={onExportPDF} onExportWord={onExportWord} />

          {/* Escalation Status */}
          {escalationStatus === "open" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-amber-700">
              <Clock className="h-3 w-3 animate-pulse" /> Pending
            </span>
          )}
          {escalationStatus === "in_review" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-blue-700">
              <Clock className="h-3 w-3 animate-pulse" /> Reviewing
            </span>
          )}
          {escalationStatus === "resolved" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-green-700">
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
              <span>{escalating ? "Escalating..." : "Escalate"}</span>
            </button>
          )}
        </div>

        {/* ─── MOBILE ACTIONS MENU (hidden on desktop) ─── */}
        <div className="sm:hidden flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-accent transition-colors"
                title="Tutor Session Menu"
              >
                <Menu className="h-3.5 w-3.5" />
                <span>Menu</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border border-border p-1">
              {/* Pomodoro Timer Option */}
              <DropdownMenuItem onClick={() => setTimerDialogOpen(true)} className="cursor-pointer">
                <Timer className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Study Timer</span>
              </DropdownMenuItem>

              {/* Quiz Generation Option */}
              <DropdownMenuItem
                onClick={() => navigate({ to: "/quizzes", search: { topic: threadTitle } } as any)}
                className="cursor-pointer"
              >
                <ListChecks className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Quiz Session</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="border-t border-border/50 my-1" />

              {/* Export PDF */}
              <DropdownMenuItem onClick={onExportPDF} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Export as PDF</span>
              </DropdownMenuItem>

              {/* Export Word */}
              <DropdownMenuItem onClick={onExportWord} className="cursor-pointer">
                <Download className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Export as Word</span>
              </DropdownMenuItem>

              {/* Escalation Menu Items */}
              {threadId && (
                <>
                  <DropdownMenuSeparator className="border-t border-border/50 my-1" />
                  {escalationStatus ? (
                    <DropdownMenuItem disabled className="opacity-70">
                      {escalationStatus === "open" && (
                        <>
                          <Clock className="mr-2 h-4 w-4 text-amber-500 animate-pulse" />
                          <span>Status: Pending</span>
                        </>
                      )}
                      {escalationStatus === "in_review" && (
                        <>
                          <Clock className="mr-2 h-4 w-4 text-blue-500 animate-pulse" />
                          <span>Status: Reviewing</span>
                        </>
                      )}
                      {escalationStatus === "resolved" && (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                          <span>Status: Reviewed</span>
                        </>
                      )}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={onEscalate}
                      disabled={escalating || messagesLoading}
                      className="cursor-pointer text-amber-600 focus:text-amber-700"
                    >
                      {escalating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <ShieldAlert className="mr-2 h-4 w-4 text-amber-500" />
                      )}
                      <span>{escalating ? "Escalating..." : "Escalate to Teacher"}</span>
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
