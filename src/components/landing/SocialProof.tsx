export default function SocialProof() {
  return (
    <section className="w-full border-y border-white/5 bg-[#0a0a0a]/60 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[rgba(255,255,255,0.35)]">
          For every student, every level, every curriculum
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            "KCSE",
            "CBC",
            "Cambridge IGCSE",
            "A-Level",
            "IB",
            "University",
            "Edexcel IGCSE",
            "Canadian Curriculum",
          ].map((name) => (
            <span
              key={name}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-semibold text-[rgba(255,255,255,0.75)] backdrop-blur-md hover:border-[#d9531e]/40 hover:text-white transition-all duration-300"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
