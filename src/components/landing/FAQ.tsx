import { useState } from "react";

const FAQS = [
    { q: "Is GilaniAI free?", a: "Yes, you can register and use our core AI chat features for free. We also offer a Premium tier for unlimited usage." },
    { q: "Can I upload PDFs?", a: "Absolutely. You can upload study notes, textbooks, and past papers to get instant explanations." },
    { q: "Does it solve math?", a: "Yes! GilaniAI provides step-by-step solutions for complex math equations, chemistry reactions, and physics problems." },
    { q: "Can parents use it?", a: "Parents can use GilaniAI to help their children understand difficult concepts quickly and accurately." },
    { q: "How accurate is it?", a: "GilaniAI is powered by advanced LLMs specialized in educational content, ensuring highly accurate step-by-step guidance." }
];

export default function FAQ() {
    const [openIdx, setOpenIdx] = useState<number | null>(null);

    return (
        <section id="faq" className="w-full bg-[#121212] py-24">
            <div className="mx-auto max-w-3xl px-6">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        Frequently Asked Questions
                    </h2>
                </div>

                <div className="flex flex-col gap-4">
                    {FAQS.map((faq, idx) => {
                        const isOpen = openIdx === idx;
                        return (
                            <div 
                                key={idx} 
                                className="rounded-2xl border border-white/10 bg-[#1C1C1C] overflow-hidden transition-all duration-300"
                            >
                                <button 
                                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                                    className="flex w-full items-center justify-between p-6 text-left"
                                >
                                    <span className="text-lg font-bold text-white">{faq.q}</span>
                                    <svg 
                                        className={`w-5 h-5 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                
                                {isOpen && (
                                    <div className="px-6 pb-6 text-[rgba(255,255,255,0.75)] leading-relaxed">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
