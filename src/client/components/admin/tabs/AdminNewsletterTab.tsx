import { useState } from "react";
import { Loader2, Mail, CheckCircle, Send, TrendingUp, Users } from "lucide-react";
import type { NewsletterSubscriber } from "@/client/components/admin/types";
import { supabase } from "@/client/supabase";
import { toast } from "sonner";

type Props = {
  newsletter: NewsletterSubscriber[];
};

export function AdminNewsletterTab({ newsletter }: Props) {
  const [nlSubject, setNlSubject] = useState("");
  const [nlBody, setNlBody] = useState("");
  const [nlSending, setNlSending] = useState(false);
  const [nlSent, setNlSent] = useState<{ sent: number; total: number } | null>(null);

  const handleSend = async () => {
    setNlSending(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          subject: nlSubject,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">${nlBody}</div>`,
          text: nlBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNlSent({ sent: data.sent, total: data.total });
      toast.success(`Sent to ${data.sent} subscribers!`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send");
    } finally {
      setNlSending(false);
    }
  };

  const activeCount = newsletter.filter((s) => s.status === "active").length;
  const thisWeekCount = newsletter.filter((s) => {
    const d = new Date(s.subscribed_at);
    return new Date().getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
          <Users className="mx-auto h-5 w-5 mb-2 text-primary" />
          <p className="font-serif text-2xl sm:text-3xl font-bold">{newsletter.length}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            Total
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
          <CheckCircle className="mx-auto h-5 w-5 mb-2 text-green-500" />
          <p className="font-serif text-2xl sm:text-3xl font-bold text-green-600">{activeCount}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            Active
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
          <TrendingUp className="mx-auto h-5 w-5 mb-2 text-blue-500" />
          <p className="font-serif text-2xl sm:text-3xl font-bold text-blue-600">{thisWeekCount}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            This Week
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3 sm:p-6 shadow-sm space-y-3">
        <h3 className="font-serif text-lg font-bold flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" /> Send Newsletter
        </h3>
        {nlSent ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
            <CheckCircle className="mx-auto h-6 w-6 text-emerald-600 mb-2" />
            <p className="font-bold text-emerald-700">Newsletter sent!</p>
            <p className="text-sm text-emerald-600">
              {nlSent.sent} of {nlSent.total} subscribers received it.
            </p>
            <button
              onClick={() => {
                setNlSent(null);
                setNlSubject("");
                setNlBody("");
              }}
              className="mt-3 text-xs font-mono underline text-muted-foreground"
            >
              Send another
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Subject
              </label>
              <input
                type="text"
                placeholder="e.g. 2026 Exam Revision Tips"
                value={nlSubject}
                onChange={(e) => setNlSubject(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Message (HTML supported)
              </label>
              <textarea
                rows={6}
                placeholder="Write your newsletter content here..."
                value={nlBody}
                onChange={(e) => setNlBody(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
            <button
              disabled={nlSending || !nlSubject || !nlBody}
              onClick={handleSend}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {nlSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Send to {activeCount} subscribers
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {newsletter.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-6 sm:py-14 text-center">
          <Mail className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="font-serif text-muted-foreground">No subscribers yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm min-w-[440px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Email", "Name", "Status", "Subscribed"].map((h) => (
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
                {newsletter.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs">{s.email}</td>
                    <td className="px-5 py-3 text-sm">{s.name ?? "—"}</td>
                    <td className="px-2 py-2 sm:px-5 sm:py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${s.status === "active" ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">
                      {new Date(s.subscribed_at).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border/50 bg-muted/20">
            <p className="font-mono text-[10px] text-muted-foreground">
              {newsletter.length} total subscribers
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
