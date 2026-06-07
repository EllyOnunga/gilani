import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/ui/logo";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — GilaniAI" },
      {
        name: "description",
        content:
          "GilaniAI's Cookie Policy — how we use cookies and similar technologies for authentication, preferences, and analytics.",
      },
    ],
  }),
  component: CookiesPage,
});

const COOKIE_TABLE = [
  {
    name: "sb-auth-token",
    type: "Essential",
    purpose: "Maintains your authenticated login session via Supabase",
    duration: "Session / up to 1 year",
    canOpt: "No — required for login",
  },
  {
    name: "theme",
    type: "Preference",
    purpose: "Stores your light/dark mode preference",
    duration: "1 year",
    canOpt: "Yes",
  },
  {
    name: "gilani_disclaimer_seen",
    type: "Functional",
    purpose: "Remembers that you have acknowledged the AI disclaimer modal",
    duration: "1 year",
    canOpt: "Yes",
  },
  {
    name: "_analytics",
    type: "Analytics",
    purpose: "Aggregated, anonymous usage statistics to improve the platform",
    duration: "90 days",
    canOpt: "Yes — via cookie settings",
  },
];

function CookiesPage() {
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
          <h1 className="font-serif text-4xl font-black">Cookie Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: June 2025</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          <Section title="1. What Are Cookies?">
            <p>
              Cookies are small text files placed on your device when you visit a website. They
              allow websites to remember your preferences, keep you logged in, and understand how
              you use the service. GilaniAI uses cookies and similar browser storage technologies
              (such as localStorage) to provide a reliable, personalised experience.
            </p>
          </Section>

          <Section title="2. Types of Cookies We Use">
            <p>We use the following categories of cookies:</p>
            <ul>
              <li>
                <strong>Essential cookies:</strong> Required for the Service to function. Without
                these, features like login and session management would not work.
              </li>
              <li>
                <strong>Preference cookies:</strong> Store your chosen settings (e.g. dark mode) so
                they persist between visits.
              </li>
              <li>
                <strong>Functional cookies:</strong> Remember actions you&apos;ve taken (e.g.
                dismissing the AI disclaimer) to avoid repetitive prompts.
              </li>
              <li>
                <strong>Analytics cookies:</strong> Collect anonymous, aggregated data on how users
                interact with GilaniAI to help us improve the platform. These cookies do not
                identify individual users.
              </li>
            </ul>
          </Section>

          <Section title="3. Cookie Details">
            <p>The table below lists the specific cookies GilaniAI currently sets:</p>
            {/* Scrollable table for mobile */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[500px] border-collapse text-[11px] mt-3">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left font-mono font-bold p-3 text-muted-foreground uppercase tracking-wider">
                      Cookie
                    </th>
                    <th className="text-left font-mono font-bold p-3 text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left font-mono font-bold p-3 text-muted-foreground uppercase tracking-wider">
                      Purpose
                    </th>
                    <th className="text-left font-mono font-bold p-3 text-muted-foreground uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="text-left font-mono font-bold p-3 text-muted-foreground uppercase tracking-wider">
                      Opt-out?
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COOKIE_TABLE.map((row) => (
                    <tr
                      key={row.name}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-3 font-mono text-primary">{row.name}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                            row.type === "Essential"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                              : row.type === "Analytics"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{row.purpose}</td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {row.duration}
                      </td>
                      <td className="p-3 text-muted-foreground">{row.canOpt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="4. Third-Party Cookies">
            <p>
              GilaniAI uses Supabase as our database and authentication provider. Supabase may set
              cookies as part of the authentication process. We do not use Google Analytics,
              Facebook Pixel, or other third-party advertising trackers.
            </p>
          </Section>

          <Section title="5. Managing Cookies">
            <p>You can control cookies in the following ways:</p>
            <ul>
              <li>
                <strong>Browser settings:</strong> Most browsers allow you to block or delete
                cookies via Settings → Privacy. Note that blocking essential cookies will prevent
                you from staying logged in.
              </li>
              <li>
                <strong>Clear site data:</strong> You can clear all cookies and localStorage data
                for GilaniAI at any time. This will log you out.
              </li>
              <li>
                <strong>Opt-out of analytics:</strong> If we add an analytics opt-out toggle, it
                will appear in your account settings. Opting out sets a preference cookie that
                instructs our analytics system to ignore your sessions.
              </li>
            </ul>
            <p>
              Please note: disabling essential cookies will prevent you from accessing your account.
              Preference and functional cookies only affect your personal experience and do not
              share data with external parties.
            </p>
          </Section>

          <Section title="6. localStorage and sessionStorage">
            <p>
              In addition to cookies, GilaniAI uses browser localStorage to store your theme
              preference (light/dark mode) and disclaimer acknowledgement. This data is stored only
              on your device and is never transmitted to our servers. You can clear it via your
              browser&apos;s developer tools or by clearing site data.
            </p>
          </Section>

          <Section title="7. Consent">
            <p>
              By continuing to use GilaniAI after viewing this notice, you consent to our use of
              essential and functional cookies. For analytics cookies, we rely on your continued use
              of the platform as implied consent for anonymous, aggregated usage measurement. You
              may opt out at any time.
            </p>
          </Section>

          <Section title="8. Updates to This Policy">
            <p>
              We may update this Cookie Policy as the Service evolves or as regulatory requirements
              change. The &ldquo;Last updated&rdquo; date at the top indicates when this policy was
              most recently revised. We will notify registered users of significant changes.
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              Questions about our use of cookies? Contact us at{" "}
              <a href="mailto:onungaelly@gmail.com" className="text-primary hover:underline">
                onungaelly@gmail.com
              </a>
              .
            </p>
          </Section>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest bg-muted/10 px-4">
        <div className="flex flex-wrap justify-center gap-4 mb-3">
          <Link to="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <Link to="/privacy" className="hover:text-primary transition-colors">
            Privacy Policy
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
      <div className="space-y-3 text-muted-foreground [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:text-foreground">
        {children}
      </div>
    </div>
  );
}
