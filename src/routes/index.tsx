import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { 
  ArrowRight, BookOpenText, MessageCircle, Sparkles, ShieldCheck, 
  Facebook, Twitter, Instagram, Github, Mail, Phone, MapPin, 
  GraduationCap, ClipboardList, Settings, Check 
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GilaniAI — Ethical AI Learning Assistant" },
      {
        name: "description",
        content:
          "Curriculum-grounded AI tutoring, study planning, notes summarization, and quizzes for KCSE and CBC students.",
      },
    ],
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
  "Business Studies"
];

function Landing() {
  const [subEmail, setSubEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setSubscribed(true);
    toast.success("Thank you for subscribing to GilaniAI newsletters!");
    setSubEmail("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between overflow-x-hidden">
      {/* Premium Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-serif text-2xl font-black italic tracking-tight text-primary hover:opacity-90 transition-opacity">
            GilaniAI
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24 text-center sm:text-left grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 animate-in-slide">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-primary mb-6">
              <Sparkles className="h-3 w-3" /> Personalized Curriculum Tutor
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-pretty">
              A companion that knows your syllabus —{" "}
              <span className="italic underline decoration-primary/30 decoration-4 underline-offset-4">
                and respects your growth
              </span>
              .
            </h1>
            <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground text-balance">
              GilaniAI is curriculum-grounded. Upload study notes for instant summaries, practice custom revision quizzes, plan your revision calendars, and escalate questions directly to a real teacher when you need support.
            </p>
            <div className="mt-8 flex flex-wrap justify-center sm:justify-start gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-all shadow hover:scale-[1.01]"
              >
                Start Revision <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-bold uppercase tracking-wider hover:bg-accent transition-all"
              >
                How it works
              </Link>
            </div>
          </div>

          {/* Graphical Portal Selector Side */}
          <div className="lg:col-span-5 animate-in-slide [animation-delay:100ms] grid gap-4 w-full max-w-md mx-auto">
            <h3 className="font-serif text-lg font-bold text-center lg:text-left mb-2 text-muted-foreground uppercase tracking-widest text-xs font-mono">
              Choose your pathway:
            </h3>
            
            <Link
              to="/register"
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="rounded-xl bg-blue-500/10 p-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h4 className="font-serif text-lg font-bold group-hover:text-primary transition-colors">Student Hub</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Revision planning, quizzes, and live chat assistance.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              to="/register"
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="rounded-xl bg-emerald-500/10 p-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h4 className="font-serif text-lg font-bold group-hover:text-primary transition-colors">Teacher Portal</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Manage escalations, view records, and help students.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              to="/register"
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="rounded-xl bg-purple-500/10 p-3.5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                <Settings className="h-6 w-6" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h4 className="font-serif text-lg font-bold group-hover:text-primary transition-colors">Admin Center</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Configure system users, control roles, and view logs.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </section>

        {/* Subjects Infinitely Scrolling Marquee */}
        <section className="py-12 bg-muted/10 border-y border-border/40 overflow-hidden relative w-full">
          <div className="mx-auto max-w-6xl px-6 mb-6 text-center">
            <h3 className="font-serif text-xl font-bold">Curriculum Subjects We Ground In</h3>
            <p className="text-xs text-muted-foreground mt-1">Pauses on hover. Scroll infinitely through our academic standards.</p>
          </div>
          <div className="relative w-full overflow-hidden py-1">
            <div className="flex gap-6 animate-marquee whitespace-nowrap">
              {/* Set 1 */}
              {SUBJECTS.map((sub, idx) => (
                <div key={`sub1-${idx}`} className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border/60 shadow-sm select-none">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="font-serif text-sm font-bold text-foreground">{sub}</span>
                </div>
              ))}
              {/* Set 2 (for seamless loop) */}
              {SUBJECTS.map((sub, idx) => (
                <div key={`sub2-${idx}`} className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border/60 shadow-sm select-none">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="font-serif text-sm font-bold text-foreground">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-3xl font-bold text-center mb-12">Academic Revision Features</h2>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { i: MessageCircle, t: "Socratic AI Tutor", d: "Ask questions, get syllabus-grounded step-by-step guidance." },
              { i: BookOpenText, t: "Notes Summarizer", d: "Upload local notes to produce immediate core takeaways." },
              { i: Sparkles, t: "Practice Quizzes", d: "Dynamic revision tests targeting your weak conceptual zones." },
              { i: ShieldCheck, t: "Human Teacher Review", d: "Easily flag low-confidence subjects for teacher escalation." },
            ].map(({ i: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm hover:border-primary/40 hover:shadow transition-all flex flex-col justify-between">
                <div>
                  <div className="rounded-xl bg-primary/10 p-3 text-primary w-fit">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-bold">{t}</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Premium Multi-Column Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-16 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Logo & Slogan Column */}
          <div className="md:col-span-4 space-y-4">
            <h2 className="font-serif text-2xl font-black italic text-primary">GilaniAI</h2>
            <p className="text-xs text-muted-foreground leading-relaxed pr-4">
              Grounding academic performance in ethical assistance, step-by-step Socratic learning, and direct human teacher connectivity.
            </p>
            {/* Social Icons using Lucide */}
            <div className="flex gap-4 text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors" title="Facebook"><Facebook className="h-4 w-4" /></a>
              <a href="#" className="hover:text-primary transition-colors" title="Twitter"><Twitter className="h-4 w-4" /></a>
              <a href="#" className="hover:text-primary transition-colors" title="Instagram"><Instagram className="h-4 w-4" /></a>
              <a href="#" className="hover:text-primary transition-colors" title="Github"><Github className="h-4 w-4" /></a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="md:col-span-2 space-y-3 text-left">
            <h4 className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Portal gate</h4>
            <ul className="text-xs space-y-2">
              <li><Link to="/register" className="hover:text-primary transition-colors">Student signup</Link></li>
              <li><Link to="/register" className="hover:text-primary transition-colors">Teacher portal</Link></li>
              <li><Link to="/register" className="hover:text-primary transition-colors">Admin command</Link></li>
            </ul>
          </div>

          {/* Legal / Policies Column */}
          <div className="md:col-span-2 space-y-3 text-left">
            <h4 className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Information</h4>
            <ul className="text-xs space-y-2">
              <li><Link to="/about" className="hover:text-primary transition-colors">Terms of service</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">Privacy policy</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">Cookie policy</Link></li>
            </ul>
          </div>

          {/* Contacts / Newsletter Column */}
          <div className="md:col-span-4 space-y-4 text-left">
            <h4 className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Stay Updated</h4>
            
            {subscribed ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-2 text-xs text-primary font-semibold">
                <Check className="h-4 w-4" /> Subscribed successfully!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Enter email..."
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors uppercase tracking-wider"
                >
                  Join
                </button>
              </form>
            )}

            <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
              <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-primary" /> support@gilaniai.edu</p>
              <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /> +254 700 000 000</p>
              <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> Nairobi, Kenya</p>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="border-t border-border/50 py-6 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest bg-muted/10">
          © {new Date().getFullYear()} GilaniAI · Curriculum Grounded Learning · Nairobi
        </div>
      </footer>
    </div>
  );
}
