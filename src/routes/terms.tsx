import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — GilaniAI" },
      {
        name: "description",
        content: "Read GilaniAI's Terms of Service — covering acceptable use, AI limitations, teacher escalation, and student responsibilities.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-30">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link to="/" className="font-serif text-xl font-black italic text-primary hover:opacity-90 transition-opacity">
            GilaniAI
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-12 sm:py-20">
        <div className="mb-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">Legal</p>
          <h1 className="font-serif text-4xl font-black">Terms of Service</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: June 2025</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-sm leading-relaxed text-foreground/90">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using GilaniAI (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service
              (&ldquo;Terms&rdquo;). If you do not agree, please do not use the Service. These Terms apply to all users,
              including students, teachers, and administrators.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              GilaniAI provides an AI-powered academic tutoring and study platform designed for students following
              KCSE, CBC, and IGCSE curricula. The Service includes:
            </p>
            <ul>
              <li>Socratic AI tutoring chat sessions</li>
              <li>Notes summarisation and flashcard generation</li>
              <li>AI-generated practice quizzes</li>
              <li>Personalised 7-day study planners</li>
              <li>Performance analytics and streak tracking</li>
              <li>Teacher escalation for human expert review</li>
            </ul>
          </Section>

          <Section title="3. User Accounts">
            <p>
              You must create an account to access most features. You are responsible for maintaining the
              confidentiality of your account credentials and for all activities that occur under your account.
              You must be at least 13 years old to register independently. Users under 16 should have parental
              or guardian consent.
            </p>
            <p>
              You agree to provide accurate, current, and complete registration information and to keep it updated.
            </p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service to cheat, plagiarise or submit AI-generated work as your own without disclosure</li>
              <li>Attempt to manipulate or abuse the AI system to generate harmful, illegal or inappropriate content</li>
              <li>Scrape, copy or redistribute content from the Service without permission</li>
              <li>Use the Service for any purpose that violates applicable Kenyan or international law</li>
              <li>Impersonate another user, teacher or administrator</li>
              <li>Upload content that infringes on intellectual property rights</li>
            </ul>
          </Section>

          <Section title="5. AI Limitations and Disclaimer">
            <p>
              GilaniAI uses artificial intelligence to assist with academic revision. While we strive for
              curriculum accuracy, <strong>AI responses may contain errors</strong>. The Service is designed to
              support — not replace — human teaching. Students should verify critical information with their
              teachers or official textbooks, especially for high-stakes examinations.
            </p>
            <p>
              GilaniAI does not guarantee exam results or academic performance outcomes. The quality of
              responses depends on the curriculum information and exam standards available to the AI at the
              time of training.
            </p>
          </Section>

          <Section title="6. Teacher Escalation">
            <p>
              When a student escalates a question to a teacher, that specific conversation excerpt is
              shared with the verified teacher assigned to the student&apos;s school or institution.
              Regular AI conversations remain private and are not shared with teachers unless explicitly
              escalated by the student.
            </p>
            <p>
              Teachers using the escalation portal agree to respond professionally and in accordance with
              Kenyan educational standards and ethics.
            </p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              All content generated by GilaniAI&apos;s AI systems (summaries, flashcards, quiz questions,
              study plans) is provided for your personal educational use only. You may not resell,
              redistribute or publish this content commercially without written permission.
            </p>
            <p>
              Notes and content you upload remain your intellectual property. By uploading, you grant
              GilaniAI a limited licence to process that content solely to provide the Service to you.
            </p>
          </Section>

          <Section title="8. Subscription and Payments">
            <p>
              Free accounts have usage limits. Paid Scholar subscriptions are billed monthly in Kenyan
              Shillings (KSh). Subscriptions auto-renew unless cancelled before the renewal date.
              Refunds are provided at our discretion within 7 days of a charge if the Service has not
              been materially used during that period.
            </p>
          </Section>

          <Section title="9. Termination">
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms, engage in
              fraudulent activity, or abuse the AI system. You may close your account at any time
              by contacting support.
            </p>
          </Section>

          <Section title="10. Changes to Terms">
            <p>
              We may update these Terms periodically. Continued use of the Service after changes are
              posted constitutes acceptance of the updated Terms. We will notify registered users of
              significant changes via email.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:legal@gilaniai.edu" className="text-primary hover:underline">
                legal@gilaniai.edu
              </a>{" "}
              or write to GilaniAI, Nairobi, Kenya.
            </p>
          </Section>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest bg-muted/10 px-4">
        <div className="flex flex-wrap justify-center gap-4 mb-3">
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/cookies" className="hover:text-primary transition-colors">Cookie Policy</Link>
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        </div>
        © {new Date().getFullYear()} GilaniAI · Nairobi, Kenya
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-serif text-lg font-bold text-foreground border-b border-border pb-2">{title}</h2>
      <div className="space-y-3 text-muted-foreground [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:text-foreground">
        {children}
      </div>
    </div>
  );
}
