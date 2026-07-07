import { ThumbsUp, ThumbsDown } from "lucide-react";
import type { MessageFeedback } from "@/components/admin/types";
import { formatDate } from "@/components/admin/types";

type Props = {
  feedback: MessageFeedback[];
};

export function AdminFeedbackTab({ feedback }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
          <ThumbsUp className="mx-auto h-5 w-5 mb-2 text-green-500" />
          <p className="font-serif text-2xl sm:text-3xl font-bold">
            {feedback.filter((f) => f.vote === 1).length}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            Positive
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
          <ThumbsDown className="mx-auto h-5 w-5 mb-2 text-destructive" />
          <p className="font-serif text-2xl sm:text-3xl font-bold">
            {feedback.filter((f) => f.vote === -1).length}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            Negative
          </p>
        </div>
      </div>

      {feedback.length === 0 && (
        <div className="rounded-lg border border-border bg-card py-6 sm:py-14 text-center">
          <ThumbsUp className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="font-serif text-muted-foreground">No feedback yet</p>
        </div>
      )}

      {feedback.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm min-w-[460px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["User", "Vote", "Message ID", "Date"].map((h) => (
                    <th
                      key={h}
                      className="px-2 py-2 sm:px-5 sm:py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feedback.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-2 py-2 sm:px-5 sm:py-3">
                      <p className="font-semibold">{f.profiles?.display_name ?? "—"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {f.user_id?.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-2 py-2 sm:px-5 sm:py-3">
                      {f.vote === 1 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 px-1.5 py-px font-mono text-[9px] text-green-700">
                          <ThumbsUp className="h-3 w-3" /> Good
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 px-1.5 py-px font-mono text-[9px] text-red-700">
                          <ThumbsDown className="h-3 w-3" /> Bad
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-[10px] text-muted-foreground">
                      {f.message_id?.slice(0, 12)}…
                    </td>
                    <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">
                      {formatDate(f.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border/50 bg-muted/20">
            <p className="font-mono text-[10px] text-muted-foreground">
              {feedback.length} total responses
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
