import { Loader2, MessageSquare, Mail, Clock } from "lucide-react";
import type { ContactMessage } from "@/client/components/admin/types";
import { STATUS_META, formatDate } from "@/client/components/admin/types";

type Props = {
  messages: ContactMessage[];
  expandedMsg: string | null;
  setExpandedMsg: (id: string | null) => void;
  updatingMsg: string | null;
  handleStatusChange: (id: string, status: "unread" | "read" | "resolved") => void;
};

export function AdminMessagesTab({
  messages,
  expandedMsg,
  setExpandedMsg,
  updatingMsg,
  handleStatusChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {(["unread", "read", "resolved"] as const).map((s) => (
          <div
            key={s}
            className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm"
          >
            <p className="font-serif text-2xl sm:text-3xl font-bold">
              {messages.filter((m) => m.status === s).length}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1 capitalize">
              {s}
            </p>
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="rounded-lg border border-border bg-card py-6 sm:py-14 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="font-serif text-muted-foreground">No messages yet</p>
        </div>
      )}

      {messages.map((m) => {
        const statusMeta = STATUS_META[m.status] ?? STATUS_META.unread;
        const isExpanded = expandedMsg === m.id;
        const isUpdating = updatingMsg === m.id;
        return (
          <div
            key={m.id}
            className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-colors ${m.status === "unread" ? "border-primary/30" : "border-border"}`}
          >
            <div
              className="flex items-start gap-3 px-3 py-3 sm:px-5 sm:py-4 cursor-pointer hover:bg-accent/20 transition-colors"
              onClick={() => setExpandedMsg(isExpanded ? null : m.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{m.name}</p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusMeta.color}`}
                  >
                    {statusMeta.label}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {m.category}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{m.email}</p>
                {m.subject && (
                  <p className="text-xs text-foreground mt-1 font-medium">{m.subject}</p>
                )}
                {!isExpanded && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{m.message}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(m.created_at)}
                </div>
                <span className="text-muted-foreground text-xs">{isExpanded ? "▲" : "▼"}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-border/50 space-y-3">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pt-4">
                  {m.message}
                </p>
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-2">
                    Mark as:
                  </p>
                  {(["unread", "read", "resolved"] as const).map((s) => (
                    <button
                      key={s}
                      disabled={m.status === s || isUpdating}
                      onClick={() => handleStatusChange(m.id, s)}
                      className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${STATUS_META[s].color} hover:opacity-80`}
                    >
                      {isUpdating && m.status !== s ? (
                        <Loader2 className="h-3 w-3 animate-spin inline" />
                      ) : (
                        s
                      )}
                    </button>
                  ))}
                  <a
                    href={`mailto:${m.email}`}
                    className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Mail className="h-3 w-3" /> Reply
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
