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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  const handleClick = async (e: React.MouseEvent, n: Notification) => {
    // If it has a link, navigate immediately
    if (n.link) {
      if (!n.read) {
        await (supabase as any).from("notifications").update({ read: true }).eq("id", n.id);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      }
      navigate({ to: n.link as any });
      setOpen(false);
      return;
    }

    // Otherwise, just toggle expansion
    setExpandedId((prev) => (prev === n.id ? null : n.id));

    if (!n.read) {
      await (supabase as any).from("notifications").update({ read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
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
            <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
              {notifications.length === 0 ? (
                <div className="py-8 sm:py-12 text-center">
                  <Bell className="mx-auto h-8 w-8 text-muted-foreground/20 mb-3" />
                  <p className="text-xs font-medium text-muted-foreground">You're all caught up!</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-0 transition-colors ${!n.read ? "bg-primary/[0.04]" : "bg-card"}`}
                  >
                    {/* Clickable content area */}
                    <button
                      onClick={(e) => handleClick(e, n)}
                      className="flex-1 text-left px-4 py-3.5 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 flex flex-col items-center gap-1.5 pt-0.5">
                          <span
                            className={`rounded-full border px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider ${typeColors[n.type] ?? typeColors.info}`}
                          >
                            {n.type}
                          </span>
                          {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs font-semibold leading-snug ${!n.read ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            {n.title}
                          </p>
                          <p
                            className={`text-[11px] text-muted-foreground mt-0.5 leading-relaxed ${
                              expandedId === n.id ? "" : "line-clamp-2"
                            }`}
                          >
                            {n.message}
                          </p>
                          <p className="font-mono text-[9px] text-muted-foreground/50 mt-1.5">
                            {new Date(n.created_at).toLocaleString("en-KE", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Delete button — always visible */}
                    <div className="flex-shrink-0 flex items-center pr-2 self-center">
                      <button
                        onClick={(e) => handleDelete(e, n.id)}
                        disabled={deleting === n.id}
                        title="Delete notification"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-all duration-150 active:scale-90 disabled:opacity-50"
                      >
                        {deleting === n.id ? (
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin block" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
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
