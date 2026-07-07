import { CreditCard, Zap } from "lucide-react";
import type { useSettings } from "@/components/settings/hooks/useSettings";
import { PLANS, type PlanId } from "@/lib/plans";

type Props = {
  settings: ReturnType<typeof useSettings>;
};

export function PlanUsageTab({ settings }: Props) {
  const dailyLimit =
    settings.currentPlan === "free" ? PLANS.free.dailyMessages : PLANS.pro.dailyMessages;
  const usagePercentage = Math.min(100, (settings.dailyMessageCount / dailyLimit) * 100);

  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
      <div className="flex items-center gap-2.5">
        <CreditCard className="h-5 w-5 text-primary" />
        <h3 className="font-serif text-xl font-bold text-foreground">Subscription Plan</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Upgrade your plan to unlock more daily questions, quizzes, study notes synthesis, and
        premium AI models.
      </p>

      {/* Current plan + usage */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-bold capitalize text-sm text-foreground">
              {settings.currentPlan} Plan
            </span>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
              Active
            </span>
          </div>
          {settings.currentPlan === "free" && (
            <button
              type="button"
              onClick={() => settings.setShowPlans(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer w-full sm:w-auto"
            >
              <CreditCard className="h-3 w-3" /> Upgrade
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Daily messages</span>
            <span className="font-mono font-bold">
              {settings.dailyMessageCount} / {dailyLimit >= 999999 ? "∞" : dailyLimit}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${usagePercentage > 90 ? "bg-red-500" : usagePercentage > 60 ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">Resets daily at midnight EAT</p>
        </div>
      </div>

      {/* Plan comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(["free", "pro"] as const).map((pid) => {
          const p = PLANS[pid];
          const isActive = settings.currentPlan === pid;
          return (
            <div
              key={pid}
              className={`rounded-xl border p-4 space-y-3 transition-all ${isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-foreground">{p.label}</p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                    {p.price === 0 ? "Free" : `KSh ${p.price.toLocaleString()}/mo`}
                  </p>
                </div>
                {isActive && (
                  <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-primary-foreground">
                    Current
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {p.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                  >
                    <span className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              {!isActive && pid !== "free" && (
                <button
                  type="button"
                  onClick={() => settings.setShowPlans(true)}
                  className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  Select Plan
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
