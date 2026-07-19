import React from "react";
import {
  Timer,
  SquarePen,
  MoreVertical,
  Pencil,
  Download,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { AppHeader } from "@/client/components/layout/AppHeader";

type Thread = {
  id: string;
  title?: string | null;
  updated_at?: string | null;
};

type Props = {
  threadId?: string;
  threads: Thread[];
  userId: string | null; // Kept for prop backwards compatibility
  timerState: { minutes: number; seconds: number; running: boolean } | null;
  escalationStatus: "open" | "in_review" | "resolved" | null;
  sidebarOpen: boolean; // Kept for prop backwards compatibility
  setSidebarOpen: (open: boolean) => void; // Kept for prop backwards compatibility
  createNewThread: () => void;
  requestRenameThread: (id: string, currentTitle: string) => void;
  requestDeleteThread: (id: string) => void;
  setTimerOpen: (open: boolean) => void;
  handleExportPDF: () => void;
  setEscalateModalOpen: (open: boolean) => void;
};

export function ThreadHeader({
  threadId,
  threads,
  timerState,
  escalationStatus,
  createNewThread,
  requestRenameThread,
  requestDeleteThread,
  setTimerOpen,
  handleExportPDF,
  setEscalateModalOpen,
}: Props) {
  const currentTitle = threadId ? threads.find((th) => th.id === threadId)?.title : "";

  const timerContent = timerState ? (
    <div className="flex items-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-primary flex-shrink-0">
      <Timer className="h-3 w-3 animate-pulse" />
      <span className="font-mono">
        {String(timerState.minutes).padStart(2, "0")}:{String(timerState.seconds).padStart(2, "0")}
      </span>
    </div>
  ) : null;

  const combinedLeftContent = <div className="flex items-center gap-2">{timerContent}</div>;

  const actionsContent = (
    <>
      <button
        onClick={createNewThread}
        className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60 transition-colors"
        title="New Chat"
      >
        <SquarePen className="h-5 w-5" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60 transition-colors">
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {threadId && (
            <DropdownMenuItem
              onClick={() => requestRenameThread(threadId, currentTitle || "Untitled Chat")}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setTimerOpen(true)}>
            <Timer className="h-4 w-4 mr-2" />
            Study Timer
          </DropdownMenuItem>
          {threadId && (
            <DropdownMenuItem onClick={() => handleExportPDF()}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </DropdownMenuItem>
          )}
          {threadId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEscalateModalOpen(true)}>
                {escalationStatus === "resolved" ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : escalationStatus === "in_review" || escalationStatus === "open" ? (
                  <Clock className="h-4 w-4 mr-2 text-amber-500 animate-pulse" />
                ) : (
                  <ShieldAlert className="h-4 w-4 mr-2 text-amber-500" />
                )}
                {escalationStatus === "resolved"
                  ? "Teacher Reviewed"
                  : escalationStatus === "in_review" || escalationStatus === "open"
                    ? "Review Pending"
                    : "Escalate to Teacher"}
              </DropdownMenuItem>
            </>
          )}
          {threadId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => requestDeleteThread(threadId)}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Chat
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <AppHeader title={currentTitle} leftContent={combinedLeftContent} actions={actionsContent} />
  );
}
