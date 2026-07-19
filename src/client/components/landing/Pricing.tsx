import { Link } from "@tanstack/react-router";
import { PLANS } from "@/shared/plans";

// Pulls directly from the same plans.ts used for real billing/rate-limiting —
// this section can no longer silently drift out of sync with actual pricing.
const free = PLANS.free;
const pro = PLANS.pro;

export default function Pricing() {
  return (
    <section id="plans" className="relative w-full bg-[#0a0a0a] py-20 overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#d9531e]/5 to-transparent pointer-events-none blur-3xl"></div>

      <div className="mx-auto max-w-5xl px-6 relative z-10">
        <div className="text-center mb-20 max-w-2xl mx-auto space-y-4">
          <span className="inline-block rounded-full bg-[#d9531e]/10 border border-[#d9531e]/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#d9531e] shadow-[0_0_15px_rgba(217,83,30,0.15)]">
            Simple Pricing
          </span>
          <h2 className="font-serif text-4xl font-bold text-white tracking-tight sm:text-5xl">
            Plans for every learner
          </h2>
          <p className="text-[#a1a1aa] text-lg font-light">
            Start for free. Upgrade to Pro for unlimited access — just{" "}
            <span className="text-white font-bold">Ksh {pro.price.toLocaleString()} per month</span>
            .
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-10 max-w-4xl mx-auto items-center">
          {/* Free Plan */}
          <div className="flex flex-col rounded-[32px] border border-white/5 bg-[#121212] p-10 shadow-2xl relative overflow-hidden transition-transform duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
            <div className="relative z-10 mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
              <p className="text-[#a1a1aa] text-sm mb-6">{free.description}</p>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-black text-white tracking-tighter">
                  Ksh {free.price}
                </span>
                <span className="text-[#71717a] text-sm mb-1.5 font-medium">/month</span>
              </div>
            </div>

            <ul className="flex-1 space-y-4 mb-10 relative z-10">
              {free.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-[#d4d4d8]">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs shadow-inner">
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              to="/login"
              search={{ redirect: undefined, signout: undefined }}
              className="relative z-10 w-full text-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white transition-all hover:bg-white/10 hover:border-white/20 backdrop-blur-md"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="relative flex flex-col rounded-[32px] border border-[#d9531e]/50 bg-[#121212] p-10 shadow-[0_0_50px_rgba(217,83,30,0.15)] transform md:scale-105 transition-transform duration-500 hover:scale-[1.07] hover:shadow-[0_0_60px_rgba(217,83,30,0.25)] z-20">
            <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-[#d9531e]/10 via-transparent to-transparent"></div>
            </div>

            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#d9531e] to-[#f59e0b] px-5 py-1.5 text-xs font-black text-white uppercase tracking-widest whitespace-nowrap shadow-[0_0_20px_rgba(217,83,30,0.5)] z-20">
              ⚡ Most Popular
            </div>

            <div className="relative z-10 mb-8 mt-2">
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#d9531e] to-[#f59e0b] mb-2">
                Pro
              </h3>
              <p className="text-[#a1a1aa] text-sm mb-6">{pro.description}</p>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-black text-white tracking-tighter">
                  Ksh {pro.price.toLocaleString()}
                </span>
                <span className="text-[#71717a] text-sm mb-1.5 font-medium">/month</span>
              </div>
              <p className="text-xs text-[#71717a] mt-2 font-medium">
                Billed monthly via M-Pesa · Cancel anytime
              </p>
            </div>

            <ul className="flex-1 space-y-4 mb-10 relative z-10">
              {pro.features.map((f, i) => (
                <li
                  key={f}
                  className={`flex items-center gap-3 text-sm ${i === 0 ? "text-[#a1a1aa]" : "text-white font-medium"}`}
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#d9531e] to-[#f59e0b] flex items-center justify-center text-white text-xs shadow-lg shadow-[#d9531e]/30">
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              to="/login"
              search={{ redirect: undefined, signout: undefined }}
              className="relative z-10 w-full text-center rounded-2xl bg-gradient-to-r from-[#d9531e] to-[#c44819] px-6 py-4 text-sm font-bold text-white transition-all hover:scale-105 shadow-[0_0_30px_rgba(217,83,30,0.4)] group overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative">Upgrade to Pro →</span>
            </Link>
          </div>
        </div>

        <div className="text-center mt-12 flex items-center justify-center gap-2 text-xs font-medium text-[#71717a] bg-[#121212]/50 border border-white/5 rounded-full py-2 px-6 max-w-fit mx-auto backdrop-blur-md">
          <span className="text-base">🇰🇪</span> Payment via M-Pesa STK Push · Secure &amp; instant
        </div>
      </div>
    </section>
  );
}
