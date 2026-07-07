import { CheckCircle2 } from "lucide-react";
import type { Escalation } from "@/components/admin/types";
import { formatDate } from "@/components/admin/types";

type Props = {
  escalations: Escalation[];
  filteredEscalations: Escalation[];
  escalationFilter: "all" | "open" | "resolved" | "pending";
  setEscalationFilter: (v: "all" | "open" | "resolved" | "pending") => void;
};

export function AdminEscalationsTab({
  escalations,
  filteredEscalations,
  escalationFilter,
  setEscalationFilter,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {(["open", "pending", "resolved"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setEscalationFilter(s === escalationFilter ? "all" : s)}
            className={`rounded-lg border-2 p-2.5 sm:p-4 text-center shadow-sm transition-all duration-200 ${
              escalationFilter === s
                ? "border-primary text-primary bg-transparent font-bold"
                : "border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <p className="font-serif text-2xl sm:text-3xl font-bold">
              {escalations.filter((e) => e.status === s).length}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest mt-1 capitalize">{s}</p>
          </button>
        ))}
      </div>

      {filteredEscalations.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-6 sm:py-14 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-400/60 mb-3" />
          <p className="font-serif text-muted-foreground">
            No escalations{escalationFilter !== "all" ? ` with status "${escalationFilter}"` : ""}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm min-w-[580px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Student", "Reason", "Status", "Reviewer", "Date"].map((h) => (
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
                {filteredEscalations.map((esc) => (
                  <tr
                    key={esc.id}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-2 py-2 sm:px-5 sm:py-3">
                      <p className="font-semibold">{esc.profiles?.display_name ?? "—"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {esc.profiles?.email ?? (esc.user_id ? esc.user_id.slice(0, 8) + "…" : "—")}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-xs max-w-[200px]">
                      <p className="truncate" title={esc.detail ?? esc.reason}>
                        {esc.detail || esc.reason}
                      </p>
                    </td>
                    <td className="px-2 py-2 sm:px-5 sm:py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${
                          esc.status === "resolved"
                            ? "text-green-600 bg-green-50 border-green-200"
                            : esc.status === "open"
                              ? "text-red-600 bg-red-50 border-red-200"
                              : "text-amber-600 bg-amber-50 border-amber-200"
                        }`}
                      >
                        {esc.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">
                      {esc.reviewer_id ? esc.reviewer_id?.slice(0, 8) + "…" : "Unassigned"}
                    </td>
                    <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">
                      {formatDate(esc.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border/50 bg-muted/20">
            <p className="font-mono text-[10px] text-muted-foreground">
              {filteredEscalations.length} escalations shown
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
