import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/ui/logo";
import { LegalFooter } from "@/components/LegalLayout";
import {
  ArrowLeft,
  BookOpenText,
  MessageCircle,
  ShieldCheck,
  BarChart3,
  ListChecks,
  CalendarDays,
  Users,
  Zap,
  Brain,
  Target,
  GraduationCap,
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
      { property: "og:url", content: "https://gilaniai.vercel.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://gilaniai.vercel.app/about" }],
  }),
  component: About,
});

const FEATURES = [
  {
    icon: MessageCircle,
    title: "Socratic AI Tutor",
    description:
      "Asks guiding questions instead of giving direct answers — building real understanding grounded in KCSE, CBC and IGCSE standards.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: BookOpenText,
    title: "Smart Notes Summariser",
    description:
      "Upload PDFs, DOCX or paste text. GilaniAI extracts key concepts, generates flashcards and writes exam-ready summaries.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: ListChecks,
    title: "Practice Quizzes",
    description:
      "AI-generated MCQs with Kenyan real-world context, difficulty tiers, and deep explanations targeting your weak areas.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: CalendarDays,
    title: "Syllabus Planner",
    description:
      "A 7-day personalised revision schedule built from your quiz history, weak topics, and exam timeline.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Track mastery scores, daily streaks and study patterns over time so you always know where to focus next.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Teacher Escalation",
    description:
      "Struggling on a concept or feeling uncomfortable? Escalate directly to a real human teacher for expert review.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
];

const AGENTS = [
  {
    name: "Scout",
    icon: Target,
    description:
      "Keeps your revision rhythms steady. Tracks streaks, monitors exam countdowns, and sends gentle nudges when you fall behind your study plan.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    name: "Guardian",
    icon: Brain,
    description:
      "The core tutoring engine. Handles summarisation, explanation, quiz generation and note analysis — all grounded in your uploaded curriculum materials.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    name: "Hunter",
    icon: ShieldCheck,
    description:
      "The ethics and safety layer. When a response is low-confidence or a student shows distress, Hunter creates an escalation for a real teacher to review.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
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

      <main>
        {/* Hero */}
        <section className="border-b border-border/50 px-4 sm:px-6 py-12 sm:py-24 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-primary font-bold mb-6">
            About GilaniAI
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-balance leading-tight">
            A learning companion,
            <br />
            not a replacement.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-pretty max-w-2xl mx-auto">
            GilaniAI is Kenya's AI-powered study assistant built specifically for secondary school
            students. We combine curriculum-grounded AI, Socratic questioning, and real human
            teacher oversight to help students learn better — not just get answers.
          </p>
        </section>

        {/* Mission */}
        <section className="px-4 sm:px-6 py-16 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold mb-3">
                Our Mission
              </p>
              <h2 className="font-serif text-3xl font-bold mb-4">Built around three commitments</h2>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  <span className="font-semibold text-foreground">Ground every answer</span> in real
                  curriculum material from KCSE, CBC and IGCSE syllabuses — no generic internet
                  responses.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Surface uncertainty</span> instead
                  of bluffing through it. When GilaniAI doesn't know, it says so and routes you to a
                  qualified teacher.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Route hard moments</span> to real
                  humans. Students are never left alone with a difficult concept or an uncomfortable
                  situation.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TEAM_VALUES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Three Agents */}
        <section className="border-t border-border/50 bg-muted/20 px-4 sm:px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold mb-3">
                Under the Hood
              </p>
              <h2 className="font-serif text-3xl font-bold">The three agents</h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
                GilaniAI runs on three specialised AI agents that work together to deliver safe,
                effective tutoring.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {AGENTS.map(({ name, icon: Icon, description, color, bg }) => (
                <div key={name} className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <div
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${bg}`}
                  >
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className={`font-bold text-lg font-serif ${color}`}>{name}</p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Everything is auditable. Every AI turn is logged for governance and teacher review.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 sm:px-6 py-16 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold mb-3">
              Platform
            </p>
            <h2 className="font-serif text-3xl font-bold">Everything a student needs</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who it's for */}
        <section className="border-t border-border/50 bg-muted/20 px-4 sm:px-6 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold mb-3">
              Who It's For
            </p>
            <h2 className="font-serif text-3xl font-bold mb-6">Built for Kenyan learners</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              {[
                {
                  title: "KCSE Students",
                  desc: "Form 1–4 coverage across all major subjects. Exam-focused practice and revision aligned to KNEC standards.",
                },
                {
                  title: "CBC Learners",
                  desc: "Grade 7–10 support with competency-based learning activities and formative assessment tools.",
                },
                {
                  title: "IGCSE Candidates",
                  desc: "Edexcel and Cambridge curriculum support for international school students across Kenya.",
                },
              ].map(({ title, desc }) => (
                <div key={title} className="rounded-xl border border-border bg-card p-5">
                  <p className="font-semibold text-sm text-primary mb-2">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 sm:px-6 py-16 max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold mb-4">Ready to study smarter?</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Join thousands of Kenyan students already using GilaniAI to prepare for their exams.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              Start for free
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-border px-6 py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>
      <LegalFooter />

    </div>
  );
}
