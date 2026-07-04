import { BarChart3, AlertTriangle, RefreshCw, CheckCircle2, Search } from "lucide-react";
import type { RateLimitRow } from "@/components/admin/types";
import { formatDateTime } from "@/components/admin/types";

type Props = {
  rateLimits: RateLimitRow[];
  filteredRateLimits: RateLimitRow[];
  rlSearch: string;
  setRlSearch: (v: string) => void;
};

export function AdminRateLimitsTab({ rateLimits, filteredRateLimits, rlSearch, setRlSearch }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
          <BarChart3 className="mx-auto h-5 w-5 mb-2 text-primary" />
          <p className="font-serif text-2xl sm:text-3xl font-bold">{rateLimits.length}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Active Keys</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-5 w-5 mb-2 text-amber-500" />
          <p className="font-serif text-2xl sm:text-3xl font-bold">{rateLimits.reduce((a, r) => a + r.count, 0)}</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Total Hits</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 text-center shadow-sm">
          <RefreshCw className="mx-auto h-5 w-5 mb-2 text-blue-500" />
          <p className="font-serif text-2xl sm:text-3xl font-bold">
            {rateLimits.filter((r) => { const d = new Date(r.reset_at); return !isNaN(d.getTime()) && d > new Date(); }).length}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Active Now</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={rlSearch} onChange={(e) => setRlSearch(e.target.value)} placeholder="Filter by key…"
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {rateLimits.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-6 sm:py-14 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-400/60 mb-3" />
          <p className="text-sm text-muted-foreground">No rate limit hits recorded</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Key", "Hits", "Resets At", "Status"].map((h) => (
                    <th key={h} className="px-2 py-2 sm:px-4 sm:py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRateLimits.map((r) => {
                  const resetDate = new Date(r.reset_at);
                  const isActive = !isNaN(resetDate.getTime()) && resetDate > new Date();
                  return (
                    <tr key={r.key} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate" title={r.key}>{r.key}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-sm ${r.count > 10 ? "text-destructive" : r.count > 5 ? "text-amber-600" : "text-foreground"}`}>{r.count}</span>
                      </td>
                      <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-xs text-muted-foreground">{formatDateTime(r.reset_at)}</td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 px-1.5 py-px font-mono text-[9px] text-red-700">Active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-green-200 px-1.5 py-px font-mono text-[9px] text-green-700">Expired</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20">
            <p className="font-mono text-[10px] text-muted-foreground">{filteredRateLimits.length} keys</p>
          </div>
        </div>
      )}
    </div>
  );
}
