import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/ui/logo";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — GilaniAI" },
      {
        name: "description",
        content:
          "Frequently asked questions about GilaniAI — Kenya's AI study assistant for KCSE, CBC and IGCSE students.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://gilaniai.vercel.app/faq" }],
  }),
  component: FAQPage,
});

const FAQS = [
  {
    category: "Getting Started",
    items: [
      {
        q: "What is GilaniAI?",
        a: "GilaniAI is an AI-powered study assistant built specifically for Kenyan secondary school students. It supports KCSE (Form 1–4), CBC (Grade 7–10), and IGCSE (Edexcel/Cambridge) curricula with AI tutoring, practice quizzes, smart notes, a study planner, and real teacher escalation.",
      },
      {
        q: "Is GilaniAI free to use?",
        a: "Yes — GilaniAI is free to start. Create an account with your email or Google and get immediate access to all core features including the AI tutor, quizzes, notes and planner.",
      },
      {
        q: "How do I create an account?",
        a: "Click 'Get started' on the homepage and sign up with your email and password, or use 'Continue with Google' for instant access. You'll receive a confirmation email — click the link to activate your account.",
      },
      {
        q: "Can I use GilaniAI on my phone?",
        a: "Yes. GilaniAI is a Progressive Web App (PWA) — it works on any browser on Android or iPhone. You can also install it to your home screen for an app-like experience without visiting the app store.",
      },
    ],
  },
  {
    category: "Curriculum & Subjects",
    items: [
      {
        q: "Which curricula does GilaniAI support?",
        a: "GilaniAI supports three curricula: KCSE (Kenya Certificate of Secondary Education) for Form 1–4, CBC (Competency Based Curriculum) for Grade 7–10, and IGCSE for both Edexcel and Cambridge international school students in Kenya.",
      },
      {
        q: "Which subjects are covered?",
        a: "GilaniAI covers all major secondary school subjects including Mathematics, Physics, Chemistry, Biology, English, Kiswahili, History & Government, Geography, Computer Studies, Business Studies, CRE, and Agriculture.",
      },
      {
        q: "Are the answers aligned to official syllabus content?",
        a: "Yes. Every AI response is grounded in official curriculum material from KICD (CBC), KNEC (KCSE), Pearson (Edexcel), and Cambridge Assessment. GilaniAI does not rely on generic internet knowledge for curriculum questions.",
      },
      {
        q: "Can I switch between curricula in the same account?",
        a: "Yes. You can select your curriculum (KCSE, CBC, IGCSE Edexcel, or IGCSE Cambridge) in each study session. Your sessions are saved separately so you can revise across different curricula.",
      },
    ],
  },
  {
    category: "AI Tutor",
    items: [
      {
        q: "How does the AI tutor work?",
        a: "GilaniAI uses a Socratic tutoring approach — instead of just giving you answers, it asks guiding questions to help you think through problems step by step. This builds deeper understanding rather than dependence on AI-generated answers.",
      },
      {
        q: "Can the AI make mistakes?",
        a: "Yes. Like all AI systems, GilaniAI can occasionally produce inaccurate or outdated information. We always recommend verifying important answers with your teacher or official textbooks. If you spot an error, you can escalate the session to a real teacher.",
      },
      {
        q: "What is the 'escalate to teacher' feature?",
        a: "If you're stuck on a concept, uncomfortable with an AI response, or need human confirmation, you can escalate any study session to a real teacher. The teacher will review your conversation and leave a written response directly in GilaniAI.",
      },
      {
        q: "Does GilaniAI do my homework for me?",
        a: "GilaniAI is designed to guide your learning, not do your work for you. It uses Socratic questioning to help you arrive at answers yourself. Using it to copy answers violates our Terms of Service and your school's academic integrity policy.",
      },
    ],
  },
  {
    category: "Privacy & Safety",
    items: [
      {
        q: "Is GilaniAI safe for students under 18?",
        a: "Yes. GilaniAI is designed with young learners in mind. Content is moderated, sessions are logged for teacher review, and the AI is specifically prompted to maintain age-appropriate, educational conversations at all times.",
      },
      {
        q: "What data does GilaniAI collect?",
        a: "We collect your name, email address, and profile photo (when signing in with Google), along with your study sessions and interactions with the platform. We never sell your data to third parties or use it for advertising. See our Privacy Policy for full details.",
      },
      {
        q: "Who can see my study sessions?",
        a: "Only you can see your study sessions by default. If you escalate a session to a teacher, that teacher and GilaniAI admins can view the escalated conversation for review purposes.",
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
        a: "Yes. Teachers have a dedicated portal on GilaniAI where they can view and respond to escalated student sessions. If you are a teacher, register and select 'Teacher' as your role during signup.",
      },
      {
        q: "Can schools use GilaniAI for their students?",
        a: "Yes. We welcome partnerships with Kenyan schools. Contact us at onungaelly@gmail.com to discuss school-wide access, teacher onboarding, and integration with your school's learning programme.",
      },
      {
        q: "How do teachers get notified of escalations?",
        a: "When a student escalates a session, all registered teachers receive an email notification via GilaniAI. If the escalation is assigned to a specific teacher, only that teacher is notified.",
      },
    ],
  },
  {
    category: "Technical",
    items: [
      {
        q: "Which browsers does GilaniAI support?",
        a: "GilaniAI works best on Chrome, Edge, Firefox, and Safari. We recommend keeping your browser updated for the best experience. Internet Explorer is not supported.",
      },
      {
        q: "Does GilaniAI work offline?",
        a: "GilaniAI requires an internet connection to generate AI responses. However, as a PWA, some parts of the interface may load from cache when offline.",
      },
      {
        q: "I'm not receiving the confirmation email. What should I do?",
        a: "Check your spam or junk folder first. If it's not there, wait 5 minutes and try again. Make sure you entered the correct email address. If the problem persists, contact us at onungaelly@gmail.com.",
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
    <div className="border border-border rounded-xl overflow-hidden">
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-30">
        <div className="flex w-full items-center justify-between px-4 sm:px-6 py-3">
          <Logo to="/" size="md" />
          <nav className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-primary font-bold mb-4">
            Support
          </div>
          <h1 className="font-serif text-4xl font-bold">Frequently Asked Questions</h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Everything you need to know about GilaniAI. Can't find your answer?{" "}
            <a href="mailto:onungaelly@gmail.com" className="text-primary hover:underline">
              Contact us.
            </a>
          </p>
        </div>

        {/* Category Filter */}
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

        {/* FAQ Items */}
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

        {/* Still need help */}
        <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
          <h3 className="font-serif text-xl font-bold mb-2">Still have questions?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Our team is happy to help. Reach out and we'll get back to you within 24 hours.
          </p>
          <a
            href="mailto:onungaelly@gmail.com"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Contact support
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 sm:px-6 py-8 bg-card">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Logo to="/" size="sm" />
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <Link to="/about" className="hover:text-primary transition-colors">
              About
            </Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>
            <Link to="/cookies" className="hover:text-primary transition-colors">
              Cookies
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} GilaniAI · Nairobi, Kenya
          </p>
        </div>
      </footer>
    </div>
  );
}
