// components/DisclaimerModal.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, BookOpen, Shield, Heart, Cookie, BarChart } from "lucide-react";
import { friendlyError } from "@/lib/async";

export function DisclaimerModal() {
  const { user, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Consent states
  const [aiDisclaimerAccepted, setAiDisclaimerAccepted] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(true);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setIsOpen(false);
      setLoading(false);
      return;
    }

    // Check database profile for disclaimer status
    const checkConsent = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("disclaimer_accepted, cookie_consent, analytics_consent")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        // If user has not accepted disclaimer, open the modal
        if (!data || !data.disclaimer_accepted) {
          setIsOpen(true);
          // Set toggles to whatever is in the DB, or default to true
          setCookieConsent(data?.cookie_consent ?? true);
          setAnalyticsConsent(data?.analytics_consent ?? true);
        } else {
          // If already accepted, sync to local storage just in case
          localStorage.setItem("gilani_disclaimer_accepted", "true");
          localStorage.setItem("gilani_cookie_consent", String(data.cookie_consent ?? true));
          localStorage.setItem("gilani_analytics_consent", String(data.analytics_consent ?? true));
          setIsOpen(false);
        }
      } catch (err) {
        console.error("[Consent] Failed to check consent status:", err);
        // Fallback to local storage if DB check fails
        const hasSeenDisclaimer = localStorage.getItem("gilani_disclaimer_accepted");
        if (!hasSeenDisclaimer) {
          setIsOpen(true);
        }
      } finally {
        setLoading(false);
      }
    };

    checkConsent();
  }, [user?.id, authLoading]);

  const handleAccept = async () => {
    if (!user?.id) return;
    if (!aiDisclaimerAccepted) {
      toast.error("Please accept the AI disclaimer and safety guidelines to continue.");
      return;
    }

    try {
      // Update DB profiles table
      const { error } = await supabase
        .from("profiles")
        .update({
          disclaimer_accepted: true,
          cookie_consent: cookieConsent,
          analytics_consent: analyticsConsent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Sync local storage
      localStorage.setItem("gilani_disclaimer_accepted", "true");
      localStorage.setItem("gilani_cookie_consent", String(cookieConsent));
      localStorage.setItem("gilani_analytics_consent", String(analyticsConsent));

      setIsOpen(false);
      toast.success("Consent preferences saved! Welcome to GilaniAI ✨");
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to save preferences. Please try again."));
    }
  };

  if (loading || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-card/90 border border-border/80 backdrop-blur-xl rounded-2xl shadow-2xl max-w-xl w-full p-5 sm:p-8 my-8 animate-in-slide flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">Privacy & Safety</p>
            <h2 className="text-xl font-serif font-bold">Welcome to GilaniAI</h2>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2 text-sm text-muted-foreground custom-scrollbar">
          <div>
            <p className="mb-4">
              GilaniAI is an AI-powered study companion. To ensure a safe, legal, and premium learning environment, please review our terms and configure your consent preferences below.
            </p>

            <div className="space-y-3">
              {/* AI Limitations */}
              <div className="flex gap-3 bg-muted/30 border border-border/50 rounded-xl p-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-foreground">AI Limitations</p>
                  <p className="text-xs mt-0.5 leading-relaxed">
                    AI responses can contain errors or outdated information. Always cross-verify critical educational material with official guides and textbook sources.
                  </p>
                </div>
              </div>

              {/* Professional advice */}
              <div className="flex gap-3 bg-muted/30 border border-border/50 rounded-xl p-3">
                <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-foreground">Educational Support Only</p>
                  <p className="text-xs mt-0.5 leading-relaxed">
                    This platform serves solely as an academic supplement. It does not replace guidance from certified teachers, advisors, counselors, or professional services.
                  </p>
                </div>
              </div>

              {/* Safety */}
              <div className="flex gap-3 bg-muted/30 border border-border/50 rounded-xl p-3">
                <Heart className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-foreground">Safety & Emergency Hotlines</p>
                  <p className="text-xs mt-0.5 leading-relaxed">
                    Your safety is our top priority. For support, reach out to local counselors or contact emergency hotlines like Kenya Red Cross (1199) or Childline Kenya (116).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Consents Section */}
          <div className="space-y-3 pt-4 border-t border-border/40">
            <h3 className="font-mono text-xs uppercase tracking-widest text-foreground font-bold">Consent Preferences</h3>

            {/* Cookie Toggle */}
            <div className="flex items-start justify-between gap-4 bg-muted/20 border border-border/30 rounded-xl p-3">
              <div className="flex gap-3">
                <Cookie className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-foreground">Allow Cookie & Storage Consent</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed">
                    Required to store your study settings, active session details, and interface choices locally.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCookieConsent(!cookieConsent)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${
                  cookieConsent ? "bg-primary" : "bg-muted"
                }`}
                title="Toggle Cookies"
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    cookieConsent ? "translate-x-4.5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Telemetry/Analytics Toggle */}
            <div className="flex items-start justify-between gap-4 bg-muted/20 border border-border/30 rounded-xl p-3">
              <div className="flex gap-3">
                <BarChart className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-foreground">Allow Anonymous Usage Telemetry</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed">
                    Helps us improve study tools and response accuracy by collecting anonymized diagnostic information.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAnalyticsConsent(!analyticsConsent)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${
                  analyticsConsent ? "bg-primary" : "bg-muted"
                }`}
                title="Toggle Analytics"
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    analyticsConsent ? "translate-x-4.5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Required Acknowledgment Checkbox */}
            <label className="flex items-start gap-3 border border-primary/20 bg-primary/5 rounded-xl p-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aiDisclaimerAccepted}
                onChange={(e) => setAiDisclaimerAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/40 focus:ring-offset-0 cursor-pointer accent-primary"
              />
              <div>
                <p className="text-xs font-bold text-foreground">Acknowledge AI Safety & Disclaimer (Required)</p>
                <p className="text-[11px] mt-0.5 leading-relaxed">
                  I understand that AI outputs may be inaccurate, and I agree to use GilaniAI ethically as a study supplement.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-border/40 flex flex-col gap-3">
          <button
            onClick={handleAccept}
            disabled={!aiDisclaimerAccepted}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md active:scale-[0.98]"
          >
            Accept Preferences & Let's Learn!
          </button>
          <p className="text-[10px] text-muted-foreground text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy. You can adjust your consent choices at any time in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
