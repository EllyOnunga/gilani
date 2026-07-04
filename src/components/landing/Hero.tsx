import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const CHAT_SEQUENCE = [
    { type: "student", text: "Explain photosynthesis simply." },
    { type: "ai", text: "Imagine a plant as a tiny solar-powered food factory. It uses sunlight, water, and carbon dioxide to create glucose (sugar) for energy, and releases oxygen back into the air!" }
];

export default function Hero() {
    const [messages, setMessages] = useState<{ type: string, text: string }[]>([]);
    const [typingText, setTypingText] = useState("");
    const [step, setStep] = useState(0);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        if (step === 0) {
            timeout = setTimeout(() => setStep(1), 500);
        } else if (step === 1) {
            setMessages([{ type: "student", text: CHAT_SEQUENCE[0].text }]);
            timeout = setTimeout(() => setStep(2), 800);
        } else if (step === 2) {
            const targetText = CHAT_SEQUENCE[1].text;
            let currentLength = 0;
            const typeChar = () => {
                if (currentLength < targetText.length) {
                    currentLength++;
                    setTypingText(targetText.slice(0, currentLength));
                    timeout = setTimeout(typeChar, 25);
                } else {
                    setMessages((prev) => [...prev, { type: "ai", text: targetText }]);
                    setTypingText("");
                    setStep(3);
                }
            };
            typeChar();
        }
        return () => clearTimeout(timeout);
    }, [step]);

    return (
        <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a0a0a] pt-24 pb-20">
            {/* Rich Background Gradients */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#d9531e]/20 blur-[120px] rounded-full mix-blend-screen opacity-60 animate-pulse [animation-duration:8s]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#c44819]/10 blur-[150px] rounded-full mix-blend-screen opacity-50"></div>
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>
            </div>

            <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 lg:flex-row lg:items-center">

                {/* Left Side: Copy & CTA */}
                <div className="flex flex-1 min-w-0 flex-col items-start gap-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#d9531e]/30 bg-[#d9531e]/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#d9531e] backdrop-blur-sm shadow-[0_0_15px_rgba(217,83,30,0.2)]">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d9531e] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d9531e]"></span>
                        </span>
                        GilaniAI is Live
                    </div>

                    <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl xl:text-7xl leading-[1.1] break-words w-full">
                        Learn Smarter <br className="hidden lg:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d9531e] to-[#f59e0b]">
                            with AI.
                        </span>
                    </h1>
                    
                    <p className="max-w-xl text-lg text-[#a1a1aa] sm:text-xl leading-relaxed font-light">
                        Upload notes, solve homework, and master exams. 
                        Your intelligent tutor grounded in the Kenyan curriculum.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-2">
                        <Link 
                            to="/"
                            search={{ authModalOpen: true } as any}
                            className="group relative rounded-full bg-[#d9531e] px-8 py-4 text-base font-bold text-white transition-all hover:bg-[#e85b24] hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(217,83,30,0.4)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                            <span className="relative">Start for Free</span>
                        </Link>
                        <a
                            href="#demo"
                            className="rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-white transition-all hover:bg-white/10 hover:border-white/20 backdrop-blur-md"
                        >
                            Watch Demo
                        </a>
                    </div>
                    
                    <div className="mt-6 flex items-center gap-4 border-t border-white/10 pt-6">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0a0a0a] bg-[#1f1f1f] flex items-center justify-center text-xs">
                                    👨‍🎓
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col">
                            <div className="flex text-[#f59e0b]">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                    </svg>
                                ))}
                            </div>
                            <span className="text-xs text-[#a1a1aa] font-medium mt-0.5">Trusted by Kenyan Students</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Mockup & Live Chat */}
                <div className="relative flex flex-1 items-center justify-center w-full max-w-lg lg:max-w-none perspective-1000">

                    {/* Floating Glow Chips */}
                    <div className="absolute -left-10 top-20 hidden animate-bounce rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl md:block [animation-duration:4s] z-20">
                        <span className="mr-2 text-xl">📄</span> Upload PDF
                    </div>
                    <div className="absolute -right-6 top-40 hidden animate-bounce rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl md:block [animation-duration:5s] [animation-delay:1s] z-20">
                        <span className="mr-2 text-xl">🧮</span> Math Solver
                    </div>
                    <div className="absolute -left-12 bottom-40 hidden animate-bounce rounded-2xl border border-[#d9531e]/30 bg-[#d9531e]/10 backdrop-blur-xl px-5 py-3 text-sm font-semibold text-[#d9531e] shadow-[0_0_20px_rgba(217,83,30,0.3)] md:block [animation-duration:4.5s] [animation-delay:0.5s] z-20">
                        <span className="mr-2 text-xl">🤖</span> AI Tutor
                    </div>

                    {/* Phone Frame - Rotated 3D Effect */}
                    <div className="relative w-full max-w-[320px] aspect-[9/19] rounded-[48px] border-[10px] border-[#18181b] bg-[#0a0a0a] shadow-[0_20px_60px_-15px_rgba(217,83,30,0.5)] overflow-hidden transform hover:-translate-y-2 hover:rotate-1 transition-transform duration-700 ease-out z-10">
                        
                        {/* Fake Dynamic Island */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30"></div>

                        {/* Status Bar Fake */}
                        <div className="h-10 w-full flex justify-between px-6 pt-3 items-center bg-transparent absolute top-0 z-20">
                            <span className="text-[11px] font-bold text-white">9:41</span>
                            <div className="flex gap-1.5 items-center">
                                <div className="w-4 h-3 rounded-sm border border-white flex justify-end p-[1px]"><div className="w-2.5 h-full bg-white rounded-[1px]"></div></div>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex flex-col h-full pt-16 p-4 gap-4 overflow-y-auto bg-gradient-to-b from-[#18181b] to-[#0a0a0a]">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex w-full ${msg.type === 'student' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-[20px] px-4 py-3 text-[13px] leading-relaxed shadow-md ${msg.type === 'student' ? 'bg-[#d9531e] text-white rounded-tr-sm' : 'bg-[#27272a] border border-white/5 text-[#f4f4f5] rounded-tl-sm'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}

                            {/* Active Typing */}
                            {typingText && (
                                <div className="flex w-full justify-start">
                                    <div className="max-w-[85%] rounded-[20px] bg-[#27272a] border border-white/5 px-4 py-3 text-[13px] leading-relaxed text-[#f4f4f5] rounded-tl-sm">
                                        {typingText}
                                        <span className="inline-block w-1.5 h-3 ml-1 bg-[#d9531e] animate-pulse"></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area Fake */}
                        <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pt-12 z-20">
                            <div className="w-full rounded-full border border-white/10 bg-[#27272a]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-lg">
                                <span className="text-[13px] text-white/40">Message GilaniAI...</span>
                                <div className="w-7 h-7 rounded-full bg-[#d9531e] flex items-center justify-center shadow-lg shadow-[#d9531e]/50">
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
