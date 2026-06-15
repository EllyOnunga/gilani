import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalHeader, LegalFooter, LegalHero, Section } from "@/components/LegalLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — GilaniAI" },
      { name: "description", content: "Read GilaniAI's Privacy Policy — how we collect, store and protect your personal data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LegalHeader />
      <LegalHero label="Legal" title="Privacy Policy" subtitle="Last updated: June 2025" />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="space-y-8 text-sm leading-relaxed">
          <Section title="1. Introduction">
            <p>GilaniAI ("we", "our", "us") is committed to protecting your privacy and complying with the Kenya Data Protection Act 2019. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.</p>
          </Section>
          <Section title="2. Information We Collect">
            <p>We collect the following categories of information:</p>
            <ul>
              <li><strong>Account information:</strong> Name, email address, and password (stored securely as a hash — never in plain text).</li>
              <li><strong>Academic content:</strong> Notes you upload, quiz answers, chat messages sent to the AI tutor, and study plans generated for your account.</li>
              <li><strong>Performance data:</strong> Quiz scores, streak records, and planner task completion — used to personalise your study experience.</li>
              <li><strong>Usage data:</strong> Page views, feature interactions, and device/browser type — collected to improve the platform.</li>
              <li><strong>Communication data:</strong> Messages you send to our support team.</li>
            </ul>
          </Section>
          <Section title="3. How We Use Your Information">
            <p>We use your information to:</p>
            <ul>
              <li>Provide, personalise and improve the GilaniAI platform</li>
              <li>Generate AI-powered tutoring responses, quiz questions, summaries and study plans</li>
              <li>Track your academic progress and identify weak topics for targeted revision</li>
              <li>Facilitate teacher escalation when you request expert human review</li>
              <li>Send service notifications, product updates, and support responses</li>
              <li>Comply with legal obligations under Kenyan law</li>
            </ul>
          </Section>
          <Section title="4. AI Training and Your Data">
            <p><strong>GilaniAI does not use your personal academic content (notes, chats, quiz answers) to train third-party AI models.</strong> AI responses are generated using pre-trained models accessed via API. Your data stays within GilaniAI's secure storage and is not shared with AI model providers for training purposes.</p>
          </Section>
          <Section title="5. Data Sharing">
            <p>We do not sell your personal data. We share information only in these limited circumstances:</p>
            <ul>
              <li><strong>Teacher escalation:</strong> When you explicitly escalate a question, the relevant conversation excerpt is shared with your assigned verified teacher.</li>
              <li><strong>Service providers:</strong> We use trusted infrastructure providers (e.g. Supabase for database hosting) under strict data processing agreements.</li>
              <li><strong>Legal requirements:</strong> If required by Kenyan courts, law enforcement, or regulatory authorities under valid legal process.</li>
            </ul>
          </Section>
          <Section title="6. Data Retention">
            <p>We retain your data for as long as your account is active. If you close your account, we delete your personal data within 30 days, except where retention is required by law.</p>
          </Section>
          <Section title="7. Data Security">
            <p>We implement industry-standard security measures including:</p>
            <ul>
              <li>HTTPS encryption for all data in transit</li>
              <li>Encrypted storage for sensitive data at rest</li>
              <li>Role-based access controls</li>
              <li>Regular security audits and dependency scanning</li>
              <li>Passwords hashed — never stored in plain text</li>
            </ul>
          </Section>
          <Section title="8. Children's Privacy">
            <p>GilaniAI is intended for students aged 13 and above. We do not knowingly collect data from children under 13. If you believe a child under 13 has registered, please contact us immediately.</p>
          </Section>
          <Section title="9. Your Rights">
            <p>Under the Kenya Data Protection Act 2019, you have the right to access, correct, delete, and port your data. To exercise these rights, email us at <a href="mailto:onungaelly@gmail.com">onungaelly@gmail.com</a>. We will respond within 30 days.</p>
          </Section>
          <Section title="10. Cookies">
            <p>We use cookies to maintain your login session and personalise your experience. For full details, see our <Link to="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.</p>
          </Section>
          <Section title="11. Changes to This Policy">
            <p>We may update this Privacy Policy periodically. Your continued use after changes constitutes acceptance. We will notify registered users of significant changes via email.</p>
          </Section>
          <Section title="12. Contact">
            <p>For privacy questions or data requests, contact us at <a href="mailto:onungaelly@gmail.com">onungaelly@gmail.com</a> or GilaniAI, Nairobi, Kenya.</p>
          </Section>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
