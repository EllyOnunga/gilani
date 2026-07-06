import { useState } from "react";

const FAQS = [
  {
    q: "Does it actually match my curriculum?",
    a: "Yes — tell it whether you're on KCSE, CBC, or Cambridge IGCSE, and it adjusts its vocabulary, exam framing, and marking-scheme expectations accordingly.",
  },
  {
    q: "Will it just give me the answer?",
    a: "No — that's the point. GilaniAI defaults to Socratic guidance: it asks you questions and walks you through the reasoning, so you can reproduce it yourself in an exam.",
  },
  {
    q: "Can I upload my own notes and past papers?",
    a: "Yes. Upload PDFs of your notes, textbooks, or past papers, and GilaniAI grounds its explanations in that material specifically.",
  },
  {
    q: "What happens if the AI genuinely can't help?",
    a: "One tap escalates your question to a real human teacher through GilaniAI's built-in escalation queue — you're never stuck with only an AI's word for it.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The Free plan includes AI tutor chat, note uploads, homework help, quizzes, and a study planner with daily limits. Upgrade to Pro for unlimited use.",
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="w-full bg-[#121212] py-16">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-16 text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className="rounded-2xl border border-white/10 bg-[#1C1C1C] overflow-hidden transition-all duration-300">
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-6 text-left"
                >
                  <span className="text-lg font-bold text-white">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-[rgba(255,255,255,0.75)] leading-relaxed">{faq.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
