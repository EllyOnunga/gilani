import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/use-auth";
import { PLANS } from "@/lib/plans";

import {
  ArrowRight,
  BookOpenText,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  Facebook,
  Twitter,
  Instagram,
  Github,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  CalendarDays,
  BarChart3,
  ListChecks,
  Check,
  Star,
  Zap,
  Users,
  ChevronDown,
  ChevronUp,
  Trophy,
  Brain,
  Target,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GilaniAI — AI Study Assistant for Students" },
      {
        name: "description",
        content:
          "GilaniAI is your AI-powered study assistant. Get instant AI tutoring, practice quizzes, smart notes summaries, a personalised study planner, and real teacher escalation — all in one place. Start free.",
      },
      {
        name: "keywords",
        content:
          "AI tutor, study assistant, AI tutoring Kenya, online study Kenya, study planner, AI education Africa, GilaniAI",
      },
      { name: "robots", content: "index, follow" },
      // Open Graph
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gilaniai.vercel.app/" },
      { property: "og:title", content: "GilaniAI — AI Study Assistant" },
      {
        property: "og:description",
        content:
          "Your AI-powered study assistant. Socratic tutoring, quizzes, smart notes, study planner, and teacher escalation — free to start.",
      },
      { property: "og:image", content: "https://gilaniai.vercel.app/icon-512.png" },
      { property: "og:image:alt", content: "GilaniAI — Ethical AI Study Assistant" },
      // Twitter
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "GilaniAI — AI Study Assistant" },
      {
        name: "twitter:description",
        content:
          "Your AI study assistant. Quizzes, notes, planner and real teacher review — free to start.",
      },
      { name: "twitter:image", content: "https://gilaniai.vercel.app/icon-512.png" },
    ],
    links: [{ rel: "canonical", href: "https://gilaniai.vercel.app/" }],
  }),
  component: Landing,
});

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Kiswahili",
  "History & Government",
  "Geography",
  "Computer Studies",
  "Business Studies",
  "CRE",
  "Agriculture",
];

const FEATURES = [
  {
    icon: MessageCircle,
    title: "Socratic AI Tutor",
    description:
      "Ask anything and get step-by-step guidance grounded in your subject. No vague answers — just clear, precise explanations.",
    color: "from-blue-500/20 to-indigo-600/10",
    iconColor: "text-blue-500",
    badge: "Most Popular",
  },
  {
    icon: BookOpenText,
    title: "Smart Notes Summariser",
    description:
      "Upload PDFs, DOCX or paste text. GilaniAI extracts key concepts, generates flashcards and writes exam-ready summaries.",
    color: "from-emerald-500/20 to-teal-600/10",
    iconColor: "text-emerald-500",
    badge: null,
  },
  {
    icon: ListChecks,
    title: "Practice Quizzes",
    description:
      "AI-generated MCQs with difficulty tiers and deep explanations specifically targeting your weak areas.",
    color: "from-orange-500/20 to-red-600/10",
    iconColor: "text-orange-500",
    badge: null,
  },
  {
    icon: CalendarDays,
    title: "Syllabus Planner",
    description:
      "A 7-day personalised revision schedule built from your quiz history, weak topics, and exam timeline.",
    color: "from-violet-500/20 to-purple-600/10",
    iconColor: "text-violet-500",
    badge: null,
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Track mastery scores, daily streaks and study patterns over time so you always know where to focus next.",
    color: "from-pink-500/20 to-rose-600/10",
    iconColor: "text-pink-500",
    badge: null,
  },
  {
    icon: ShieldCheck,
    title: "Teacher Escalation",
    description:
      "Struggling on a concept? Escalate directly to a real human teacher for expert review and feedback.",
    color: "from-cyan-500/20 to-sky-600/10",
    iconColor: "text-cyan-500",
    badge: null,
  },
];

