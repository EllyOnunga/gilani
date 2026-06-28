import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { GilaniLoader } from "@/components/GilaniLoader";
import { useAuth } from "@/hooks/use-auth";
import { PLANS } from "@/lib/plans";

import {
  ArrowRight,
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
  BookOpen,
  GraduationCap,
  MessageSquare,
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
    gradient: "from-[#3b82f6]/20 via-[#6366f1]/10 to-transparent",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-400",
    badge: "Core Feature",
    accentColor: "border-l-blue-500",
  },
  {
    icon: ShieldCheck,
    title: "Teacher Escalation",
    description:
      "Struggling on a concept? Escalate directly to a real human teacher for expert review, annotations, and personalised feedback.",
    gradient: "from-[#06b6d4]/20 via-[#0ea5e9]/10 to-transparent",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-400",
    badge: null,
    accentColor: "border-l-cyan-500",
  },
  {
    icon: BookOpen,
    title: "Smart Notes & RAG",
    description:
      "Upload your notes, textbooks or past papers. GilaniAI indexes your materials and grounds every answer in what you've actually studied.",
    gradient: "from-[#a855f7]/20 via-[#8b5cf6]/10 to-transparent",
    iconBg: "bg-purple-500/10 border-purple-500/20",
    iconColor: "text-purple-400",
    badge: "New",
    accentColor: "border-l-purple-500",
  },
  {
    icon: GraduationCap,
    title: "Curriculum-Aligned",
    description:
      "KCSE, CBC, IGCSE and A-Level. Every answer is mapped to your exact syllabus, marking scheme, and textbook — never generic.",
    gradient: "from-[#f97316]/20 via-[#fb923c]/10 to-transparent",
    iconBg: "bg-orange-500/10 border-orange-500/20",
    iconColor: "text-orange-400",
    badge: null,
    accentColor: "border-l-orange-500",
  },
];

