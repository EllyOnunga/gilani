export default function HowItWorks() {
    return (
        <section id="how-it-works" className="w-full bg-[#0a0a0a] py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50"></div>
            
            <div className="mx-auto max-w-7xl px-6 relative z-10">
                <div className="mb-24 text-center max-w-3xl mx-auto space-y-4">
                    <span className="inline-block rounded-full bg-[#d9531e]/10 border border-[#d9531e]/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#d9531e]">
                        Simple Process
                    </span>
                    <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                        How It Works
                    </h2>
                </div>

                <div className="flex flex-col items-center justify-center gap-12 md:flex-row md:gap-16">
                    {/* Step 1 */}
                    <div className="group flex flex-col items-center text-center max-w-[250px] relative">
                        <div className="absolute inset-0 bg-[#d9531e]/5 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#1f1f1f] to-[#121212] border border-white/10 text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a1a1aa] shadow-xl group-hover:scale-110 group-hover:border-[#d9531e]/50 transition-all duration-500 z-10">
                            1
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 z-10">Create account</h3>
                        <p className="text-sm text-[#a1a1aa] z-10">Sign in instantly with a Magic Link or Google OAuth.</p>
                    </div>

                    {/* Arrow */}
                    <div className="hidden text-white/20 md:block animate-pulse">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </div>
                    <div className="block text-white/20 md:hidden animate-pulse">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    </div>

                    {/* Step 2 */}
                    <div className="group flex flex-col items-center text-center max-w-[250px] relative">
                        <div className="absolute inset-0 bg-[#d9531e]/5 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#1f1f1f] to-[#121212] border border-white/10 text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a1a1aa] shadow-xl group-hover:scale-110 group-hover:border-[#d9531e]/50 transition-all duration-500 z-10">
                            2
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 z-10">Ask or Upload</h3>
                        <p className="text-sm text-[#a1a1aa] z-10">Chat with the AI tutor or upload your study materials.</p>
                    </div>

                    {/* Arrow */}
                    <div className="hidden text-white/20 md:block animate-pulse delay-150">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </div>
                    <div className="block text-white/20 md:hidden animate-pulse delay-150">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    </div>

                    {/* Step 3 */}
                    <div className="group flex flex-col items-center text-center max-w-[250px] relative">
                        <div className="absolute inset-0 bg-[#d9531e]/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#d9531e] to-[#c44819] text-3xl font-black text-white shadow-[0_0_30px_rgba(217,83,30,0.4)] group-hover:scale-110 transition-all duration-500 z-10">
                            3
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 z-10">Learn Smarter</h3>
                        <p className="text-sm text-[#a1a1aa] z-10">Get instant answers, explanations, and quizzes.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
