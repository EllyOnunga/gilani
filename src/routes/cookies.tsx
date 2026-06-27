import { createFileRoute } from "@tanstack/react-router";
import { LegalHeader, LegalFooter, LegalHero, Section } from "@/components/LegalLayout";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — GilaniAI" },
      {
        name: "description",
        content: "GilaniAI's Cookie Policy — how we use cookies and similar technologies.",
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

const TYPE_COLOR: Record<string, string> = {
  Essential: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  Preference: "bg-muted text-muted-foreground",
  Functional: "bg-muted text-muted-foreground",
  Analytics: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
};

function CookiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LegalHeader />
      <LegalHero label="Legal" title="Cookie Policy" subtitle="Last updated: June 2025" />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-12">
        <div className="space-y-8 text-sm leading-relaxed">
          <Section title="1. What Are Cookies?">
            <p>
              Cookies are small text files placed on your device when you visit a website. GilaniAI
              uses cookies and similar browser storage technologies (such as localStorage) to
              provide a reliable, personalised experience.
            </p>
          </Section>
          <Section title="2. Types of Cookies We Use">
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
                <strong>Functional cookies:</strong> Remember actions you've taken (e.g. dismissing
                the AI disclaimer) to avoid repetitive prompts.
              </li>
              <li>
                <strong>Analytics cookies:</strong> Collect anonymous, aggregated data on how users
                interact with GilaniAI to help us improve the platform.
              </li>
            </ul>
          </Section>
          <Section title="3. Cookie Details">
            <p>The table below lists the specific cookies GilaniAI currently sets:</p>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mt-3">
              <table className="w-full min-w-[500px] border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Cookie", "Type", "Purpose", "Duration", "Opt-out?"].map((h) => (
                      <th
                        key={h}
                        className="text-left font-mono font-bold p-3 text-muted-foreground uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
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
                          className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${TYPE_COLOR[row.type] ?? "bg-muted text-muted-foreground"}`}
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
                will appear in your account settings.
              </li>
            </ul>
          </Section>
          <Section title="6. localStorage and sessionStorage">
            <p>
              In addition to cookies, GilaniAI uses browser localStorage to store your theme
              preference (light/dark mode) and disclaimer acknowledgement. This data is stored only
              on your device and is never transmitted to our servers.
            </p>
          </Section>
          <Section title="7. Consent">
            <p>
              By continuing to use GilaniAI, you consent to our use of essential and functional
              cookies. For analytics cookies, we rely on your continued use of the platform as
              implied consent for anonymous, aggregated usage measurement.
            </p>
          </Section>
          <Section title="8. Updates to This Policy">
            <p>
              We may update this Cookie Policy as the Service evolves. The "Last updated" date at
              the top indicates when this policy was most recently revised.
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
      <LegalFooter />
    </div>
  );
}
