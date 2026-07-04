import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PLANS, PlanId } from "@/lib/plans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, GraduationCap, Star, School, X, Loader2, Wallet, Check } from "lucide-react";
import { friendlyError } from "@/lib/async";
import { TOPUP_TOKENS_PER_KES, TOPUP_MIN_KES } from "@/lib/plans";

const PLAN_ICONS: Record<PlanId, typeof Zap> = {
  free: Zap,
  pro: Star,
};

interface Props {
  onClose: () => void;
  currentPlan?: string;
}

export function PlansModal({ onClose, currentPlan = "free" }: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<PlanId>("pro");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [tab, setTab] = useState<"plans" | "topup">("plans");
  const [topupAmount, setTopupAmount] = useState<string>("");

  const handleTopup = async () => {
    if (!user?.id) {
      toast.error("Please log in first");
      return;
    }
    if (!phone || phone.length < 9) {
      toast.error("Enter a valid Safaricom number");
      return;
    }
    const parsed = Math.floor(Number(topupAmount));
    if (!parsed || parsed < TOPUP_MIN_KES) {
      toast.error(`Minimum top-up is KES ${TOPUP_MIN_KES}`);
      return;
    }
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/mpesa/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ phone, plan: "topup", amount: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
      toast.success(
        `📱 M-Pesa prompt sent! You'll receive ${(parsed * TOPUP_TOKENS_PER_KES).toLocaleString()} tokens.`,
      );
    } catch (err: any) {
      toast.error(friendlyError(err, "Top-up failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const paidPlans = (Object.values(PLANS) as (typeof PLANS)[PlanId][]).filter(
    (p) => p.id !== "free",
  );

  const handlePay = async () => {
    if (!user?.id) {
      toast.error("Please log in first");
      return;
    }
    if (!phone || phone.length < 9) {
      toast.error("Enter a valid Safaricom number");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/mpesa/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ phone, plan: selected }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSent(true);
      toast.success("📱 M-Pesa prompt sent! Enter your PIN to activate.");
    } catch (err: any) {
      toast.error(friendlyError(err, "Payment failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Upgrade</p>
            <h2 className="font-serif text-xl font-bold">Choose a Plan</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Current plan: <span className="text-primary">{currentPlan}</span>
          </p>

          {currentPlan === "free" && (
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-mono">
              <button
                onClick={() => {
                  setTab("plans");
                  setSent(false);
                }}
                className={`flex-1 py-2 transition-colors ${tab === "plans" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-accent"}`}
              >
                Monthly Plans
              </button>
              <button
                onClick={() => {
                  setTab("topup");
                  setSent(false);
                }}
                className={`flex-1 py-2 transition-colors flex items-center justify-center gap-1.5 ${tab === "topup" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-accent"}`}
              >
                <Wallet className="h-3 w-3" /> Top Up
              </button>
            </div>
          )}

          {tab === "plans" ? (
            <>
              <div className="space-y-2">
                {paidPlans.map((plan) => {
                  const Icon = PLAN_ICONS[plan.id];
                  const isSelected = selected === plan.id;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelected(plan.id)}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40 hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <div>
                          <p className="text-sm font-semibold">{plan.label}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {plan.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-bold text-primary">KES {plan.price}</p>
                        <p className="font-mono text-[9px] text-muted-foreground">per month</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Plan Features */}
              <div className="rounded-xl bg-accent/25 border border-border/30 p-3.5 space-y-2">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  Included in {PLANS[selected].label}:
                </p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {PLANS[selected].features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {!sent ? (
                <>
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Safaricom M-Pesa Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 0712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\s/g, ""))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <button
                    onClick={handlePay}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending prompt...
                      </>
                    ) : (
                      `Pay KES ${PLANS[selected].price} via M-Pesa`
                    )}
                  </button>
                </>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-4 py-4 text-center space-y-2">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    📱 Check your phone!
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">
                    Enter your M-Pesa PIN to complete. Your plan activates instantly after payment.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-2 text-xs font-mono underline text-muted-foreground"
                  >
                    Done
                  </button>
                </div>
              )}
              <p className="text-center font-mono text-[9px] text-muted-foreground">
                Plans renew monthly. Cancel anytime by not renewing.
              </p>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-secondary p-4 space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Rate
                </p>
                <p className="font-serif text-lg font-bold">
                  KES 1{" "}
                  <span className="text-muted-foreground text-sm font-sans font-normal">
                    = 1,000 tokens
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Tokens never expire and stack with your free daily allowance.
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTopupAmount(String(amt))}
                    className={`rounded-lg border py-2 text-xs font-mono font-bold transition-colors ${
                      topupAmount === String(amt)
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    KES {amt}
                    <span className="block text-[9px] font-normal text-muted-foreground">
                      {((amt * TOPUP_TOKENS_PER_KES) / 1000).toFixed(0)}K tkns
                    </span>
                  </button>
                ))}
              </div>
              {!sent ? (
                <>
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Custom Amount (KES)
                    </label>
                    <input
                      type="number"
                      min={TOPUP_MIN_KES}
                      placeholder={`Min KES ${TOPUP_MIN_KES}`}
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {topupAmount && Number(topupAmount) >= TOPUP_MIN_KES && (
                      <p className="mt-1 font-mono text-[10px] text-primary">
                        ={" "}
                        {(Math.floor(Number(topupAmount)) * TOPUP_TOKENS_PER_KES).toLocaleString()}{" "}
                        tokens
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Safaricom M-Pesa Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 0712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\s/g, ""))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <button
                    onClick={handleTopup}
                    disabled={loading || !topupAmount || Number(topupAmount) < TOPUP_MIN_KES}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending prompt...
                      </>
                    ) : (
                      `Top Up KES ${topupAmount || "—"} via M-Pesa`
                    )}
                  </button>
                </>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-4 py-4 text-center space-y-2">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    📱 Check your phone!
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">
                    Enter your M-Pesa PIN. Tokens will be added to your wallet instantly.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-2 text-xs font-mono underline text-muted-foreground"
                  >
                    Done
                  </button>
                </div>
              )}
              <p className="text-center font-mono text-[9px] text-muted-foreground">
                Tokens never expire · Min KES {TOPUP_MIN_KES} · KES 1 = 1,000 tokens
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
