import { MessageCircle, Plus, Search, Trash2, X, Clock } from "lucide-react";
import { SessionActions } from "./SessionActions";

type Thread = {
  id: string;
  title?: string | null;
  updated_at?: string | null;
};

type Props = {
  threads: Thread[];
  threadId: string;
  threadsOpen: boolean;
  threadsLoading: boolean;
  threadsLoadError: string | null;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  onDeleteClick: (id: string) => void;
  onClose: () => void;
  // Session actions props
  escalationStatus: "open" | "in_review" | "resolved" | null;
  escalating: boolean;
  messagesLoading: boolean;
  onEscalate: () => void;
  onExportPDF: () => void;
  onExportWord: () => void;
  threadTitle: string;
};

export function ThreadSidebar({
  threads,
  threadId,
  threadsOpen,
  threadsLoading,
  threadsLoadError,
  searchQuery,
  onSearchChange,
  onSelectThread,
  onNewThread,
  onDeleteClick,
  onClose,
  escalationStatus,
  escalating,
  messagesLoading,
  onEscalate,
  onExportPDF,
  onExportWord,
  threadTitle,
}: Props) {
  const filtered = threads.filter((t) =>
    (t.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const SidebarInner = ({ showClose }: { showClose: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-primary">
          Sessions
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewThread}
            className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            title="New session"
          >
            <Plus className="h-3 w-3" /> New
          </button>
          {showClose && (
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/60" />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search sessions…"
          className="w-full rounded-lg border border-border bg-background pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Thread count */}
      {!threadsLoading && filtered.length > 0 && (
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-2 px-1">
          {filtered.length} session{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto space-y-0.5 -mx-1 px-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {threadsLoading && (
          <div className="flex flex-col gap-1.5 py-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        )}
        {threadsLoadError && (
          <p className="text-xs text-destructive text-center py-4 px-2">{threadsLoadError}</p>
        )}
        {!threadsLoading && filtered.length === 0 && (
          <div className="text-center py-5">
            <MessageCircle className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "No sessions match" : "No sessions yet"}
            </p>
          </div>
        )}
        {filtered.map((t) => {
          const isActive = t.id === threadId;
          const timeStr = t.updated_at
            ? (() => {
                const d = new Date(t.updated_at);
                const now = new Date();
                const diffMs = now.getTime() - d.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHrs = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHrs / 24);
                if (diffMins < 1) return "just now";
                if (diffMins < 60) return `${diffMins}m`;
                if (diffHrs < 24) return `${diffHrs}h`;
                if (diffDays < 7) return `${diffDays}d`;
                return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
              })()
            : null;
          return (
            <div
              key={t.id}
              className={`group relative flex items-center rounded-lg transition-all duration-150 ${
                isActive
                  ? "bg-primary/10 border border-primary/20 shadow-sm"
                  : "hover:bg-accent border border-transparent"
              }`}
            >
              <button
                onClick={() => { onSelectThread(t.id); onClose(); }}
                className="flex-1 text-left px-3 py-3 sm:py-2.5 min-w-0"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded-full flex items-center justify-center ${
                    isActive ? "bg-primary/20" : "bg-muted/60"
                  }`}>
                    <MessageCircle className={`h-3 w-3 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium truncate leading-tight ${
                      isActive ? "text-primary" : "text-foreground"
                    }`}>
                      {t.title || "Untitled session"}
                    </p>
                    {timeStr && (
                      <p className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground/60 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />{timeStr}
                      </p>
                    )}
                  </div>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteClick(t.id); }}
                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 p-2 sm:p-1.5 mr-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                title="Delete session"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Session Actions - mobile only, desktop has ChatHeader */}
      <div className="lg:hidden mt-3 border-t border-border pt-3">
        <SessionActions
          escalationStatus={escalationStatus}
          escalating={escalating}
          messagesLoading={messagesLoading}
          onEscalate={onEscalate}
          onExportPDF={onExportPDF}
          onExportWord={onExportWord}
          threadTitle={threadTitle}
          threadId={threadId}
          onClose={onClose}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — no close button */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-sidebar p-4 h-screen overflow-hidden sticky top-0 rounded-r-2xl">
        <SidebarInner showClose={false} />
      </aside>

      {/* Mobile overlay */}
      {threadsOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar — has close button */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(80%,18rem)] flex-col bg-sidebar border-r border-border p-4 transition-transform duration-300 ease-in-out overflow-y-auto [&::-webkit-scrollbar]:hidden lg:hidden rounded-r-2xl ${
          threadsOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarInner showClose={true} />
      </aside>
    </>
  );
}
