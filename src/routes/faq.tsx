import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { LegalHeader, LegalFooter } from "@/components/LegalLayout";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — GilaniAI" },
      {
        name: "description",
        content: "Frequently asked questions about GilaniAI — your AI study assistant.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://gilaniai.site/faq" }],
  }),
  component: FAQPage,
});

const FAQS = [
  {
    category: "Getting Started",
    items: [
      {
        q: "What is GilaniAI?",
        a: "GilaniAI is an AI-powered study assistant built for students. It provides AI tutoring, practice quizzes, smart notes, a study planner, and real teacher escalation.",
      },
      {
        q: "Is GilaniAI free to use?",
        a: "Yes — GilaniAI is free to start. Create an account and get immediate access to all core features including the AI tutor, quizzes, notes and planner.",
      },
      {
        q: "How do I create an account?",
        a: "Click 'Get started' on the homepage and sign up with your email and password, or use 'Continue with Google' for instant access.",
      },
      {
        q: "Can I use GilaniAI on my phone?",
        a: "Yes. GilaniAI is a Progressive Web App (PWA) — it works on any browser on Android or iPhone. You can install it to your home screen for an app-like experience.",
      },
    ],
  },
  {
    category: "AI Tutor",
    items: [
      {
        q: "How does the AI tutor work?",
        a: "GilaniAI uses a Socratic tutoring approach — instead of just giving you answers, it asks guiding questions to help you think through problems step by step.",
      },
      {
        q: "Can the AI make mistakes?",
        a: "Yes. Like all AI systems, GilaniAI can occasionally produce inaccurate information. Always verify important answers with your teacher or official textbooks.",
      },
      {
        q: "What is the 'escalate to teacher' feature?",
        a: "If you're stuck or need human confirmation, you can escalate any study session to a real teacher. The teacher will review your conversation and leave a written response directly in GilaniAI.",
      },
      {
        q: "Does GilaniAI do my homework for me?",
        a: "GilaniAI is designed to guide your learning, not do your work for you. Using it to copy answers violates our Terms of Service and your school's academic integrity policy.",
      },
    ],
  },
  {
    category: "Privacy & Safety",
    items: [
      {
        q: "Is GilaniAI safe for students?",
        a: "Yes. Content is moderated, sessions are logged for teacher review, and the AI is specifically prompted to maintain age-appropriate, educational conversations at all times.",
      },
      {
        q: "What data does GilaniAI collect?",
        a: "We collect your name, email address, and your study sessions. We never sell your data to third parties or use it for advertising. See our Privacy Policy for full details.",
      },
      {
        q: "Who can see my study sessions?",
        a: "Only you can see your study sessions by default. If you escalate a session to a teacher, that teacher and GilaniAI admins can view the escalated conversation.",
      },
      {
        q: "Can I delete my account and data?",
        a: "Yes. Contact us at support@gilaniai.site and we will delete your account and all associated data within 7 business days.",
      },
    ],
  },
  {
    category: "Teachers & Schools",
    items: [
      {
        q: "Can teachers use GilaniAI?",
        a: "Yes. Teachers have a dedicated portal where they can view and respond to escalated student sessions. Register and select 'Teacher' as your role during signup.",
      },
      {
        q: "Can schools use GilaniAI?",
        a: "Yes. We welcome partnerships with schools. Contact us at support@gilaniai.site to discuss school-wide access and teacher onboarding.",
      },
      {
        q: "How do teachers get notified of escalations?",
        a: "When a student escalates a session, registered teachers receive an email notification. If assigned to a specific teacher, only that teacher is notified.",
      },
    ],
  },
  {
    category: "Technical",
    items: [
      {
        q: "Which browsers does GilaniAI support?",
        a: "GilaniAI works best on Chrome, Edge, Firefox, and Safari. Keep your browser updated for the best experience.",
      },
      {
        q: "Does GilaniAI work offline?",
        a: "GilaniAI requires an internet connection to generate AI responses. However, as a PWA, some parts of the interface may load from cache when offline.",
      },
      {
        q: "I'm not receiving the confirmation email. What should I do?",
        a: "Check your spam or junk folder first. If it's not there, wait 5 minutes and try again. If the problem persists, contact us at support@gilaniai.site.",
      },
      {
        q: "How do I reset my password?",
        a: "On the login page, click 'Forgot password?' and enter your email address. You'll receive a password reset link within a few minutes. The link expires in 1 hour.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
        open ? "border-[#d9531e]/30 bg-[#1a1d27]" : "border-white/8 bg-[#1a1d27]"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4.5 text-left hover:bg-white/2 transition-colors gap-4"
      >
        <span className="font-semibold text-sm text-white">{q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[#d9531e] flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#6b7280] flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-3 text-sm text-[#9ca3af] leading-relaxed border-t border-white/6 bg-[#0f1117]/30">
          {a}
        </div>
      )}
    </div>
  );
}

function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const filtered = activeCategory ? FAQS.filter((f) => f.category === activeCategory) : FAQS;

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e2e4f0] flex flex-col overflow-x-hidden">
      <LegalHeader backTo={"/register" as any} backLabel="Get started" />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5 py-12 sm:py-20 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(217,83,30,0.08),transparent_60%)]" />
        </div>
        <div className="relative max-w-xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d9531e]/30 bg-[#d9531e]/8 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#d9531e] mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            Support Center
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-black text-white">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-[#9ca3af] leading-relaxed">
            Everything you need to know about GilaniAI. Can't find your answer?{" "}
            <Link to={"/contact" as any} className="text-[#d9531e] font-semibold hover:underline">
              Contact us.
            </Link>
          </p>
        </div>
      </div>

      <main className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-8 py-10 sm:py-16 space-y-10">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              !activeCategory
                ? "bg-[#d9531e] text-white shadow-md shadow-[#d9531e]/20"
                : "border border-white/8 text-[#9ca3af] hover:text-white hover:bg-white/4"
            }`}
          >
            All Questions
          </button>
          {FAQS.map(({ category }) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category === activeCategory ? null : category)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                activeCategory === category
                  ? "bg-[#d9531e] text-white shadow-md shadow-[#d9531e]/20"
                  : "border border-white/8 text-[#9ca3af] hover:text-white hover:bg-white/4"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="space-y-8">
          {filtered.map(({ category, items }) => (
            <div key={category} className="space-y-4">
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-[#d9531e] font-bold">
                {category}
              </h2>
              <div className="space-y-3">
                {items.map(({ q, a }) => (
                  <FAQItem key={q} q={q} a={a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#1a1d27] p-8 text-center space-y-4">
          <h3 className="font-serif text-xl font-bold text-white">Still have questions?</h3>
          <p className="text-sm text-[#9ca3af] max-w-md mx-auto">
            Our support team is happy to help. Reach out and we will get back to you within 24
            hours.
          </p>
          <Link
            to={"/contact" as any}
            className="inline-flex items-center gap-2 rounded-xl bg-[#d9531e] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#c44819] transition-all shadow-lg shadow-[#d9531e]/25"
          >
            Contact support
          </Link>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
