const FEATURES = [
    { icon: "📄", title: "Upload Notes", desc: "Upload PDFs and get instant explanations.", glow: "group-hover:shadow-[0_0_30px_rgba(217,83,30,0.4)]" },
    { icon: "🧮", title: "Solve Homework", desc: "Step-by-step solutions for complex problems.", glow: "group-hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]" },
    { icon: "🎤", title: "Voice Tutor", desc: "Ask naturally using your voice.", glow: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]" },
    { icon: "📷", title: "Scan Questions", desc: "Take a photo and learn instantly.", glow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]" },
    { icon: "📝", title: "Essay Writing", desc: "Improve assignments and grammar.", glow: "group-hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]" },
    { icon: "📚", title: "Exam Revision", desc: "Practice faster with AI quizzes.", glow: "group-hover:shadow-[0_0_30px_rgba(236,72,153,0.4)]" }
];

export default function Features() {
    return (
        <section id="features" className="w-full bg-[#050505] py-32 relative overflow-hidden">
            {/* Background embellishments */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            
            <div className="mx-auto max-w-7xl px-6 relative z-10">
                <div className="mb-20 text-center max-w-3xl mx-auto space-y-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#a1a1aa] backdrop-blur-md">
                        Features
                    </span>
                    <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        Everything You Need to 
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a1a1aa]">Study Smarter</span>
                    </h2>
                </div>
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((feat, idx) => (
                        <div 
                            key={idx} 
                            className={`group relative flex flex-col gap-5 rounded-[24px] border border-white/5 bg-[#121212] p-8 transition-all duration-500 hover:-translate-y-2 hover:border-white/10 overflow-hidden ${feat.glow}`}
                        >
                            {/* Glass gradient background that moves on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            
                            <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#1f1f1f] border border-white/5 text-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                                {feat.icon}
                            </div>
                            
                            <div className="relative z-10 space-y-2">
                                <h3 className="text-xl font-bold text-white tracking-tight">{feat.title}</h3>
                                <p className="text-[#a1a1aa] leading-relaxed font-light">
                                    {feat.desc}
                                </p>
                            </div>

                            {/* Decorative dot in the corner */}
                            <div className="absolute top-8 right-8 w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-[#d9531e] transition-colors duration-500"></div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
