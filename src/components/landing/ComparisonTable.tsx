const ROWS = [
    { feature: "24/7 Help", trad: false, gilani: true },
    { feature: "Instant Answers", trad: false, gilani: true },
    { feature: "Upload Notes", trad: false, gilani: true },
    { feature: "Affordable", trad: false, gilani: true },
    { feature: "Any Subject", trad: false, gilani: true },
];

export default function ComparisonTable() {
    return (
        <section className="w-full bg-[#121212] py-24">
            <div className="mx-auto max-w-4xl px-6">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        Why GilaniAI?
                    </h2>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1C1C1C]">
                    <div className="grid grid-cols-3 border-b border-white/10 bg-white/5 p-6 text-sm font-bold uppercase tracking-wider text-[rgba(255,255,255,0.5)]">
                        <div>Feature</div>
                        <div className="text-center">Traditional</div>
                        <div className="text-center text-[#C96A3D]">GilaniAI</div>
                    </div>
                    
                    <div className="divide-y divide-white/5">
                        {ROWS.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-3 p-6 items-center transition-colors hover:bg-white/[0.02]">
                                <div className="font-medium text-white">{row.feature}</div>
                                <div className="flex justify-center text-xl">
                                    {row.trad ? <span className="text-emerald-500">✅</span> : <span className="text-red-500 opacity-80">❌</span>}
                                </div>
                                <div className="flex justify-center text-xl">
                                    {row.gilani ? <span className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">✅</span> : <span className="text-red-500">❌</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
