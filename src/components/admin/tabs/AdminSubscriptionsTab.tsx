import { Loader2, Search, CreditCard, Crown, Calendar, TrendingUp, DollarSign } from "lucide-react";
import type { Profile, Payment } from "@/components/admin/types";
import { formatDate } from "@/components/admin/types";
import { PLANS, type PlanId } from "@/lib/plans";

type Props = {
  filteredForPlans: Profile[];
  profileState: Profile[];
  payments: Payment[];
  planSearch: string;
  setPlanSearch: (v: string) => void;
  planCounts: Record<PlanId, number>;
  mrr: number;
  totalRevenue: number;
  activeSubs: number;
  expiringSoon: number;
  updatingPlan: string | null;
  resettingLimit: string | null;
  handlePlanChange: (userId: string, plan: string) => void;
  handleResetLimit: (userId: string) => void;
};

export function AdminSubscriptionsTab({
  filteredForPlans, profileState, payments, planSearch, setPlanSearch,
  planCounts, mrr, totalRevenue, activeSubs, expiringSoon,
  updatingPlan, resettingLimit, handlePlanChange, handleResetLimit,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">MRR Estimate</p>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-green-600">KES {mrr.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total Revenue</p>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-primary">KES {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Active Subscriptions</p>
            <Crown className="h-4 w-4 text-amber-500" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-amber-500">{activeSubs}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Expiring ≤7 Days</p>
            <Calendar className="h-4 w-4 text-red-500" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-red-500">{expiringSoon}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {(Object.keys(PLANS) as PlanId[]).map((pid) => (
          <div key={pid} className="rounded-lg border border-border bg-card p-2.5 sm:p-4 shadow-sm text-center">
            <p className="font-serif text-2xl sm:text-3xl font-bold">{planCounts[pid]}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{PLANS[pid].label}</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">KES {PLANS[pid].price.toLocaleString()}/mo</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={planSearch} onChange={(e) => setPlanSearch(e.target.value)} placeholder="Search by name, email, or plan…"
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {["User", "Email", "Plan", "Expires", "Action"].map((h) => (
                <th key={h} className="px-2 py-2 sm:px-5 sm:py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredForPlans.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center font-serif text-muted-foreground">No users found</td></tr>
            )}
            {filteredForPlans.map((p) => {
              const plan = (p.plan ?? "free") as PlanId;
              const isUpdating = updatingPlan === p.id;
              const expiry = p.plan_expiry ? new Date(p.plan_expiry) : null;
              const isValidExpiry = expiry && !isNaN(expiry.getTime());
              const isExpired = isValidExpiry ? expiry < new Date() : false;
              return (
                <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-2 py-2 sm:px-5 sm:py-3">
                    <p className="font-semibold">{p.display_name ?? "—"}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">ID: {p.id?.slice(0, 8)}…</p>
                  </td>
                  <td className="px-2 py-2 sm:px-5 sm:py-3 font-mono text-xs text-muted-foreground">{p.email ?? "—"}</td>
                  <td className="px-2 py-2 sm:px-5 sm:py-3">
                    <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-primary border-primary/20">{PLANS[plan]?.label ?? plan}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">
                    {isValidExpiry ? (
                      <span className={isExpired ? "text-destructive" : "text-muted-foreground"}>
                        {expiry.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}{isExpired ? " (expired)" : ""}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2 py-2 sm:px-5 sm:py-3">
                    <div className="flex items-center gap-1.5">
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
                        <select value={plan} onChange={(e) => handlePlanChange(p.id, e.target.value)}
                          className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer">
                          {(Object.keys(PLANS) as PlanId[]).map((pid) => <option key={pid} value={pid}>{PLANS[pid].label}</option>)}
                        </select>
                      )}
                      {resettingLimit === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : (
                        <button onClick={() => handleResetLimit(p.id)} title="Reset rate limit"
                          className="rounded px-1.5 py-0.5 text-[10px] font-mono text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors">
                          Reset
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="font-serif text-xl mt-6">Payment History</h2>
      {payments.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-6 sm:py-14 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="font-serif text-muted-foreground">No payments yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["User", "Plan", "Amount", "Phone", "Receipt", "Status", "Date"].map((h) => (
                    <th key={h} className="px-2 py-2 sm:px-4 sm:py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((pay) => (
                  <tr key={pay.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{pay.profiles?.display_name ?? "—"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{pay.profiles?.email ?? (pay.user_id ? `${pay.user_id.slice(0, 8)}…` : "—")}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs capitalize">{pay.plan}</td>
                    <td className="px-4 py-3 font-semibold">KES {pay.amount.toLocaleString()}</td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-xs text-muted-foreground">{pay.phone_number}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{pay.mpesa_receipt ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${
                        pay.status === "completed" ? "text-green-600 bg-green-50 border-green-200"
                        : pay.status === "failed" ? "text-red-600 bg-red-50 border-red-200"
                        : "text-amber-600 bg-amber-50 border-amber-200"
                      }`}>{pay.status}</span>
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-xs text-muted-foreground">{formatDate(pay.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20">
            <p className="font-mono text-[10px] text-muted-foreground">{payments.length} payments · KES {totalRevenue.toLocaleString()} completed</p>
          </div>
        </div>
      )}
    </div>
  );
}
