import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { GilaniLoader } from "@/components/GilaniLoader";
import { useAuth } from "@/hooks/use-auth";
import { PLANS } from "@/lib/plans";

import {
  ArrowRight,
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
          "GilaniAI is your AI-powered study assistant. Get instant Socratic AI tutoring and real teacher escalation — all in one place. Start free.",
      },
      {
        name: "keywords",
        content:
          "AI tutor, study assistant, AI tutoring Kenya, online study Kenya, AI education Africa, GilaniAI",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gilaniai.site/" },
      { property: "og:title", content: "GilaniAI — AI Study Assistant" },
      {
        property: "og:description",
        content:
          "Your AI-powered study assistant. Socratic tutoring and teacher escalation — free to start.",
      },
      { property: "og:image", content: "https://gilaniai.site/icon-512.png" },
      { property: "og:image:alt", content: "GilaniAI — Ethical AI Study Assistant" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "GilaniAI — AI Study Assistant" },
      {
        name: "twitter:description",
        content:
          "Your AI study assistant. Socratic tutoring and real teacher review — free to start.",
      },
      { name: "twitter:image", content: "https://gilaniai.site/icon-512.png" },
    ],
    links: [{ rel: "canonical", href: "https://gilaniai.site/" }],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Brain,
    title: "Socratic AI Tutor",
    description:
      "Ask anything and get step-by-step guidance grounded in your syllabus. No vague answers — just clear, precise explanations that build real understanding.",
    color: "from-blue-500/20 to-indigo-600/10",
    iconColor: "text-blue-500",
    badge: "Core Feature",
  },
  {
    icon: ShieldCheck,
    title: "Teacher Escalation",
    description:
      "Struggling on a concept? Escalate directly to a real human teacher for expert review, annotations, and personalised feedback.",
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
    text: "I used to dread Chemistry. Now I just open GilaniAI, ask my question, and work through it step by step. My grades have never been better.",
    stars: 5,
    subject: "Chemistry",
  },
  {
    name: "Fatuma Hassan",
    school: "Secondary School • Year 2",
    avatar: "FH",
    text: "When I got stuck on a Biology concept the AI couldn't fully resolve, I escalated to a teacher and got a detailed response the same day.",
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
    a: "Yes. All your chat history and personal data are stored securely and are never shared with third parties. GilaniAI does not use your personal data to train AI models. Read our Privacy Policy for full details.",
  },
  {
    q: "Can a teacher see my escalated questions?",
    a: "Yes — escalated questions are only visible to verified teachers assigned to your school. Regular AI conversations are private and visible only to you.",
  },
  {
    q: "Is GilaniAI free to use?",
    a: "GilaniAI is free to get started. Sign up and begin AI tutoring at no cost. Premium plans unlock higher daily message limits and priority teacher escalation.",
  },
  {
    q: "Which subjects and curricula does GilaniAI cover?",
    a: "GilaniAI supports KCSE, CBC, and IGCSE curricula across all major subjects including Mathematics, Physics, Chemistry, Biology, English, Kiswahili, History, Geography, and more.",
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

  if (loading || user) {
    return <GilaniLoader />;
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: subEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubscribed(true);
      toast.success(data.message || "Thank you for subscribing to GilaniAI newsletters!");
      setSubEmail("");
    } catch (err: any) {
      toast.error(err?.message ?? "Subscription failed. Try again.");
    }
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
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute top-20 right-0 h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-orange-500/5 blur-3xl" />
          </div>

          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-20 lg:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              {/* Left */}
              <div className="lg:col-span-7 animate-in-slide text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-8">
                  <Sparkles className="h-3 w-3" />
                  Your AI-Powered Study Assistant
                </div>

                <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight text-pretty">
                  Study smarter.{" "}
                  <span className="relative">
                    <span className="italic text-primary">Score higher.</span>
                    <span className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-primary/20" />
                  </span>{" "}
                  Reach your potential.
                </h1>

                <p className="mt-6 max-w-lg mx-auto lg:mx-0 text-base sm:text-lg leading-relaxed text-muted-foreground/80">
                  GilaniAI is your personal AI study assistant — Socratic step-by-step tutoring
                  across every subject, with real teacher escalation when you need a human expert.
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-transparent px-6 py-3.5 text-sm font-bold uppercase tracking-wider hover:bg-muted/50 transition-all"
                  >
                    How it works
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-muted-foreground">
                  {["No credit card required", "Free to get started"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right — chat mockup */}
              <div className="lg:col-span-5 animate-in-slide [animation-delay:100ms] w-full max-w-sm mx-auto lg:max-w-none">
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 shadow-xl ring-1 ring-border/20 space-y-3">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      AI Tutor — Active Session
                    </p>
                  </div>
                  {[
                    {
                      role: "student",
                      text: "I don't understand how to solve quadratic equations by completing the square.",
                    },
                    {
                      role: "ai",
                      text: "Good question. Before I show you, tell me — what does it mean to 'complete' a square geometrically?",
                    },
                    { role: "student", text: "Umm… making it a perfect square trinomial?" },
                    {
                      role: "ai",
                      text: "Exactly. So if we have x² + 6x, what term would we add to make it a perfect square?",
                    },
                  ].map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.role === "student"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground border border-border/50"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border/50 flex items-center gap-2">
                    <div className="flex-1 rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
                      Ask your next question…
                    </div>
                    <div className="rounded-lg bg-primary p-2">
                      <ArrowRight className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ── */}
        <section className="border-y border-border/60 bg-foreground text-background">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center text-center gap-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="font-serif text-2xl sm:text-4xl font-black text-background">
                    {value}
                  </p>
                </div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-background/50">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-20">
          <div className="mb-12">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
              What you get
            </p>
            <h2 className="font-serif text-3xl sm:text-5xl font-black">
              Everything you need to excel
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl">
              Focused, powerful tools — no bloat. Just the AI tutoring and human expertise you need
              to improve.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {FEATURES.map(({ icon: Icon, title, description, color, iconColor, badge }) => (
              <div
                key={title}
                className="relative rounded-2xl border border-border bg-muted/30 p-7 hover:border-primary/40 hover:shadow-md transition-all group border-l-2 border-l-primary"
              >
                {badge && (
                  <span className="absolute top-4 right-4 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary font-bold">
                    {badge}
                  </span>
                )}
                <div className="rounded-xl border border-border bg-background p-3 w-fit text-primary mb-5 group-hover:scale-105 transition-transform">
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
        <section className="bg-muted/30 border-y border-border/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-20">
            <div className="mb-12">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
                Simple process
              </p>
              <h2 className="font-serif text-3xl sm:text-5xl font-black">
                Start improving in 3 steps
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Sign up free",
                  desc: "Create your account in under a minute. Set your curriculum and subjects to personalise the AI to your learning needs.",
                },
                {
                  step: "02",
                  title: "Ask anything",
                  desc: "Start a Socratic tutoring session on any topic. The AI guides you with questions, hints and step-by-step explanations.",
                },
                {
                  step: "03",
                  title: "Escalate when stuck",
                  desc: "If the AI isn't enough, escalate to a real verified teacher who will review your question and respond with expert feedback.",
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

        {/* ── Testimonials ── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-20">
          <div className="mb-12">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
              Student stories
            </p>
            <h2 className="font-serif text-3xl sm:text-5xl font-black">
              Students are scoring higher
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, school, avatar, text, stars, subject }) => (
              <div
                key={name}
                className="rounded-2xl border border-border bg-muted/30 p-6 hover:shadow-md transition-shadow flex flex-col gap-4"
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

        {/* ── Pricing ── */}
        <section className="border-y border-border/40 bg-muted/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-20">
            <div className="mb-12">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
                Fair & Transparent Pricing
              </p>
              <h2 className="font-serif text-3xl sm:text-5xl font-black">Choose your plan</h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-xl">
                Upgrade easily using M-Pesa to study with no limits and connect with real teachers.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 items-stretch">
              {Object.values(PLANS).map((plan) => {
                const isPremium = plan.id === "premium";
                const isSchool = plan.id === "school";
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl border flex flex-col justify-between w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] min-w-[220px] max-w-[300px] p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                      isPremium
                        ? "border-2 border-primary bg-muted/40"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    {isPremium && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm whitespace-nowrap">
                        Most Popular
                      </div>
                    )}
                    <div>
                      <div className="mb-4 mt-1">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider font-semibold ${
                            isPremium
                              ? "bg-primary/10 text-primary"
                              : isSchool
                                ? "bg-violet-500/10 text-violet-500"
                                : "bg-muted/60 text-muted-foreground"
                          }`}
                        >
                          {plan.id === "free"
                            ? "Starter"
                            : plan.id === "basic"
                              ? "Basic"
                              : plan.id === "premium"
                                ? "Monthly Saver"
                                : "Institutional"}
                        </span>
                      </div>
                      <h3 className="font-serif text-xl font-bold mb-1">{plan.label}</h3>
                      <p className="text-xs text-muted-foreground mb-6">{plan.description}</p>
                      <div className="flex items-baseline gap-1 mb-6">
                        <span className="font-serif text-3xl font-black text-foreground">
                          KES{plan.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {plan.id === "free"
                            ? "/ forever"
                            : plan.id === "school"
                              ? "/ term"
                              : "/ month"}
                        </span>
                      </div>
                      <ul className="space-y-3 text-xs text-muted-foreground mb-8">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex gap-2.5 items-start">
                            <Check
                              className={`h-4 w-4 flex-shrink-0 ${isPremium ? "text-primary" : isSchool ? "text-violet-500" : "text-emerald-500"}`}
                            />
                            <span className={isPremium ? "text-foreground/90 font-medium" : ""}>
                              {feat}
                            </span>
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
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-20">
          <div className="mb-10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
              Got questions?
            </p>
            <h2 className="font-serif text-3xl sm:text-5xl font-black">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/20 overflow-hidden">
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
          <div className="relative overflow-hidden rounded-2xl bg-foreground p-8 sm:p-16 text-center">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-20 right-0 h-60 w-60 rounded-full bg-white/5 blur-2xl" />
            </div>
            <Trophy className="mx-auto h-10 w-10 text-background/40 mb-6" />
            <h2 className="font-serif text-3xl sm:text-5xl font-black text-background mb-4">
              Ready to ace your exams?
            </h2>
            <p className="text-background/60 text-base max-w-md mx-auto mb-10">
              Join thousands of students using GilaniAI to study smarter, score higher, and build
              real understanding.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-background px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-foreground hover:opacity-90 transition-all shadow-lg hover:scale-[1.02]"
            >
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center sm:text-left">
          {/* Brand */}
          <div className="flex flex-col items-center sm:items-start gap-4 min-w-[200px]">
            <Logo to="/" size="md" />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
              Your AI-powered study assistant. Socratic tutoring and real teacher escalation — all
              in one place.
            </p>
            <div className="flex gap-4 text-muted-foreground">
              {[Facebook, Twitter, Instagram, Github].map((Icon, i) => (
                <a key={i} href="#" className="hover:text-primary transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform links */}
          <div className="flex flex-col items-center sm:items-start gap-3">
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
          <div className="flex flex-col items-center sm:items-start gap-3">
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

          {/* Newsletter + contact */}
          <div className="flex flex-col items-center sm:items-start gap-4 min-w-[240px]">
            <h4 className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
              Stay updated
            </h4>
            {subscribed ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-2 text-xs text-primary font-semibold">
                <Check className="h-4 w-4" /> Subscribed successfully!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2 w-full">
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
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
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
