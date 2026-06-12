import { useEffect, useRef, useState } from "react";
import { Bell, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
};

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }: { data: Notification[] | null }) => {
        if (data) setNotifications(data);
      });

    const channelName = `notifications-${userId}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes" as any,
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    await (supabase as any)
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await (supabase as any).from("notifications").update({ read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) {
      navigate({ to: n.link as any });
    }
    setOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    // Prevent the notification click handler from firing
    e.stopPropagation();
    setDeleting(id);
    try {
      await (supabase as any).from("notifications").delete().eq("id", id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAll = async () => {
    await (supabase as any).from("notifications").delete().eq("user_id", userId);
    setNotifications([]);
  };

  const typeColors: Record<string, string> = {
    escalation: "bg-amber-50 border-amber-200 text-amber-700",
    success: "bg-green-50 border-green-200 text-green-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
    warning: "bg-red-50 border-red-200 text-red-700",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-mono uppercase tracking-wider text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    title="Clear all notifications"
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`group relative flex items-start border-b border-border/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    {/* Clickable content area */}
                    <button
                      onClick={() => handleClick(n)}
                      className="flex-1 text-left px-4 py-3 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider flex-shrink-0 ${typeColors[n.type] ?? typeColors.info}`}
                        >
                          {n.type}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${!n.read ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            {n.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                          <p className="font-mono text-[9px] text-muted-foreground/60 mt-1">
                            {new Date(n.created_at).toLocaleString("en-KE")}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="ml-auto flex-shrink-0 h-2 w-2 rounded-full bg-primary mt-1" />
                        )}
                      </div>
                    </button>

                    {/* Delete button — visible on hover */}
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      disabled={deleting === n.id}
                      title="Delete notification"
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex-shrink-0 p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all disabled:opacity-50"
                    >
                      {deleting === n.id ? (
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin block" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
