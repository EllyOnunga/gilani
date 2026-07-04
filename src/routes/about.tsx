import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/ui/logo";
import { LegalFooter } from "@/components/LegalLayout";
import {
  ArrowLeft,
  ShieldCheck,
  Users,
  Zap,
  Brain,
  Target,
  GraduationCap,
  Sparkles,
  BookOpen,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How GilaniAI Works — Ethical AI Tutoring for Kenyan Students" },
      {
        name: "description",
        content:
          "Learn how GilaniAI combines curriculum-grounded AI, Socratic questioning, and human teacher oversight to help KCSE, CBC and IGCSE students study more effectively and ethically.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "How GilaniAI Works — Ethical AI Tutoring" },
      {
        property: "og:description",
        content:
          "AI tutoring grounded in Kenyan curriculum standards with real teacher escalation built in.",
      },
      { property: "og:url", content: "https://gilaniai.site/about" },
    ],
    links: [{ rel: "canonical", href: "https://gilaniai.site/about" }],
  }),
  component: About,
});

const AGENTS = [
  {
    name: "Scout",
    icon: Target,
    description:
      "Keeps your revision rhythms steady. Right in the chat, it tracks exam countdowns and gently nudges you to stay consistent with your studying.",
    iconColor: "text-orange-400",
    bg: "from-orange-500/20 via-orange-500/5 to-transparent",
    accent: "border-l-orange-500",
  },
  {
    name: "Guardian",
    icon: Brain,
    description:
      "The core tutoring engine. Handles summarisation, explanation, and quiz practice — all grounded in your uploaded curriculum materials, right in the conversation.",
    iconColor: "text-blue-400",
    bg: "from-blue-500/20 via-blue-500/5 to-transparent",
    accent: "border-l-blue-500",
  },
  {
    name: "Hunter",
    icon: ShieldCheck,
    description:
      "The ethics and safety layer. When a response is low-confidence or a student shows distress, Hunter creates an escalation for a real teacher to review.",
    iconColor: "text-emerald-400",
    bg: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    accent: "border-l-emerald-500",
  },
];

const TEAM_VALUES = [
  {
    icon: GraduationCap,
    title: "Curriculum First",
    description:
      "Every AI response is grounded in official KCSE, CBC and IGCSE syllabus content — not generic internet knowledge.",
  },
  {
    icon: Users,
    title: "Human Oversight",
    description:
      "Teachers remain in the loop. Students can escalate any session to a qualified human reviewer at any time.",
  },
  {
    icon: Zap,
    title: "Honest AI",
    description:
      "GilaniAI surfaces uncertainty instead of bluffing. When it doesn't know, it says so and routes you to a teacher.",
  },
  {
    icon: ShieldCheck,
    title: "Student Safety",
    description:
      "Designed with safeguards for young learners. Content is moderated, sessions are logged, and nothing inappropriate passes through.",
  },
];