const TESTIMONIALS = [
  {
    name: "Amina Wanjiku",
    school: "Secondary School • Year 4",
    avatar: "AW",
    avatarBg: "from-blue-500 to-indigo-600",
    text: "GilaniAI helped me go from a D+ to a B in Mathematics. The Socratic tutor doesn't just give you answers — it makes you understand.",
    stars: 5,
    subject: "Mathematics",
  },
  {
    name: "Brian Otieno",
    school: "Secondary School • Year 3",
    avatar: "BO",
    avatarBg: "from-emerald-500 to-teal-600",
    text: "I used to dread Chemistry. Now I just open GilaniAI, ask my question, and work through it step by step. My grades have never been better.",
    stars: 5,
    subject: "Chemistry",
  },
  {
    name: "Fatuma Hassan",
    school: "Secondary School • Year 2",
    avatar: "FH",
    avatarBg: "from-rose-500 to-pink-600",
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
  { value: "10,000+", label: "Students helped", icon: Users, color: "text-blue-400" },
  { value: "98%", label: "Answer accuracy", icon: Target, color: "text-emerald-400" },
  { value: "4.9/5", label: "Average rating", icon: Star, color: "text-amber-400" },
  { value: "3×", label: "Faster revision", icon: Zap, color: "text-purple-400" },
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
    <div className="min-h-screen bg-[#0f1117] text-[#e2e4f0] flex flex-col overflow-x-hidden">
      {/* ── Sticky Header ── */}
      <header className="border-b border-white/5 sticky top-0 bg-[#0f1117]/80 backdrop-blur-xl z-30">
        <div className="flex w-full items-center justify-between px-4 sm:px-8 py-3.5 max-w-7xl mx-auto">
          <Logo to="/" size="md" />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-lg px-3 sm:px-4 py-2 text-xs font-semibold text-[#9ca3af] hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-[#d9531e] px-4 sm:px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#c44819] transition-all shadow-lg shadow-[#d9531e]/25"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ─ */}
        <section className="relative min-h-[90vh] flex items-center">
          {/* Animated gradient mesh */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(217,83,30,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(6,182,212,0.06) 0%, transparent 60%)",
              }}
            />
            {/* Subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="mx-auto max-w-7xl w-full px-4 sm:px-8 py-16 sm:py-24 lg:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
              {/* Left - WITH BACKGROUND IMAGE */}
              <div
                className="lg:col-span-6 text-center lg:text-left space-y-8 relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-12 flex flex-col justify-end min-h-[560px] sm:min-h-[580px] lg:min-h-[650px]"
                style={{
                  backgroundImage: "url('/landingphero.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "50% 20%",
                  backgroundRepeat: "no-repeat",
                }}
              >
                {/* Text readability overlay */}
                <div
                  className="absolute inset-0 z-[1]"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(15,17,23,0.75) 0%, rgba(15,17,23,0.5) 50%, rgba(15,17,23,0.2) 100%)",
                  }}
                />

                {/* Content */}
                <div className="relative z-[2] w-full">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#d9531e]/30 bg-[#d9531e]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[#d9531e] backdrop-blur-sm">
                    <Sparkles className="h-3 w-3" />
                    Kenya's #1 AI Study Assistant
                  </div>

                  <h1
                    className="font-serif text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.03] tracking-tight text-white mt-6"
                    style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9)" }}
                  >
                    Study smarter.{" "}
                    <span className="relative inline-block">
                      <span
                        className="italic"
                        style={{
                          background:
                            "linear-gradient(135deg, #d9531e 0%, #f97316 50%, #fbbf24 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          textShadow: "none",
                        }}
                      >
                        Score higher.
                      </span>
                    </span>{" "}
                    <span className="text-white/90">Reach your potential.</span>
                  </h1>

                  <p
                    className="text-base sm:text-lg leading-relaxed text-white max-w-lg mx-auto lg:mx-0 mt-6"
                    style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}
                  >
                    GilaniAI is your personal AI study study assistant — Socratic step-by-step
                    tutoring across every subject, with real teacher escalation when you need a
                    human expert.
                  </p>

                  <div className="flex flex-row justify-center lg:justify-start gap-3 mt-8">
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d9531e] px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#c44819] transition-all shadow-xl shadow-[#d9531e]/30 hover:scale-[1.02] hover:shadow-[#d9531e]/40"
                    >
                      Get Started
                    </Link>
                    <Link
                      to="/about"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-white/20 hover:border-white/30 transition-all backdrop-blur-sm"
                    >
                      Learn More
                    </Link>
                  </div>

                  <div className="flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-2 text-xs mt-6">
                    {["No credit card required", "Free to get started", "Cancel anytime"].map(
                      (t) => (
                        <span
                          key={t}
                          className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1 text-white/90"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          {t}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>

              {/* Right — premium chat mockup */}
              <div className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none">
                <div className="relative">
                  {/* Glow */}
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#d9531e]/20 via-[#6366f1]/10 to-[#06b6d4]/10 blur-2xl opacity-60" />

                  <div className="relative rounded-2xl border border-white/8 bg-[#1a1d27] shadow-2xl overflow-hidden">
                    {/* Window bar */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/6 bg-[#12151e]">
                      <div className="flex gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-red-500/70" />
                        <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                        <div className="h-3 w-3 rounded-full bg-green-500/70" />
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-[10px] font-mono text-[#6b7280]">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#d9531e] animate-pulse" />
                          AI Tutor — Active Session
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
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
                          text: "Exactly! So if we have x² + 6x, what term would we need to add to make it a perfect square? Hint: think about (x + ?)².",
                        },
                      ].map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
                        >
                          {msg.role === "ai" && (
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#d9531e] to-[#f97316] flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                              <MessageSquare className="h-3 w-3 text-white" />
                            </div>
                          )}
                          <div
                            className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${msg.role === "student"
                                ? "bg-[#d9531e] text-white rounded-br-sm"
                                : "bg-[#252836] text-[#e2e4f0] border border-white/6 rounded-bl-sm"
                              }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}

                      {/* Typing indicator */}
                      <div className="flex items-center gap-2 ml-8">
                        <div className="flex gap-1">
                          {[0, 150, 300].map((delay) => (
                            <div
                              key={delay}
                              className="h-1.5 w-1.5 rounded-full bg-[#6b7280] animate-bounce"
                              style={{ animationDelay: `${delay}ms` }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-[#6b7280]">GilaniAI is thinking…</span>
                      </div>

                      {/* Input bar */}
                      <div className="pt-2 border-t border-white/6 flex items-center gap-2 mt-3">
                        <div className="flex-1 rounded-xl bg-[#252836] border border-white/6 px-3 py-2 text-[11px] text-[#6b7280]">
                          Ask your next question…
                        </div>
                        <div className="rounded-xl bg-[#d9531e] p-2 shadow-lg shadow-[#d9531e]/30">
                          <ArrowRight className="h-3.5 w-3.5 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Bottom fade — blends hero into stats bar */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 z-10"
            style={{ background: "linear-gradient(to bottom, transparent 0%, #0f1117 100%)" }}
          />
        </section>

        {/* ── Stats Bar ── */}
        <section className="border-y border-white/6 bg-[#12151e]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ value, label, icon: Icon, color }) => (
              <div key={label} className="flex flex-col items-center text-center gap-2">
                <Icon className={`h-5 w-5 ${color} mb-1`} />
                <p className="font-serif text-3xl sm:text-4xl font-black text-white">{value}</p>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#6b7280]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-8 py-16 sm:py-24">
          <div className="mb-14 text-center lg:text-left">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#d9531e] mb-3">
              What you get
            </p>
            <h2 className="font-serif text-3xl sm:text-5xl font-black text-white">
              Everything you need to excel
            </h2>
            <p className="mt-3 text-sm text-[#9ca3af] max-w-xl lg:mx-0 mx-auto">
              Focused, powerful tools — no bloat. Just the AI tutoring and human expertise you need
              to improve.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map(
              ({
                icon: Icon,
                title,
                description,
                iconBg,
                iconColor,
                badge,
                accentColor,
                gradient,
              }) => (
                <div
                  key={title}
                  className={`relative rounded-2xl border border-white/8 bg-gradient-to-br ${gradient} p-7 hover:border-white/16 hover:shadow-xl hover:shadow-black/40 transition-all duration-300 group overflow-hidden border-l-2 ${accentColor}`}
                >
                  {/* Subtle inner glow on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/2 to-transparent rounded-2xl" />

                  {badge && (
                    <span className="absolute top-4 right-4 rounded-full bg-white/8 border border-white/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#9ca3af] font-bold">
                      {badge}
                    </span>
                  )}
                  <div
                    className={`rounded-xl border ${iconBg} p-3 w-fit mb-5 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <h3 className="font-serif text-lg font-bold mb-2.5 text-white group-hover:text-white transition-colors">
                    {title}
                  </h3>
                  <p className="text-sm text-[#9ca3af] leading-relaxed">{description}</p>
                </div>
              ),
            )}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="bg-[#12151e] border-y border-white/6">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 sm:py-24">
            <div className="mb-14 text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#d9531e] mb-3">
                Simple process
              </p>
              <h2 className="font-serif text-3xl sm:text-5xl font-black text-white">
                Start improving in 3 steps
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-7 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-[#d9531e]/30 to-transparent" />
              {[
                {
                  step: "01",
                  title: "Sign up free",
                  desc: "Create your account in under a minute. Set your curriculum and subjects to personalise the AI to your learning needs.",
                  icon: GraduationCap,
                },
                {
                  step: "02",
                  title: "Ask anything",
                  desc: "Start a Socratic tutoring session on any topic. The AI guides you with questions, hints and step-by-step explanations.",
                  icon: MessageSquare,
                },
                {
                  step: "03",
                  title: "Escalate when stuck",
                  desc: "If the AI isn't enough, escalate to a real verified teacher who will review your question and respond with expert feedback.",
                  icon: ShieldCheck,
                },
              ].map(({ step, title, desc, icon: Icon }) => (
                <div key={step} className="flex flex-col items-center text-center group">
                  <div className="relative mb-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d9531e]/10 border border-[#d9531e]/20 group-hover:bg-[#d9531e]/20 group-hover:border-[#d9531e]/40 transition-all duration-300">
                      <span className="font-mono text-xl font-black text-[#d9531e]">{step}</span>
                    </div>
                  </div>
                  <div className="mb-3 rounded-xl bg-white/4 border border-white/6 p-2 w-fit mx-auto">
                    <Icon className="h-4 w-4 text-[#9ca3af]" />
                  </div>
                  <h3 className="font-serif text-xl font-bold mb-2 text-white">{title}</h3>
                  <p className="text-sm text-[#9ca3af] leading-relaxed max-w-xs">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-8 py-16 sm:py-24">
          <div className="mb-14 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#d9531e] mb-3">
              Student stories
            </p>
            <h2 className="font-serif text-3xl sm:text-5xl font-black text-white">
              Students are scoring higher
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, school, avatar, avatarBg, text, stars, subject }) => (
              <div
                key={name}
                className="rounded-2xl border border-white/8 bg-[#1a1d27] p-6 hover:border-white/14 hover:shadow-xl hover:shadow-black/40 transition-all duration-300 flex flex-col gap-4 group"
              >
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-[#c9cce0] flex-1 italic">
                  &ldquo;{text}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/6">
                  <div
                    className={`h-9 w-9 rounded-full bg-gradient-to-br ${avatarBg} flex items-center justify-center flex-shrink-0 shadow-lg`}
                  >
                    <span className="font-mono text-[10px] font-bold text-white">{avatar}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{name}</p>
                    <p className="text-[10px] text-[#6b7280] truncate">{school}</p>
                  </div>
                  <span className="font-mono text-[9px] text-[#9ca3af] border border-white/10 bg-white/4 px-2 py-0.5 rounded-full flex-shrink-0">
                    {subject}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="border-y border-white/6 bg-[#12151e]">
          <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 sm:py-24">
            <div className="mb-14 text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#d9531e] mb-3">
                Fair &amp; Transparent Pricing
              </p>
              <h2 className="font-serif text-3xl sm:text-5xl font-black text-white">
                Choose your plan
              </h2>
              <p className="mt-3 text-sm text-[#9ca3af] max-w-xl mx-auto">
                Upgrade easily using M-Pesa to study with no limits and connect with real teachers.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-5 items-stretch">
              {Object.values(PLANS).map((plan) => {
                const isPremium = plan.id === "premium";
                const isSchool = plan.id === "school";
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl flex flex-col justify-between w-full sm:w-[calc(50%-10px)] lg:w-[calc(25%-15px)] min-w-[220px] max-w-[290px] p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${isPremium
                        ? "border-2 border-[#d9531e] bg-[#1a1d27] shadow-xl shadow-[#d9531e]/10"
                        : "border border-white/8 bg-[#1a1d27]"
                      }`}
                  >
                    {isPremium && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#d9531e] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-white shadow-lg whitespace-nowrap">
                        Most Popular
                      </div>
                    )}
                    <div>
                      <div className="mb-4 mt-1">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider font-semibold ${isPremium
                              ? "bg-[#d9531e]/15 text-[#d9531e]"
                              : isSchool
                                ? "bg-purple-500/10 text-purple-400"
                                : "bg-white/6 text-[#9ca3af]"
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
                      <h3 className="font-serif text-xl font-bold mb-1 text-white">{plan.label}</h3>
                      <p className="text-xs text-[#9ca3af] mb-6">{plan.description}</p>
                      <div className="flex items-baseline gap-1 mb-6">
                        <span className="font-serif text-3xl font-black text-white">
                          KES{plan.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-[#9ca3af]">
                          {plan.id === "free"
                            ? "/ forever"
                            : plan.id === "school"
                              ? "/ term"
                              : "/ month"}
                        </span>
                      </div>
                      <ul className="space-y-2.5 text-xs text-[#9ca3af] mb-8">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex gap-2.5 items-start">
                            <Check
                              className={`h-4 w-4 flex-shrink-0 ${isPremium
                                  ? "text-[#d9531e]"
                                  : isSchool
                                    ? "text-purple-400"
                                    : "text-emerald-500"
                                }`}
                            />
                            <span className={isPremium ? "text-white/90 font-medium" : ""}>
                              {feat}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Link
                      to="/register"
                      className={`w-full inline-flex items-center justify-center rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all ${isPremium
                          ? "bg-[#d9531e] text-white hover:bg-[#c44819] shadow-lg shadow-[#d9531e]/20"
                          : "border border-white/10 text-[#9ca3af] hover:bg-white/6 hover:text-white"
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
        <section className="mx-auto max-w-3xl px-4 sm:px-8 py-16 sm:py-24">
          <div className="mb-12 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#d9531e] mb-3">
              Got questions?
            </p>
            <h2 className="font-serif text-3xl sm:text-5xl font-black text-white">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/8 bg-[#1a1d27] overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left gap-4 hover:bg-white/2 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-sm text-white">{q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-[#d9531e]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-[#6b7280]" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-0 border-t border-white/6">
                    <p className="text-sm text-[#9ca3af] leading-relaxed pt-4">{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-8 pb-16 sm:pb-24">
          <div
            className="relative overflow-hidden rounded-3xl p-10 sm:p-20 text-center"
            style={{
              background: "linear-gradient(135deg, #d9531e 0%, #c44819 40%, #1a1d27 100%)",
            }}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
              <div className="absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-black/20 blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/10 border border-white/20 mb-8 mx-auto">
                <Trophy className="h-7 w-7 text-white" />
              </div>
              <h2 className="font-serif text-4xl sm:text-5xl font-black text-white mb-5">
                Ready to ace your exams?
              </h2>
              <p className="text-white/70 text-base max-w-md mx-auto mb-10 leading-relaxed">
                Join thousands of students using GilaniAI to study smarter, score higher, and build
                real understanding.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold uppercase tracking-wider text-[#d9531e] hover:bg-white/90 transition-all shadow-2xl shadow-black/30 hover:scale-[1.02]"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/6 bg-[#0c0e14]">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 py-10 sm:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-center sm:text-left">
          {/* Brand */}
          <div className="flex flex-col items-center sm:items-start gap-4">
            <Logo to="/" size="md" />
            <p className="text-xs text-[#6b7280] leading-relaxed max-w-[220px]">
              Your AI-powered study assistant. Socratic tutoring and real teacher escalation — all
              in one place.
            </p>
            <div className="flex gap-4 text-[#6b7280]">
              {[Facebook, Twitter, Instagram, Github].map((Icon, i) => (
                <a key={i} href="#" className="hover:text-[#d9531e] transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="flex flex-col items-center sm:items-start gap-3">
            <h4 className="font-mono text-[9px] uppercase tracking-widest text-[#6b7280] font-bold">
              Platform
            </h4>
            <ul className="text-xs space-y-2.5">
              {[
                { label: "Student signup", to: "/register" },
                { label: "Teacher portal", to: "/register" },
                { label: "About us", to: "/about" },
                { label: "FAQ", to: "/faq" },
                { label: "Contact us", to: "/contact" },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to as any}
                    className="text-[#9ca3af] hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="flex flex-col items-center sm:items-start gap-3">
            <h4 className="font-mono text-[9px] uppercase tracking-widest text-[#6b7280] font-bold">
              Legal
            </h4>
            <ul className="text-xs space-y-2.5">
              {[
                { label: "Terms of service", to: "/terms" },
                { label: "Privacy policy", to: "/privacy" },
                { label: "Cookie policy", to: "/cookies" },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to as any}
                    className="text-[#9ca3af] hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter + contact */}
          <div className="flex flex-col items-center sm:items-start gap-4">
            <h4 className="font-mono text-[9px] uppercase tracking-widest text-[#6b7280] font-bold">
              Stay updated
            </h4>
            {subscribed ? (
              <div className="rounded-xl border border-[#d9531e]/20 bg-[#d9531e]/8 p-3 flex items-center gap-2 text-xs text-[#d9531e] font-semibold">
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
                  className="flex-1 min-w-0 rounded-lg border border-white/8 bg-[#1a1d27] px-3 py-2 text-xs text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-1 focus:ring-[#d9531e]/50"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#d9531e] px-3 py-2 text-xs font-bold text-white hover:bg-[#c44819] transition-colors uppercase tracking-wider flex-shrink-0"
                >
                  Join
                </button>
              </form>
            )}
            <div className="flex flex-col gap-2 text-xs text-[#6b7280]">
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#d9531e] flex-shrink-0" />
                support@gilaniai.site
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[#d9531e] flex-shrink-0" />
                0710 297 603
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-[#d9531e] flex-shrink-0" />
                Nairobi, Kenya
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/4 py-5 text-center text-[10px] font-mono text-[#6b7280] uppercase tracking-widest bg-[#0c0e14] px-4">
          © {new Date().getFullYear()} GilaniAI · Built for Kenyan Students · Nairobi
        </div>
      </footer>

      {/* ── WhatsApp Floating Button ── */}
      <a
        href="https://wa.me/254710297603"
        target="_blank"
        rel="noopener noreferrer"
        id="whatsapp-float-btn"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-6 right-6 z-50 group"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[#25d366] animate-ping opacity-30 group-hover:opacity-0 transition-opacity" />
        {/* Button */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl shadow-[#25d366]/40 hover:scale-110 transition-transform duration-200 overflow-hidden bg-[#25d366]">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
            alt="WhatsApp"
            className="h-8 w-8"
            loading="lazy"
          />
        </div>
      </a>
    </div>
  );
}