const TESTIMONIALS = [
  {
    name: "Amina Wanjiku",
    school: "Secondary School • Year 4",
    avatar: "AW",
    text: "GilaniAI helped me go from a D+ to a B in Mathematics. The Socratic tutor doesn't just give you answers — it makes you understand.",
    stars: 5,
    subject: "Mathematics",
  },
  {
    name: "Brian Otieno",
    school: "Secondary School • Year 3",
    avatar: "BO",
    text: "The planner is a game-changer. I finally have a study routine that fits my actual weak topics. My Chemistry is improving week by week.",
    stars: 5,
    subject: "Chemistry",
  },
  {
    name: "Fatuma Hassan",
    school: "Secondary School • Year 2",
    avatar: "FH",
    text: "I upload my notes and get a full summary in seconds. Saves hours of re-reading. The flashcards are perfect for last-minute revision.",
    stars: 5,
    subject: "Biology",
  },
];

const FAQS = [
  {
    q: "How does the AI tutor work?",
    a: "GilaniAI uses a Socratic approach — instead of just giving you answers, it asks guiding questions to help you think through problems step by step. This builds real understanding rather than dependence on AI-generated answers.",
  },
  {
    q: "Is my data private and secure?",
    a: "Yes. All your notes, chat history and personal data are stored securely and are never shared with third parties. GilaniAI does not use your personal data to train AI models. Read our Privacy Policy for full details.",
  },
  {
    q: "Can a teacher see my escalated questions?",
    a: "Yes — escalated questions are only visible to verified teachers assigned to your school. Regular AI conversations are private and visible only to you.",
  },
  {
    q: "How does the AI planner work?",
    a: "The planner analyses your quiz performance to identify weak topics, then generates a balanced 7-day revision schedule prioritising those areas. You can regenerate it any time your performance changes.",
  },
  {
    q: "Is GilaniAI free to use?",
    a: "GilaniAI is free to use. Sign up and get started with AI tutoring, quizzes, notes, and your study planner at no cost.",
  },
];

const STATS = [
  { value: "10,000+", label: "Students helped", icon: Users },
  { value: "98%", label: "Answer accuracy", icon: Target },
  { value: "4.9/5", label: "Average rating", icon: Star },
  { value: "3×", label: "Faster revision", icon: Zap },
];

