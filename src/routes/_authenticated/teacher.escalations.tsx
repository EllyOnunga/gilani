import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, CheckCircle2, MessageSquare, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Escalation = {
  id: string;
  conversation_id: string | null;
  reason: string;
  status: string;
  detail: string | null;
  created_at: string;
  user_id: string;
};

// ─── Server Functions ──────────────────────────────────────────────────────────

const listEscalations = createServerFn({ method: "GET" }).handler(async () => {
  // SECURITY: Check if user is teacher/admin
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Not authenticated");
  }
  
  const { data: roleCheck } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .in('role', ['teacher', 'admin'])
    .single();
  
  if (!roleCheck) {
    throw new Error("Forbidden: Teacher access required");
  }
  
  const { data, error } = await supabaseAdmin
    .from("escalations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
});

const resolveEscalation = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), expertAnswer: z.string() }))
  .handler(async ({ data }) => {
    const { id, expertAnswer } = data;
    
    // SECURITY: Check if user is teacher/admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error("Unauthorized: Not authenticated");
    }
    
    const { data: roleCheck } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .in('role', ['teacher', 'admin'])
      .single();
    
    if (!roleCheck) {
      throw new Error("Forbidden: Teacher access required");
    }
    
    const { error } = await supabaseAdmin
      .from("escalations")
      .update({ status: "resolved", detail: expertAnswer } as any)
      .eq("id", id);
    if (error) throw new Error(error.message);
  });

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/teacher/escalations")({
  head: () => ({ meta: [{ title: "Escalations — GilaniAI" }] }),
  beforeLoad: async () => {
    // SECURITY: Check teacher role before allowing access
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    
    const { data: roleCheck } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .in('role', ['teacher', 'admin'])
      .single();
    
    if (!roleCheck) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => listEscalations(),
  component: EscalationsPage,
});

// ─── Component ─────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  distress_keyword: { label: "Distress keyword", color: "text-red-600 bg-red-50 border-red-200" },
  student_request: { label: "Student request", color: "text-amber-600 bg-amber-50 border-amber-200" },
  low_confidence: { label: "Low confidence", color: "text-blue-600 bg-blue-50 border-blue-200" },
};

function EscalationsPage() {
  const initial = Route.useLoaderData() as Escalation[];
  const [escalations, setEscalations] = useState<Escalation[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  const open = (id: string) => {
    setActiveId(id);
    const existing = escalations.find((e) => e.id === id);
    setAnswer(existing?.detail ?? "");
  };

  const handleResolve = async (id: string) => {
    if (!answer.trim()) { toast.error("Please write an expert answer first."); return; }
    setSaving(true);
    try {
      await resolveEscalation({ data: { id, expertAnswer: answer } });
      setEscalations((prev) =>
        prev.map((e) => e.id === id ? { ...e, status: "resolved", detail: answer } : e)
      );
      setActiveId(null);
      toast.success("Escalation resolved.");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to resolve");
    } finally {
      setSaving(false);
    }
  };

  const pending = escalations.filter((e) => e.status !== "resolved");
  const resolved = escalations.filter((e) => e.status === "resolved");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8 lg:p-12">
      {/* Header */}
      <header className="animate-in-slide">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          Teacher Portal
        </p>
        <h2 className="mt-1 font-serif text-3xl sm:text-4xl">Student Escalations</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review flagged conversations and provide expert guidance to students.
        </p>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total", value: escalations.length, icon: MessageSquare },
          { label: "Pending", value: pending.length, icon: Clock },
          { label: "Resolved", value: resolved.length, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
            <Icon className="mx-auto h-5 w-5 text-primary mb-2" />
            <p className="font-serif text-3xl font-bold">{value}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {escalations.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 sm:p-16 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-serif text-xl text-muted-foreground">No escalations yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Flagged conversations will appear here automatically.
          </p>
        </div>
      )}

      {/* Pending escalations */}
      {pending.length > 0 && (
        <section className="space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Pending ({pending.length})
          </p>
          {pending.map((esc) => {
            const reasonMeta = REASON_LABELS[esc.reason] ?? { label: esc.reason, color: "text-muted-foreground bg-muted border-border" };
            const isOpen = activeId === esc.id;
            return (
              <div
                key={esc.id}
                className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between p-4 sm:p-5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${reasonMeta.color}`}>
                        {reasonMeta.label}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        Thread: {esc.conversation_id ? esc.conversation_id.slice(0, 8) : ""}…
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {esc.created_at
                        ? new Date(esc.created_at).toLocaleString("en-KE")
                        : "—"}
                    </p>
                  </div>
                  <button
                    onClick={() => isOpen ? setActiveId(null) : open(esc.id)}
                    className="flex-shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors"
                  >
                    {isOpen ? "Collapse" : "Respond"}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-border px-5 pb-5 pt-4 space-y-3 animate-in-slide">
                    <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground block">
                      Expert Answer
                    </label>
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      rows={5}
                      placeholder="Write a clear, educational response that will help the student…"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setActiveId(null)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResolve(esc.id)}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60 hover:bg-primary/90 transition-colors"
                      >
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Resolved escalations */}
      {resolved.length > 0 && (
        <section className="space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Resolved ({resolved.length})
          </p>
          {resolved.map((esc) => (
            <div
              key={esc.id}
              className="rounded-xl border border-green-200 bg-green-50/60 p-4 opacity-80"
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  Thread: {esc.conversation_id ? esc.conversation_id.slice(0, 8) : ""}…
                </span>
                <span className="rounded-full border border-green-300 bg-green-100 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-green-700">
                  Resolved
                </span>
              </div>
              {esc.detail && (
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  "{esc.detail.slice(0, 200)}{esc.detail.length > 200 ? "…" : ""}"
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
