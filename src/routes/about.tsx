import { createFileRoute, Link } from "@tanstack/react-router";

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

function About() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-serif text-xl font-bold italic text-primary">
            GilaniAI
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Get started
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 prose-styles">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">About</p>
        <h1 className="mt-3 font-serif text-4xl text-balance">
          A learning companion, not a replacement.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-pretty">
          GilaniAI is designed around three commitments: ground every answer in real curriculum
          material, surface uncertainty instead of bluffing through it, and route hard moments to a
          real human.
        </p>
        <h2 className="mt-12 font-serif text-2xl">The three agents</h2>
        <ul className="mt-4 space-y-4 text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">Scout</span> — keeps revision rhythms
            steady: streaks, exam countdowns, gentle nudges.
          </li>
          <li>
            <span className="font-semibold text-foreground">Guardian</span> — the tutoring engine:
            summarization, explanation, quiz generation, all grounded in your uploaded notes.
          </li>
          <li>
            <span className="font-semibold text-foreground">Hunter</span> — the ethics layer: when a
            response is low-confidence or a student shows distress, an escalation is created for a
            teacher.
          </li>
        </ul>
        <p className="mt-12 text-sm text-muted-foreground">
          Everything is auditable. Every AI turn is logged for governance review.
        </p>
      </main>
    </div>
  );
}