function About() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e2e4f0] flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-white/5 sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-xl z-30">
        <div className="flex w-full items-center justify-between px-4 sm:px-8 py-3.5 max-w-7xl mx-auto">
          <Logo to="/" size="md" />
          <nav className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9ca3af] hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
            <Link
              to="/"
              search={{ authModalOpen: true } as any}
              className="rounded-lg bg-[#d9531e] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#c44819] transition-all shadow-lg shadow-[#d9531e]/25"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 sm:py-28 border-b border-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(217,83,30,0.1),transparent_60%)]" />
          </div>
          <div className="relative max-w-3xl mx-auto px-4 sm:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d9531e]/30 bg-[#d9531e]/8 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[#d9531e] mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              About GilaniAI
            </div>
            <h1 className="font-serif text-4xl sm:text-6xl font-black leading-tight text-white">
              A learning companion,
              <br />
              <span className="text-[#d9531e] italic">not a replacement.</span>
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-[#9ca3af] max-w-2xl mx-auto">
              GilaniAI is Kenya's AI-powered study assistant built specifically for secondary school
              students. We combine curriculum-grounded AI, Socratic questioning, and real human
              teacher oversight to help students learn better — not just get answers.
            </p>
          </div>
        </section>

        {/* Mission / Commitments */}
        <section className="px-4 sm:px-8 py-16 sm:py-24 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#d9531e] font-bold">
                Our Mission
              </p>
              <h2 className="font-serif text-3xl sm:text-5xl font-black text-white">
                Built around three commitments
              </h2>
              <div className="space-y-4 text-sm sm:text-base text-[#9ca3af] leading-relaxed">
                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <span className="font-semibold text-white">Ground every answer</span> in real
                    curriculum material from KCSE, CBC and IGCSE syllabuses — no generic internet
                    responses.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <span className="font-semibold text-white">Surface uncertainty</span> instead of
                    bluffing through it. When GilaniAI doesn't know, it says so and routes you to a
                    qualified teacher.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <span className="font-semibold text-white">Route hard moments</span> to real
                    humans. Students are never left alone with a difficult concept or an
                    uncomfortable situation.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TEAM_VALUES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/8 bg-[#1a1d27] p-5 space-y-3 hover:border-white/14 transition-colors"
                >
                  <Icon className="h-5 w-5 text-[#d9531e]" />
                  <p className="font-serif text-sm font-bold text-white">{title}</p>
                  <p className="text-xs text-[#9ca3af] leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Three Agents */}
        <section className="bg-[#050505] border-y border-white/6 px-4 sm:px-8 py-16 sm:py-24">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#d9531e] font-bold">
                Under the Hood
              </p>
              <h2 className="font-serif text-3xl sm:text-5xl font-black text-white">
                The three agents
              </h2>
              <p className="text-sm text-[#9ca3af] leading-relaxed">
                GilaniAI runs on three specialised AI agents that work together to deliver safe,
                effective tutoring.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {AGENTS.map(({ name, icon: Icon, description, iconColor, bg, accent }) => (
                <div
                  key={name}
                  className={`rounded-2xl border border-white/8 bg-gradient-to-br ${bg} p-6 space-y-4 hover:border-white/14 transition-all duration-300 border-l-2 ${accent}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/8">
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-white">{name}</h3>
                    <p className="mt-2 text-xs sm:text-sm text-[#9ca3af] leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-[#6b7280]">
              Everything is auditable. Every AI turn is logged for governance and teacher review.
            </p>
          </div>
        </section>

        {/* Who it's for */}
        <section className="px-4 sm:px-8 py-16 sm:py-24">
          <div className="max-w-5xl mx-auto text-center space-y-10">
            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#d9531e] font-bold">
                Who It's For
              </p>
              <h2 className="font-serif text-3xl sm:text-5xl font-black text-white">
                Built for Kenyan learners
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
              {[
                {
                  title: "KCSE Students",
                  desc: "Form 1–4 coverage across all major subjects. Exam-focused practice and revision aligned to KNEC standards.",
                  badge: "National Exam",
                },
                {
                  title: "CBC Learners",
                  desc: "Grade 7–10 support with competency-based learning activities and formative assessment tools.",
                  badge: "Curriculum Reform",
                },
                {
                  title: "IGCSE Candidates",
                  desc: "Edexcel and Cambridge curriculum support for international school students across Kenya.",
                  badge: "International",
                },
              ].map(({ title, desc, badge }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/8 bg-[#1a1d27] p-6 hover:border-white/14 transition-colors flex flex-col justify-between h-full"
                >
                  <div className="space-y-3">
                    <span className="rounded-full bg-white/4 border border-white/8 px-2 py-0.5 font-mono text-[9px] text-[#9ca3af]">
                      {badge}
                    </span>
                    <h3 className="font-serif text-base font-bold text-white mt-2">{title}</h3>
                    <p className="text-xs text-[#9ca3af] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 sm:px-8 py-16 sm:py-20 max-w-3xl mx-auto text-center space-y-8">
          <div
            className="rounded-3xl p-10 sm:p-14"
            style={{
              background: "linear-gradient(135deg, #d9531e 0%, #c44819 40%, #1a1d27 100%)",
            }}
          >
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-white">
              Ready to study smarter?
            </h2>
            <p className="text-sm text-white/70 max-w-md mx-auto mt-3 mb-8 leading-relaxed">
              Join thousands of Kenyan students already using GilaniAI to prepare for their exams.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/"
                search={{ authModalOpen: true } as any}
                className="rounded-xl bg-white px-7 py-3 text-sm font-bold uppercase tracking-wider text-[#d9531e] hover:bg-white/90 transition-all shadow-lg hover:scale-[1.02]"
              >
                Start for free
              </Link>
              <Link
                to="/"
                search={{ authModalOpen: true } as any}
                className="rounded-xl border border-white/20 bg-white/5 px-7 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-all"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}
