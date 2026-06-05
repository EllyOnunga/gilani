import { MessageCircle, Plus, Search, Trash2, X } from "lucide-react";
import { SessionActions } from "./SessionActions";

type Thread = {
  id: string;
  title?: string | null;
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
  curriculum: string;
  onCurriculumChange: (val: string) => void;
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
  curriculum,
  onCurriculumChange,
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

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-serif text-lg font-bold text-primary">Sessions</span>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* New Thread Button */}
      <button
        onClick={onNewThread}
        className="flex items-center gap-2 w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors mb-3"
      >
        <Plus className="h-4 w-4" />
        New Chat
      </button>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search sessions..."
          className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {threadsLoading && (
          <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
        )}
        {threadsLoadError && (
          <p className="text-xs text-destructive text-center py-4">{threadsLoadError}</p>
        )}
        {!threadsLoading && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No sessions found</p>
        )}
        {filtered.map((t) => (
          <div
            key={t.id}
            className={`group relative flex items-center justify-between rounded-lg transition-colors ${t.id === threadId
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent"
              }`}
          >
            <button
              onClick={() => onSelectThread(t.id)}
              className="flex-1 text-left px-3 py-2.5 min-w-0"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-sm truncate">{t.title || "Untitled"}</span>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(t.id);
              }}
              className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 p-1.5 mr-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
              title="Delete conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <SessionActions
        curriculum={curriculum}
        onCurriculumChange={onCurriculumChange}
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
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-sidebar p-4 h-full overflow-hidden">
        {SidebarContent}
      </aside>

      {/* Mobile overlay */}
      {threadsOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar border-r border-border p-4 transition-transform duration-300 ease-in-out lg:hidden ${threadsOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {SidebarContent}
      </aside>
    </>
  );
}