function Landing() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (roles.includes("admin")) {
        navigate({ to: "/admin/users" as any });
      } else if (roles.includes("teacher")) {
        navigate({ to: "/teacher/escalations" as any });
      } else {
        navigate({ to: "/dashboard" as any });
      }
    }
  }, [user, roles, loading, navigate]);

  const [subEmail, setSubEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setSubscribed(true);
    toast.success("Thank you for subscribing to GilaniAI newsletters!");
    setSubEmail("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      {/* ── Sticky Header ── */}
      <header className="border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-30">
        <div className="flex w-full items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Logo to="/" size="md" />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-primary px-3 sm:px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden">
          {/* Background gradient blobs */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute top-20 right-0 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-orange-500/5 blur-3xl" />
          </div>

          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-24 lg:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              {/* Left column */}
              <div className="lg:col-span-7 animate-in-slide text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary mb-6">
                  <Sparkles className="h-3 w-3" />
                  Your AI-Powered Study Assistant
                </div>

                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight text-pretty">
                  Study smarter.{" "}
                  <span className="relative">
                    <span className="italic text-primary">Score higher.</span>
                    <span className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-primary/20" />
                  </span>{" "}
                  Reach your potential.
                </h1>

                <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-base sm:text-lg leading-relaxed text-muted-foreground">
                  GilaniAI is your personal AI study assistant. Instant note summaries, AI-powered quizzes, personalised revision plans — and a real teacher one tap away.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row justify-center lg:justify-start gap-3 sm:gap-4">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:scale-[1.02]"
                  >
                    Start for free <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/about"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-bold uppercase tracking-wider hover:bg-accent transition-all"
                  >
                    How it works
                  </Link>
                </div>

                {/* Trust signals */}
                <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-muted-foreground">
                  {["No credit card required", "Free to get started"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right column — feature portal cards */}
              <div className="lg:col-span-5 animate-in-slide [animation-delay:100ms] space-y-3 w-full max-w-sm mx-auto lg:max-w-none">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-center lg:text-left mb-3">
                  Your complete study suite
                </p>
                {[
                  {
                    icon: Brain,
                    label: "Socratic AI Tutor",
                    sub: "Ask anything, get step-by-step answers",
                    color: "text-blue-500 bg-blue-500/10",
                  },
                  {
                    icon: ListChecks,
                    label: "Practice Quizzes",
                    sub: "AI-generated MCQs on your weak topics",
                    color: "text-orange-500 bg-orange-500/10",
                  },
                  {
                    icon: CalendarDays,
                    label: "Study Planner",
                    sub: "7-day personalised revision calendar",
                    color: "text-violet-500 bg-violet-500/10",
                  },
                  {
                    icon: BookOpenText,
                    label: "Notes Summariser",
                    sub: "Upload & extract key concepts instantly",
                    color: "text-emerald-500 bg-emerald-500/10",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      to="/register"
                      className="flex items-center gap-4 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 hover:border-primary/50 hover:shadow-md transition-all group"
                    >
                      <div
                        className={`rounded-xl p-2.5 flex-shrink-0 ${item.color} group-hover:scale-110 transition-transform`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-serif text-sm font-bold group-hover:text-primary transition-colors">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {item.sub}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ── */}
        <section className="border-y border-border/40 bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center text-center gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="font-serif text-2xl sm:text-3xl font-black text-foreground">
                    {value}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features Section ── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
              Everything you need
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-black">
              One platform. Total revision coverage.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
              From AI tutoring to real teacher escalation — GilaniAI gives you every tool a serious
              student needs to excel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, description, color, iconColor, badge }) => (
              <div
                key={title}
                className={`relative rounded-2xl border border-border bg-gradient-to-br ${color} p-6 hover:border-primary/40 hover:shadow-lg transition-all group`}
              >
                {badge && (
                  <span className="absolute top-4 right-4 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary font-bold">
                    {badge}
                  </span>
                )}
                <div
                  className={`rounded-xl bg-background/60 backdrop-blur-sm p-3 w-fit ${iconColor} mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="bg-muted/20 border-y border-border/40">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
            <div className="text-center mb-12">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
                Simple process
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-black">
                Start improving in 3 steps
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Sign up free",
                  desc: "Create your account in under a minute. Set up your profile to personalise the AI to your learning needs.",
                },
                {
                  step: "02",
                  title: "Upload notes or ask anything",
                  desc: "Drop in your class notes for instant summaries, or start a Socratic tutoring session on any topic.",
                },
                {
                  step: "03",
                  title: "Track your progress",
                  desc: "Take quizzes, build a revision plan, and watch your mastery scores rise in the analytics dashboard.",
                },
              ].map(({ step, title, desc }) => (
                <div
                  key={step}
                  className="flex flex-col items-center text-center sm:items-start sm:text-left"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4 flex-shrink-0">
                    <span className="font-mono text-xl font-black text-primary">{step}</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Guidelines & Navigation Guide ── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 border-b border-border/40">
          <div className="text-center mb-12">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
              Application Guide & Instructions
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-black">
              How to Navigate & Use GilaniAI
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl mx-auto">
              Follow these simple guidelines to make the most out of your AI-powered study companion. Make the most out of your AI-powered study companion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "1. Socratic AI Tutor",
                badge: "Active Tutoring",
                desc: "Engage in dialogue to understand concepts deeply. The tutor uses Socratic questioning to guide you to the solution instead of just feeding you answers.",
                instructions: [
                  "Select your subject and start a study session.",
                  "Ask conceptual questions or paste difficult homework questions.",
                  "Follow the AI's leading hints to solve problems yourself."
                ],
                color: "from-blue-500/10 via-indigo-500/5 to-transparent",
                borderColor: "hover:border-blue-500/40",
              },
              {
                icon: BookOpenText,
                title: "2. Smart Notes Summariser",
                badge: "Study Materials",
                desc: "Convert heavy textbooks, lecture notes, or handwritten diagrams into concise, high-yield study summaries.",
                instructions: [
                  "Upload files up to 10MB (PDF, DOCX, or images).",
                  "Review auto-generated summaries, core definitions, and flashcards.",
                  "Export key terms or copy summaries to your note-taking app."
                ],
                color: "from-emerald-500/10 via-teal-500/5 to-transparent",
                borderColor: "hover:border-emerald-500/40",
              },
              {
                icon: ListChecks,
                title: "3. Practice Quizzes",
                badge: "Self-Assessment",
                desc: "Test your mastery with automated quizzes mapped exactly to your syllabus and target exam formats.",
                instructions: [
                  "Choose a topic and preferred difficulty tier.",
                  "Answer the multiple-choice or short-answer questions.",
                  "Read detailed explanations for every correct/incorrect response."
                ],
                color: "from-orange-500/10 via-red-500/5 to-transparent",
                borderColor: "hover:border-orange-500/40",
              },
              {
                icon: CalendarDays,
                title: "4. Personalised Planner",
                badge: "Time Management",
                desc: "Say goodbye to study block. Get a dynamic 7-day revision schedule built specifically for your learning pace.",
                instructions: [
                  "Click 'Generate Plan' in the Planner dashboard.",
                  "Let the AI aggregate your weak subject topics and deadlines.",
                  "Follow the custom task list daily to stay on track."
                ],
                color: "from-violet-500/10 via-purple-500/5 to-transparent",
                borderColor: "hover:border-violet-500/40",
              },
              {
                icon: BarChart3,
                title: "5. Performance Analytics",
                badge: "Progress Tracking",
                desc: "Keep an eye on your strengths and weaknesses. The dashboard aggregates data from all your actions.",
                instructions: [
                  "Visit the Analytics page to view your active study streak.",
                  "Inspect the accuracy gauge and overall question success rate.",
                  "Target subjects highlighted as needing review."
                ],
                color: "from-pink-500/10 via-rose-500/5 to-transparent",
                borderColor: "hover:border-pink-500/40",
              },
              {
                icon: ShieldCheck,
                title: "6. Teacher Escalation",
                badge: "Human Feedback",
                desc: "When the AI leaves you confused or you need human confirmation, escalate directly to a real teacher for expert review.",
                instructions: [
                  "Click the 'Escalate to Teacher' button in your tutor session.",
                  "A verified teacher will review the chat and leave a response.",
                  "Receive expert annotations, grades, and tips in your inbox."
                ],
                color: "from-cyan-500/10 via-sky-500/5 to-transparent",
                borderColor: "hover:border-cyan-500/40",
              }
            ].map((guide, idx) => {
              const Icon = guide.icon;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border border-border bg-gradient-to-br ${guide.color} p-6 transition-all duration-300 ${guide.borderColor} flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="rounded-xl bg-card border border-border p-2.5 w-fit text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-muted/60 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {guide.badge}
                      </span>
                    </div>
                    <h3 className="font-serif text-base font-bold text-foreground mb-2">
                      {guide.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                      {guide.desc}
                    </p>
                  </div>
                  <div className="border-t border-border/40 pt-4 mt-auto">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                      Step-by-Step Instructions:
                    </p>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {guide.instructions.map((step, sIdx) => (
                        <li key={sIdx} className="flex gap-2 items-start">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/80 mt-1.5 flex-shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-12">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
              Student stories
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-black">
              Students are scoring higher
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, school, avatar, text, stars, subject }) => (
              <div
                key={name}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90 flex-1">
                  &ldquo;{text}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-mono text-xs font-bold text-primary">{avatar}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{school}</p>
                  </div>
                  <span className="ml-auto font-mono text-[9px] text-muted-foreground border border-border px-2 py-0.5 rounded-full flex-shrink-0">
                    {subject}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing Plans Section ── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 border-b border-border/40 bg-muted/10">
          <div className="text-center mb-12">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
              Fair & Transparent Pricing
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-black">
              Choose the Plan that Fits Your Study Goals
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
              Unlock the full potential of GilaniAI. Upgrade to Premium easily using M-Pesa to study with no limits and connect with real teachers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {Object.values(PLANS).map((plan) => {
              const isPremium = plan.id === "premium";
              const isSchool = plan.id === "school";
              
              return (
                <div 
                  key={plan.id}
                  className={`relative rounded-2xl border ${
                    isPremium ? "border-2 border-primary bg-card/65 backdrop-blur-sm" : "border-border bg-card"
                  } p-6 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg transition-all duration-300`}
                >
                  {isPremium && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm whitespace-nowrap">
                      Most Popular
                    </div>
                  )}
                  <div>
                    <div className="mb-4 mt-1">
                      <span className={`rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider font-semibold ${
                        isPremium ? "bg-primary/10 text-primary" : 
                        isSchool ? "bg-violet-500/10 text-violet-500" :
                        "bg-muted/60 text-muted-foreground"
                      }`}>
                        {plan.id === "free" ? "Starter" : 
                         plan.id === "basic" ? "Basic" :
                         plan.id === "premium" ? "Monthly Saver" : "Institutional"}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl font-bold mb-1">{plan.label}</h3>
                    <p className="text-xs text-muted-foreground mb-6">{plan.description}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="font-serif text-3xl font-black text-foreground">KES {plan.price.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">
                        {plan.id === "free" ? "/ forever" : plan.id === "school" ? "/ term" : "/ month"}
                      </span>
                    </div>
                    <ul className="space-y-3 text-xs text-muted-foreground mb-8">
                      {[
                        `${plan.dailyMessages === 999999 ? "Unlimited" : plan.dailyMessages} AI tutor messages/day`,
                        `${plan.dailyQuizzes} practice quizzes/day`,
                        `${plan.dailyNotes} notes uploads/day`,
                        `${plan.dailyPlanners} syllabus planner gens/day`,
                        isPremium || isSchool ? "Priority Teacher Escalation" : "Community support"
                      ].map((feat) => (
                        <li key={feat} className="flex gap-2.5 items-start">
                          <Check className={`h-4 w-4 flex-shrink-0 ${
                            isPremium ? "text-primary" : isSchool ? "text-violet-500" : "text-emerald-500"
                          }`} />
                          <span className={isPremium ? "text-foreground/90 font-medium" : ""}>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    to="/register"
                    className={`w-full inline-flex items-center justify-center rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                      isPremium 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20" 
                        : "border border-border text-foreground hover:bg-accent"
                    }`}
                  >
                    {plan.price === 0 ? "Get Started Free" : "Upgrade Plan"}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FAQ Section ── */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center mb-10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
              Got questions?
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-black">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-sm">{q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-primary p-8 sm:p-14 text-center">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-20 right-0 h-60 w-60 rounded-full bg-white/5 blur-2xl" />
            </div>
            <Trophy className="mx-auto h-10 w-10 text-primary-foreground/80 mb-4" />
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-primary-foreground mb-3">
              Ready to ace your exams?
            </h2>
            <p className="text-primary-foreground/80 text-sm sm:text-base max-w-md mx-auto mb-8">
              Join thousands of students using GilaniAI to study smarter, score higher, and build real understanding.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-primary hover:opacity-95 transition-all shadow-lg hover:scale-[1.02]"
            >
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-2 md:grid-cols-12 gap-8 items-start">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4 space-y-4">
            <Logo to="/" size="md" />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
              Your AI-powered study assistant. Smart tutoring, quizzes, notes and planning — all in one place.
            </p>
            <div className="flex gap-4 text-muted-foreground">
              {[Facebook, Twitter, Instagram, Github].map((Icon, i) => (
                <a key={i} href="#" className="hover:text-primary transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <h4 className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
              Platform
            </h4>
            <ul className="text-xs space-y-2">
              <li>
                <Link to="/register" className="hover:text-primary transition-colors">
                  Student signup
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-primary transition-colors">
                  Teacher portal
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary transition-colors">
                  About us
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-primary transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to={"/contact" as any} className="hover:text-primary transition-colors">
                  Contact us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <h4 className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
              Legal
            </h4>
            <ul className="text-xs space-y-2">
              <li>
                <Link to="/terms" className="hover:text-primary transition-colors">
                  Terms of service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-primary transition-colors">
                  Cookie policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter + contacts */}
          <div className="col-span-2 md:col-span-4 space-y-4">
            <h4 className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
              Stay updated
            </h4>
            {subscribed ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-2 text-xs text-primary font-semibold">
                <Check className="h-4 w-4" /> Subscribed successfully!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Enter your email..."
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors uppercase tracking-wider flex-shrink-0"
                >
                  Join
                </button>
              </form>
            )}
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-primary flex-shrink-0" /> onungaelly@gmail.com
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-primary flex-shrink-0" /> 0102880577
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" /> Nairobi, Kenya
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 py-5 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest bg-muted/10 px-4">
          © {new Date().getFullYear()} GilaniAI · Built for Kenyan Students · Nairobi
        </div>
      </footer>
    </div>
  );
}
