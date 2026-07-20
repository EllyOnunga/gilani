import { useState } from "react";

export default function DemoSection() {
  const [activeChat, setActiveChat] = useState<"math" | "essay">("math");

  return (
    <section id="demo" className="w-full bg-[#050505] py-20 relative overflow-hidden">
      {/* Background glowing orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#d9531e]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="mx-auto max-w-6xl px-6 relative z-10">
        <div className="mb-20 text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#a1a1aa] backdrop-blur-md">
            Interactive Demo
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            See GilaniAI in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d9531e] to-[#f59e0b]">
              Action
            </span>
          </h2>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0a] shadow-[0_30px_100px_-20px_rgba(217,83,30,0.25)] relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>

          <div className="flex flex-col md:flex-row h-auto md:h-[600px] w-full relative z-10">
            {/* Sidebar Mockup */}
            <div className="flex w-full md:w-64 flex-col border-b md:border-b-0 md:border-r border-white/5 bg-[#121212]/80 backdrop-blur-xl p-4">
              <div className="mb-8 flex items-center justify-between px-2">
                <span className="font-bold text-white text-lg">GilaniAI</span>
                <svg
                  className="w-5 h-5 text-white/40 hover:text-white transition-colors cursor-pointer"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#71717a] mb-4 px-2">
                Today
              </div>
              <div
                onClick={() => setActiveChat("math")}
                className={`mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium border cursor-pointer transition-colors ${
                  activeChat === "math"
                    ? "bg-white/10 text-white border-white/5 shadow-inner"
                    : "border-transparent text-[#a1a1aa] hover:bg-white/5 hover:text-white"
                }`}
              >
                <svg
                  className={`w-4 h-4 ${activeChat === "math" ? "text-[#d9531e]" : "text-current"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={activeChat === "math" ? 2.5 : 2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                Balancing Equations
              </div>
              <div
                onClick={() => setActiveChat("essay")}
                className={`mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium border cursor-pointer transition-colors ${
                  activeChat === "essay"
                    ? "bg-white/10 text-white border-white/5 shadow-inner"
                    : "border-transparent text-[#a1a1aa] hover:bg-white/5 hover:text-white"
                }`}
              >
                <svg
                  className={`w-4 h-4 ${activeChat === "essay" ? "text-[#d9531e]" : "text-current"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={activeChat === "essay" ? 2.5 : 2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                History Essay Help
              </div>
            </div>

            {/* Main Chat Mockup */}
            <div className="flex flex-1 flex-col bg-[#0a0a0a]">
              <div className="flex h-16 items-center border-b border-white/5 px-8 bg-[#121212]/50 backdrop-blur-md">
                <span className="font-semibold text-white">
                  {activeChat === "math" ? "Balancing Equations" : "History Essay Help"}
                </span>
                <span className="ml-3 px-2 py-0.5 rounded-md bg-[#d9531e]/10 text-[#d9531e] text-[10px] font-bold uppercase tracking-wider border border-[#d9531e]/20">
                  {activeChat === "math" ? "Chemistry" : "History"}
                </span>
              </div>

              <div className="flex-1 overflow-hidden md:overflow-y-auto p-4 md:p-8 flex flex-col gap-6 md:gap-8 scrollbar-hide">
                {/* Student Message */}
                <div className="flex w-full justify-end">
                  <div className="max-w-[85%] md:max-w-[80%] rounded-[20px] bg-[#d9531e] px-4 md:px-6 py-3 md:py-4 text-[14px] md:text-[15px] text-white rounded-tr-sm shadow-md">
                    {activeChat === "math"
                      ? "How do I balance the combustion of methane?"
                      : "Can you help me structure my essay on the causes of World War I?"}
                  </div>
                </div>
                {/* AI Message */}
                <div className="flex w-full justify-start gap-3 md:gap-5">
                  <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1f1f1f] to-[#121212] border border-white/10 text-xs md:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-[#d9531e] to-[#f59e0b] shadow-lg">
                    AI
                  </div>
                  <div className="max-w-[85%] md:max-w-[80%] rounded-[20px] bg-[#121212] px-4 md:px-6 py-4 md:py-5 text-[14px] md:text-[15px] text-[#e4e4e7] rounded-tl-sm border border-white/5 shadow-md leading-relaxed">
                    {activeChat === "math" ? (
                      <>
                        <p className="mb-3 md:mb-4">
                          Here is the balanced equation for the combustion of methane:
                        </p>
                        <div className="font-mono text-[12px] md:text-[13px] bg-[#050505] p-3 md:p-4 rounded-xl mb-3 border border-emerald-500/30 text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                          CH₄ + 2O₂ → CO₂ + 2H₂O
                        </div>
                        <p>Notice how we now have equal atoms on both sides!</p>
                      </>
                    ) : (
                      <>
                        <p className="mb-3 md:mb-4">
                          Sure! A great way to structure it is using the MAIN acronym for the body
                          paragraphs:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mb-3 md:mb-4 text-[#a1a1aa]">
                          <li>
                            <strong className="text-[#e4e4e7]">Militarism:</strong> The arms race.
                          </li>
                          <li>
                            <strong className="text-[#e4e4e7]">Alliances:</strong> Secret treaties
                            pulling nations in.
                          </li>
                          <li>
                            <strong className="text-[#e4e4e7]">Imperialism:</strong> Competition for
                            colonies.
                          </li>
                          <li>
                            <strong className="text-[#e4e4e7]">Nationalism:</strong> Extreme pride
                            and tension.
                          </li>
                        </ul>
                        <p>
                          Start with a strong thesis in your intro, and conclude by showing how they
                          all led to the spark in Sarajevo!
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-t from-[#0a0a0a] to-transparent">
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#121212]/80 backdrop-blur-xl px-5 py-3.5 shadow-lg focus-within:border-[#d9531e]/50 focus-within:shadow-[0_0_20px_rgba(217,83,30,0.15)] transition-all">
                  <svg
                    className="w-5 h-5 text-[#a1a1aa]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  <div className="flex-1 text-[15px] text-[#71717a]">Message GilaniAI...</div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d9531e] cursor-pointer hover:bg-[#e85b24] transition-colors shadow-lg shadow-[#d9531e]/30">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
