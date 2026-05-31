import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
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
            }
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
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <h3 className="font-semibold text-sm">Notifications</h3>
                            {unread > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-[10px] font-mono uppercase tracking-wider text-primary hover:underline"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                                    <p className="text-xs text-muted-foreground">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <button
                                        key={n.id}
                                        onClick={() => handleClick(n)}
                                        className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-accent transition-colors ${!n.read ? "bg-primary/5" : ""}`}
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
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
