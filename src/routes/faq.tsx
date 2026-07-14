import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { LegalHeader, LegalFooter } from "@/client/components/LegalLayout";

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
        a: "GilaniAI is an AI-powered study assistant built for students. It provides Socratic AI tutoring through chat — including quiz practice and note-based help directly in the conversation — plus real teacher escalation when you need a human to step in.",
      },
      {
        q: "Does GilaniAI have quizzes, notes, and a study planner?",
        a: "Yes. Beyond the AI tutor chat, GilaniAI includes a dedicated Quiz Generator for practice questions on any topic, a Notes tool that produces exhaustive AI summaries from uploaded PDFs, Word docs, images, or pasted text, and a Study Planner that builds a day-by-day schedule around your exam dates and subjects.",
      },
      {
        q: "Is GilaniAI free to use?",
        a: "Yes — GilaniAI is free to start. Create an account and get immediate access to the AI tutor chat and teacher escalation. Premium plans unlock higher daily message limits and priority escalation.",
      },
      {
        q: "How do I create an account?",
        a: "Click 'Get started' on the homepage to create an account with your email and a password, or use 'Continue with Google' to sign in instantly.",
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
        q: "I signed up but haven't received the verification email. What should I do?",
        a: "You're already signed in and can use GilaniAI right away — the verification email is just a background confirmation of your email address and doesn't block access. If it hasn't arrived, check your spam or junk folder, or contact us at support@gilaniai.site.",
      },
      {
        q: "Why is the AI response slow sometimes?",
        a: "Response speed depends on your internet connection and current server load. During peak hours responses may take a few extra seconds. If responses are consistently slow, try refreshing the page or switching to a faster network.",
      },
      {
        q: "How do I install GilaniAI as an app on my phone?",
        a: "Open GilaniAI in Chrome (Android) or Safari (iPhone), tap the share or menu icon, then select 'Add to Home Screen'. The app will install and open like a native app — no App Store needed.",
      },
      {
        q: "Can I use GilaniAI on a tablet or laptop?",
        a: "Yes. GilaniAI is fully responsive and works on any screen size — smartphones, tablets, and desktops all work without any extra setup.",
      },
    ],
  },
  {
    category: "Subjects & Curricula",
    items: [
      {
        q: "Which curricula does GilaniAI support?",
        a: "GilaniAI is curriculum-agnostic and supports any curriculum including KCSE, CBC, Cambridge IGCSE, Edexcel IGCSE, the Canadian curriculum, and more. Simply tell the AI your curriculum and subject when you start a session.",
      },
      {
        q: "Which subjects does GilaniAI cover?",
        a: "GilaniAI covers all major academic subjects — Mathematics, Physics, Chemistry, Biology, English, History, Geography, Business Studies, Computer Science, and many more. If a subject is taught in school, the AI can help with it.",
      },
      {
        q: "Can GilaniAI help me with exam revision?",
        a: "Absolutely. GilaniAI can generate topic-specific practice questions, quiz you on past paper formats, summarise your notes into revision cards, and build a personalised study schedule around your exam dates.",
      },
      {
        q: "Can GilaniAI help with university-level content?",
        a: "GilaniAI is primarily designed for secondary school students, but the AI can handle university-level concepts in many subjects. Results will vary depending on the complexity and specialisation of the topic.",
      },
      {
        q: "Does GilaniAI support languages other than English?",
        a: "GilaniAI's interface is in English, but the AI can understand and respond in Swahili and several other languages. Just write to it in your preferred language and it will do its best to assist.",
      },
    ],
  },
  {
    category: "Billing & Plans",
    items: [
      {
        q: "What is included in the free plan?",
        a: "The free plan gives you access to the AI tutor chat, teacher escalation, and the core study tools with a daily message limit. It's a great way to experience GilaniAI before upgrading.",
      },
      {
        q: "What extra do I get on the Pro plan?",
        a: "The Pro plan unlocks higher daily message limits, priority teacher escalation, and access to advanced study features. It's designed for students who use GilaniAI as their primary revision tool.",
      },
      {
        q: "How much does the Pro plan cost?",
        a: "Pro is priced at KES 500 per month. We occasionally offer discounted rates for longer-term subscriptions — check the Pricing section on the homepage for the latest offers.",
      },
      {
        q: "What payment methods are accepted?",
        a: "We accept M-Pesa, debit/credit cards, and other local payment options. Payment is handled securely and your card details are never stored on our servers.",
      },
      {
        q: "How do I upgrade to Pro?",
        a: "Go to your account settings inside GilaniAI and select 'Upgrade to Pro'. You'll be guided through the payment steps. Upgrade takes effect immediately after payment is confirmed.",
      },
      {
        q: "Can I cancel my Pro subscription?",
        a: "Yes. You can cancel at any time from your account settings. You'll retain Pro access until the end of your current billing period and won't be charged again after that.",
      },
      {
        q: "Do you offer discounts for students or schools?",
        a: "Yes. We offer school-wide pricing for institutions that want to provide GilaniAI to all their students. Contact us at support@gilaniai.site to discuss school plans and bulk pricing.",
      },
    ],
  },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const location = useLocation();
  const itemRef = useRef<HTMLDivElement>(null);
  const slug = slugify(q);
  const targetHash = location.hash?.replace(/^#/, "");
  const isTargeted = Boolean(targetHash) && targetHash === slug;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isTargeted) {
      setOpen(true);
      const t = setTimeout(() => {
        itemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [isTargeted]);

  return (
    <div
      ref={itemRef}
      id={slug}
      className={`border rounded-2xl overflow-hidden transition-all duration-200 scroll-mt-24 ${
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
        <div className="px-5 pb-5 pt-3 text-sm text-[#9ca3af] leading-relaxed border-t border-white/6 bg-[#0a0a0a]/50">
          {a}
        </div>
      )}
    </div>
  );
}

const FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.flatMap((category) =>
    category.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  ),
});

function FAQPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const filtered = activeCategory ? FAQS.filter((f) => f.category === activeCategory) : FAQS;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e2e4f0] flex flex-col overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_JSON_LD }} />
      <LegalHeader backTo={"/" as any} backLabel="Back to home" />

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
