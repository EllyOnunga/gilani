const FEATURES = [
  {
    icon: "📄",
    title: "Upload Notes",
    desc: "Upload PDFs of your class notes or textbooks and get instant, curriculum-matched explanations.",
    glow: "group-hover:shadow-[0_0_30px_rgba(217,83,30,0.4)]",
  },
  {
    icon: "🧮",
    title: "Solve Homework",
    desc: "Step-by-step working, not just the final answer — so you can actually reproduce it in an exam.",
    glow: "group-hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]",
  },
  {
    icon: "🎤",
    title: "Voice Tutor",
    desc: "Ask a question out loud, mid-homework, without breaking your flow to type it out.",
    glow: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]",
  },
  {
    icon: "📷",
    title: "Scan Questions",
    desc: "Photograph a question from a past paper or textbook and get it explained on the spot.",
    glow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]",
  },
  {
    icon: "📝",
    title: "Essay Writing",
    desc: "Structural feedback on arguments and grammar — built to sharpen your own writing, not replace it.",
    glow: "group-hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]",
  },
  {
    icon: "📚",
    title: "AI Quizzes & Study Plans",
    desc: "Auto-generated quizzes that track your weak topics, and a day-by-day plan built around your exam date.",
    glow: "group-hover:shadow-[0_0_30px_rgba(236,72,153,0.4)]",
  },
];

export default function Features() {
  return (
    <section id="features" className="w-full bg-[#050505] py-16 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="mb-12 lg:mb-20 text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#a1a1aa] backdrop-blur-md">
            Features
          </span>
          <h2 className="font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Everything you need to
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a1a1aa]">
              study smarter
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat, idx) => (
            <div
              key={idx}
              className={`group relative flex flex-col items-center text-center md:items-start md:text-left gap-5 rounded-[24px] border border-white/5 bg-[#121212] p-6 md:p-8 transition-all duration-500 hover:-translate-y-2 hover:border-white/10 overflow-hidden ${feat.glow}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#1f1f1f] border border-white/5 text-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                {feat.icon}
              </div>

              <div className="relative z-10 space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">{feat.title}</h3>
                <p className="text-[#a1a1aa] leading-relaxed font-light max-w-[280px] md:max-w-none mx-auto md:mx-0">
                  {feat.desc}
                </p>
              </div>

              <div className="absolute top-8 right-8 w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-[#d9531e] transition-colors duration-500"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
