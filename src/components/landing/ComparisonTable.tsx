const ROWS = [
  { feature: "Works with your exact curriculum (KCSE, CBC, IGCSE)", trad: false, gilani: true },
  { feature: "Teaches the reasoning, not just the answer", trad: false, gilani: true },
  { feature: "Available at 11pm the night before a CAT", trad: false, gilani: true },
  { feature: "Escalates to a real human teacher when stuck", trad: false, gilani: true },
  { feature: "Tracks your weak topics automatically", trad: false, gilani: true },
  { feature: "Costs less than one hour of private tuition", trad: false, gilani: true },
];

export default function ComparisonTable() {
  return (
    <section className="w-full bg-[#121212] py-16">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-16 text-center space-y-3">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Why not just get a tutor?
          </h2>
          <p className="text-[#a1a1aa] max-w-xl mx-auto">
            You still can — GilaniAI is what happens between sessions, and on the nights a tutor
            isn't around.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1C1C1C]">
          <div className="grid grid-cols-3 border-b border-white/10 bg-white/5 p-6 text-sm font-bold uppercase tracking-wider text-[rgba(255,255,255,0.5)]">
            <div>Feature</div>
            <div className="text-center">Traditional Tuition</div>
            <div className="text-center text-[#C96A3D]">GilaniAI</div>
          </div>

          <div className="divide-y divide-white/5">
            {ROWS.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-3 p-6 items-center transition-colors hover:bg-white/[0.02]"
              >
                <div className="font-medium text-white text-sm sm:text-base pr-2">
                  {row.feature}
                </div>
                <div className="flex justify-center text-xl">
                  {row.trad ? (
                    <span className="text-emerald-500">✅</span>
                  ) : (
                    <span className="text-red-500 opacity-80">❌</span>
                  )}
                </div>
                <div className="flex justify-center text-xl">
                  {row.gilani ? (
                    <span className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                      ✅
                    </span>
                  ) : (
                    <span className="text-red-500">❌</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
