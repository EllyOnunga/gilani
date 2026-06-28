import { createFileRoute } from "@tanstack/react-router";
import { LegalHeader, LegalFooter, LegalHero, Section } from "@/components/LegalLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — GilaniAI" },
      {
        name: "description",
        content:
          "Read GilaniAI's Terms of Service — covering acceptable use, AI limitations, teacher escalation, and student responsibilities.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e2e4f0] flex flex-col overflow-x-hidden">
      <LegalHeader />
      <LegalHero label="Legal" title="Terms of Service" subtitle="Last updated: June 2025" />
      <main className="flex-grow mx-auto w-full max-w-3xl px-4 sm:px-8 py-10 sm:py-16">
        <div className="space-y-8">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using GilaniAI ("the Service"), you agree to be bound by these Terms
              of Service. If you do not agree, please do not use the Service. These Terms apply to
              all users, including students, teachers, and administrators.
            </p>
          </Section>
          <Section title="2. Description of Service">
            <p>
              GilaniAI provides an AI-powered academic tutoring and study platform. The Service
              includes:
            </p>
            <ul>
              <li>Socratic AI tutoring chat sessions, including notes summarisation and practice quizzes generated within the conversation</li>
              <li>Exam countdown reminders and streak tracking</li>
              <li>Teacher escalation for human expert review</li>
            </ul>
          </Section>
          <Section title="3. User Accounts">
            <p>
              You must create an account to access most features. You are responsible for
              maintaining the confidentiality of your credentials and for all activities under your
              account. You must be at least 13 years old to register independently.
            </p>
          </Section>
          <Section title="4. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>
                Use the Service to cheat, plagiarise or submit AI-generated work as your own without
                disclosure
              </li>
              <li>
                Attempt to manipulate the AI system to generate harmful or inappropriate content
              </li>
              <li>Scrape, copy or redistribute content from the Service without permission</li>
              <li>
                Use the Service for any purpose that violates applicable Kenyan or international law
              </li>
              <li>Impersonate another user, teacher or administrator</li>
            </ul>
          </Section>
          <Section title="5. AI Limitations and Disclaimer">
            <p>
              GilaniAI uses artificial intelligence to assist with academic revision. While we
              strive for accuracy, <strong>AI responses may contain errors</strong>. The Service is
              designed to support — not replace — human teaching. Students should verify critical
              information with their teachers or official textbooks, especially for high-stakes
              examinations.
            </p>
          </Section>
          <Section title="6. Teacher Escalation">
            <p>
              When a student escalates a question to a teacher, that specific conversation excerpt
              is shared with the verified teacher. Regular AI conversations remain private and are
              not shared with teachers unless explicitly escalated by the student.
            </p>
          </Section>
          <Section title="7. Intellectual Property">
            <p>
              All AI-generated content (summaries, flashcards, quiz questions, study plans) is
              provided for your personal educational use only. You may not resell or redistribute
              this content commercially. Notes and content you upload remain your intellectual
              property.
            </p>
          </Section>
          <Section title="8. Subscription and Payments">
            <p>
              Free accounts have usage limits. Paid Scholar subscriptions are billed monthly in
              Kenyan Shillings (KES). Subscriptions auto-renew unless cancelled before the renewal
              date. Refunds are provided at our discretion within 7 days of a charge if the Service
              has not been materially used.
            </p>
          </Section>
          <Section title="9. Termination">
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms or
              abuse the AI system. You may close your account at any time by contacting support.
            </p>
          </Section>
          <Section title="10. Changes to Terms">
            <p>
              We may update these Terms periodically. Continued use of the Service after changes
              constitutes acceptance. We will notify registered users of significant changes via
              email.
            </p>
          </Section>
          <Section title="11. Contact">
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:support@gilaniai.site">support@gilaniai.site</a> or write to GilaniAI,
              Nairobi, Kenya.
            </p>
          </Section>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
