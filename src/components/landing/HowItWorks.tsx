const STEPS = [
  {
    n: 1,
    title: "Tell it your curriculum",
    desc: "KCSE, CBC, or IGCSE — GilaniAI adapts its explanations, vocabulary, and exam style to match yours.",
  },
  {
    n: 2,
    title: "Ask, upload, or scan",
    desc: "Type a question, upload your notes as a PDF, or snap a photo of a tricky problem.",
  },
  {
    n: 3,
    title: "Get taught, not just told",
    desc: "GilaniAI walks you through the reasoning with Socratic questions — so it sticks, not just for one exam.",
  },
  {
    n: 4,
    title: "Stuck? Escalate to a real teacher",
    desc: "If the AI can't get you there, one tap hands your question to an actual human teacher.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full bg-[#0a0a0a] py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50"></div>

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="mb-24 text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-block rounded-full bg-[#d9531e]/10 border border-[#d9531e]/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#d9531e]">
            How It Works
          </span>
          <h2 className="font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Four steps to actually understanding it
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.n} className="group relative flex flex-col items-start text-left">
              <div className="absolute -inset-4 bg-[#d9531e]/5 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1f1f1f] to-[#121212] border border-white/10 font-serif text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a1a1aa] shadow-xl group-hover:scale-110 group-hover:border-[#d9531e]/50 transition-all duration-500">
                {step.n}
              </div>
              <h3 className="relative z-10 text-lg font-bold text-white mb-2">{step.title}</h3>
              <p className="relative z-10 text-sm text-[#a1a1aa] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
