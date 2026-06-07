import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/ui/logo";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — GilaniAI" },
      {
        name: "description",
        content:
          "Read GilaniAI's Privacy Policy — how we collect, store and protect your personal data and academic information.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-12 sm:py-20">
        <div className="mb-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">Legal</p>
          <h1 className="font-serif text-4xl font-black">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: June 2025</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          <Section title="1. Introduction">
            <p>
              GilaniAI (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) is committed to
              protecting your privacy and complying with the Kenya Data Protection Act 2019 and
              other applicable privacy laws. This Privacy Policy explains what information we
              collect, how we use it, and your rights regarding your data.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>We collect the following categories of information:</p>
            <ul>
              <li>
                <strong>Account information:</strong> Name, email address, school/institution,
                curriculum type, and password (stored securely as a hash — never in plain text).
              </li>
              <li>
                <strong>Academic content:</strong> Notes you upload, quiz answers, chat messages
                sent to the AI tutor, and study plans generated for your account.
              </li>
              <li>
                <strong>Performance data:</strong> Quiz scores, streak records, weak topics, and
                planner task completion — used to personalise your study experience.
              </li>
              <li>
                <strong>Usage data:</strong> Page views, feature interactions, and device/browser
                type — collected to improve the platform.
              </li>
              <li>
                <strong>Communication data:</strong> Messages you send to our support team.
              </li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use your information to:</p>
            <ul>
              <li>Provide, personalise and improve the GilaniAI platform</li>
              <li>
                Generate AI-powered tutoring responses, quiz questions, summaries and study plans
              </li>
              <li>Track your academic progress and identify weak topics for targeted revision</li>
              <li>Facilitate teacher escalation when you request expert human review</li>
              <li>Send service notifications, product updates, and support responses</li>
              <li>Comply with legal obligations under Kenyan law</li>
            </ul>
          </Section>

          <Section title="4. AI Training and Your Data">
            <p>
              <strong>
                GilaniAI does not use your personal academic content (notes, chats, quiz answers) to
                train third-party AI models.
              </strong>{" "}
              AI responses are generated using pre-trained models accessed via API. Your data stays
              within GilaniAI's secure storage and is not shared with AI model providers for
              training purposes.
            </p>
          </Section>

          <Section title="5. Data Sharing">
            <p>
              We do not sell your personal data. We share information only in these limited
              circumstances:
            </p>
            <ul>
              <li>
                <strong>Teacher escalation:</strong> When you explicitly escalate a question, the
                relevant conversation excerpt is shared with your assigned verified teacher.
              </li>
              <li>
                <strong>Service providers:</strong> We use trusted infrastructure providers (e.g.
                Supabase for database hosting) under strict data processing agreements.
              </li>
              <li>
                <strong>Legal requirements:</strong> If required by Kenyan courts, law enforcement,
                or regulatory authorities under valid legal process.
              </li>
              <li>
                <strong>School administrators:</strong> If your account is part of a school
                subscription, aggregate (non-personal) performance analytics may be shared with
                school administrators.
              </li>
            </ul>
          </Section>

          <Section title="6. Data Retention">
            <p>
              We retain your data for as long as your account is active or as needed to provide the
              Service. If you close your account, we delete your personal data within 30 days,
              except where retention is required by law. Anonymised aggregate statistics may be
              retained indefinitely for platform improvement.
            </p>
          </Section>

          <Section title="7. Data Security">
            <p>We implement industry-standard security measures including:</p>
            <ul>
              <li>HTTPS encryption for all data in transit</li>
              <li>Encrypted storage for sensitive data at rest</li>
              <li>Role-based access controls so only authorised personnel can access user data</li>
              <li>Regular security audits and dependency scanning</li>
              <li>Passwords hashed with bcrypt — never stored in plain text</li>
            </ul>
            <p>
              No method of transmission over the internet is 100% secure. We cannot guarantee
              absolute security but commit to industry best practices.
            </p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>
              GilaniAI is intended for students aged 13 and above. For users under 16, we recommend
              parental or guardian awareness of their child&apos;s account. We do not knowingly
              collect data from children under 13. If you believe a child under 13 has registered,
              please contact us immediately.
            </p>
          </Section>

          <Section title="9. Your Rights">
            <p>Under the Kenya Data Protection Act 2019, you have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data (right to erasure)</li>
              <li>Object to processing of your data for marketing purposes</li>
              <li>Data portability — receive a copy of your data in a machine-readable format</li>
            </ul>
            <p>
              To exercise these rights, email us at{" "}
              <a href="mailto:onungaelly@gmail.com" className="text-primary hover:underline">
                onungaelly@gmail.com
              </a>
              . We will respond within 30 days.
            </p>
          </Section>

          <Section title="10. Cookies">
            <p>
              We use cookies and similar technologies to maintain your login session and personalise
              your experience. For full details, see our{" "}
              <Link to="/cookies" className="text-primary hover:underline">
                Cookie Policy
              </Link>
              .
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy periodically. We will notify you of significant
              changes via email or a prominent notice on the platform. Your continued use after
              changes constitutes acceptance.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              For privacy questions, data requests, or concerns, contact our Data Protection Officer
              at{" "}
              <a href="mailto:onungaelly@gmail.com" className="text-primary hover:underline">
                onungaelly@gmail.com
              </a>{" "}
              or GilaniAI, Nairobi, Kenya.
            </p>
          </Section>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest bg-muted/10 px-4">
        <div className="flex flex-wrap justify-center gap-4 mb-3">
          <Link to="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <Link to="/cookies" className="hover:text-primary transition-colors">
            Cookie Policy
          </Link>
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
        </div>
        © {new Date().getFullYear()} GilaniAI · Nairobi, Kenya
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-serif text-lg font-bold text-foreground border-b border-border pb-2">
        {title}
      </h2>
      <div className="space-y-3 text-muted-foreground [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:text-foreground [&_a]:transition-colors">
        {children}
      </div>
    </div>
  );
}
