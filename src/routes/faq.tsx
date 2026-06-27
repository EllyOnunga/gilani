import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
        a: "Yes. Contact us at onungaelly@gmail.com and we will delete your account and all associated data within 7 business days.",
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
        a: "Yes. We welcome partnerships with schools. Contact us at onungaelly@gmail.com to discuss school-wide access and teacher onboarding.",
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
        a: "Check your spam or junk folder first. If it's not there, wait 5 minutes and try again. If the problem persists, contact us at onungaelly@gmail.com.",
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
      className={`border rounded-xl overflow-hidden transition-colors ${open ? "border-primary/30 bg-card" : "border-border bg-card"}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/50 transition-colors gap-4"
      >
        <span className="font-medium text-sm">{q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-primary flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border bg-muted/20">
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LegalHeader backTo={"/register" as any} backLabel="Get started" />

      {/* Hero */}
      <div className="border-b border-border bg-sidebar px-4 py-8 sm:py-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-primary font-bold mb-4">
          Support
        </div>
        <h1 className="font-serif text-2xl sm:text-4xl font-bold">Frequently Asked Questions</h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
          Everything you need to know about GilaniAI. Can't find your answer?{" "}
          <Link to={"/contact" as any} className="text-primary hover:underline">
            Contact us.
          </Link>
        </p>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${!activeCategory ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground hover:bg-accent"}`}
          >
            All
          </button>
          {FAQS.map(({ category }) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category === activeCategory ? null : category)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${activeCategory === category ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground hover:bg-accent"}`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="space-y-8">
          {filtered.map(({ category, items }) => (
            <div key={category}>
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold mb-3">
                {category}
              </h2>
              <div className="space-y-2">
                {items.map(({ q, a }) => (
                  <FAQItem key={q} q={q} a={a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
          <h3 className="font-serif text-xl font-bold mb-2">Still have questions?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Our team is happy to help. Reach out and we'll get back to you within 24 hours.
          </p>
          <Link
            to={"/contact" as any}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Contact support
          </Link>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
