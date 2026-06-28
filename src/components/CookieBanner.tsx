import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";

const CONSENT_KEY = "gilani_cookie_consent";
const ANALYTICS_KEY = "gilani_analytics_consent";
export const COOKIE_CONSENT_EVENT = "gilani:cookie-consent-changed";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(CONSENT_KEY);
    if (existing === null) {
      setVisible(true);
    }
  }, []);

  const setChoice = (accepted: boolean) => {
    localStorage.setItem(CONSENT_KEY, String(accepted));
    localStorage.setItem(ANALYTICS_KEY, String(accepted));
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: { accepted } }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-md px-4 py-4 sm:px-6 animate-in slide-in-from-bottom duration-300">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <Cookie className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
          <p>
            We use cookies for essential site functionality and, with your consent, anonymous usage
            analytics to improve GilaniAI. See our{" "}
            <a href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setChoice(false)}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => setChoice(true)}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
