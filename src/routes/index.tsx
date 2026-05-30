import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpenText, MessageCircle, Sparkles, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GilaniAI — Ethical AI Learning Assistant" },
      {
        name: "description",
        content:
          "Curriculum-grounded AI tutoring, notes summarization, quizzes, and study planning for KCSE and CBC students.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-serif text-xl font-bold italic text-primary">
            GilaniAI
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="animate-in-slide">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            Ethical Learning · KCSE · CBC - IGCSE
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-tight tracking-tight text-balance md:text-6xl">
            A tutor that knows your syllabus —{" "}
            <span className="italic underline decoration-primary/30 decoration-2 underline-offset-4">
              and your dignity
            </span>
            .
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
            GilaniAI grounds every answer in your curriculum, summarizes your notes, generates
            mock quizzes, and quietly escalates to a real teacher when you need one.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start studying <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-medium hover:bg-accent"
            >
              How it works
            </Link>
          </div>
        </section>

        <section className="mt-24 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { i: MessageCircle, t: "Curriculum-grounded tutor", d: "Asks and answers in the language of your syllabus." },
            { i: BookOpenText, t: "Notes summarizer", d: "Upload notes, get concise summaries and key concepts." },
            { i: Sparkles, t: "Personalized quizzes", d: "Practice questions tuned to your weak topics." },
            { i: ShieldCheck, t: "Human oversight", d: "Low-confidence answers are flagged for teacher review." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-serif text-lg">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs font-mono text-muted-foreground">
          <span>© {new Date().getFullYear()} GilaniAI</span>
          <span className="uppercase tracking-widest">Built with care · Nairobi</span>
        </div>
      </footer>
    </div>
  );
}
