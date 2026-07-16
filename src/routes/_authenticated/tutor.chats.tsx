import React, { useEffect, useState, useCallback } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/client/supabase";
import { Plus, MessageSquare, Loader2, Search, Trash2, ChevronRight, Menu } from "lucide-react";
import { toast } from "sonner";
import { useLayout } from "@/client/contexts/layout-context";
import { AppHeader } from "@/client/components/layout/AppHeader";

export const Route = createFileRoute("/_authenticated/tutor/chats")({
  component: ChatsPage,
});

type Thread = {
  id: string;
  title?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function groupByDate(threads: Thread[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last7 = new Date(today);
  last7.setDate(last7.getDate() - 7);

  const groups: { today: Thread[]; yesterday: Thread[]; last7Days: Thread[]; older: Thread[] } = {
    today: [],
    yesterday: [],
    last7Days: [],
    older: [],
  };

  for (const t of threads) {
    const d = t.updated_at ? new Date(t.updated_at) : new Date(0);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups.today.push(t);
    else if (day >= yesterday) groups.yesterday.push(t);
    else if (day >= last7) groups.last7Days.push(t);
    else groups.older.push(t);
  }
  return groups;
}

function ChatsPage() {
  const navigate = useNavigate();
  const { setSidebarOpen } = useLayout();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data?.session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }
      supabase
        .from("conversations")
        .select("id,title,updated_at,created_at")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false })
        .then(({ data: rows, error }) => {
          if (!error && rows) setThreads(rows as Thread[]);
          setLoading(false);
        });
    });
  }, []);

  const createNewThread = useCallback(() => {
    navigate({ to: "/tutor", search: { new: "1" } } as any);
  }, [navigate]);

  const deleteThread = useCallback(async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    try {
      const { error } = await supabase.from("conversations").delete().eq("id", id);
      if (error) throw error;
      setThreads((prev) => prev.filter((t) => t.id !== id));
      toast.success("Chat deleted");
    } catch {
      toast.error("Failed to delete chat");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const filtered = search.trim()
    ? threads.filter((t) => (t.title || "").toLowerCase().includes(search.toLowerCase()))
    : threads;

  const groups = groupByDate(filtered);
  const GROUP_LABELS = {
    today: "Today",
    yesterday: "Yesterday",
    last7Days: "Last 7 Days",
    older: "Older",
  } as const;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Top Bar */}
      <AppHeader
        title="Chats"
        actions={
          <button
            onClick={createNewThread}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-all active:scale-[0.97] flex-shrink-0"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        }
      />

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Loading chats…
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search ? "No chats match your search" : "No chats yet — start a new one!"}
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {(Object.keys(groups) as Array<keyof typeof groups>).map((key) => {
              const group = groups[key];
              if (group.length === 0) return null;
              return (
                <div key={key}>
                  <h2 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest font-mono mb-2 px-1 border-b border-border/20 pb-1">
                    {GROUP_LABELS[key]}
                  </h2>
                  <div className="space-y-1">
                    {group.map((t) => (
                      <Link
                        key={t.id}
                        to="/tutor/$threadId"
                        params={{ threadId: t.id } as any}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/30 transition-colors group"
                      >
                        <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {t.title || ""}
                          </p>
                          {t.updated_at && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(t.updated_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => deleteThread(t.id, e)}
                            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete chat"
                          >
                            {deletingId === t.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
