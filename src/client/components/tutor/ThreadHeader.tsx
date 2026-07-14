import React from "react";
import {
  PanelLeftOpen,
  PanelLeftClose,
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
import { NotificationBell } from "@/client/components/notifications";

type Thread = {
  id: string;
  title?: string | null;
  updated_at?: string | null;
};

type Props = {
  threadId?: string;
  threads: Thread[];
  userId: string | null;
  timerState: { minutes: number; seconds: number; running: boolean } | null;
  escalationStatus: "open" | "in_review" | "resolved" | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
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
  userId,
  timerState,
  escalationStatus,
  sidebarOpen,
  setSidebarOpen,
  createNewThread,
  requestRenameThread,
  requestDeleteThread,
  setTimerOpen,
  handleExportPDF,
  setEscalateModalOpen,
}: Props) {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-background px-4 sticky top-0 z-30 gap-2 min-w-0">
      <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-full p-2 text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground active:scale-95 flex-shrink-0 lg:hidden"
          title={sidebarOpen ? "Close Menu" : "Open Menu"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" strokeWidth={2.25} />
          ) : (
            <PanelLeftOpen className="h-5 w-5" strokeWidth={2.25} />
          )}
        </button>
        {timerState ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-primary flex-shrink-0">
            <Timer className="h-3 w-3 animate-pulse" />
            <span className="font-mono">
              {String(timerState.minutes).padStart(2, "0")}:
              {String(timerState.seconds).padStart(2, "0")}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex-1 flex justify-center min-w-0 px-2">
        <h2 className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-[400px]">
          {(() => {
            const t = threadId ? threads.find((th) => th.id === threadId)?.title : "";
            return t || "";
          })()}
        </h2>
      </div>

      <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
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
                onClick={() => {
                  const t = threads.find((th) => th.id === threadId)?.title;
                  requestRenameThread(threadId, t || "Untitled Chat");
                }}
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

        {userId ? <NotificationBell userId={userId} /> : null}
      </div>
    </header>
  );
}
