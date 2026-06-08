import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  User,
  GraduationCap,
  Sun,
  Moon,
  Shield,
  Cookie,
  BarChart,
  FileText,
  Save,
  CheckCircle,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";

const deleteAccount = createServerFn({ method: "POST" }).handler(async () => {
  const request = getRequest();
  let authResult;
  try {
    authResult = await authenticateRequest(request);
  } catch (err) {
    throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
  }

  const { userId } = authResult;

  const { data: roleRow } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();
  if (roleRow?.role === "admin") {
    throw new Error("Admin accounts cannot be self-deleted. Transfer ownership first.");
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
});

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Settings — GilaniAI" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [curriculum, setCurriculum] = useState("KCSE");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Theme State
  const [isDark, setIsDark] = useState(false);

  // Consent States
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(true);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);

  // Load user profile and consent configurations from DB / localStorage
  useEffect(() => {
    if (!user?.id) return;

    // Fetch profile
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, curriculum")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setDisplayName(data.display_name || "");
          setCurriculum(data.curriculum || "KCSE");
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    })();

    // Check theme
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
      // Consent loaded from DB above
    }
  }, [user?.id]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          curriculum,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile settings saved successfully! ✨");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile settings.");
    } finally {
      setBusy(false);
    }
  };

  const toggleTheme = (theme: "light" | "dark") => {
    const nextDark = theme === "dark";
    setIsDark(nextDark);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      document.documentElement.classList.toggle("dark", nextDark);
      toast.success(nextDark ? "Dark theme active 🌙" : "Light theme active ☀️", {
        duration: 1500,
      });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete account.");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDisclaimerRevoke = async () => {
    localStorage.removeItem("gilani_disclaimer_accepted");
    setDisclaimerAccepted(false);
    if (user?.id) {
      await supabase.from("profiles").update({
        disclaimer_accepted: false,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
    }
    toast.info("AI Disclaimer consent revoked. You will be prompted to read it again on your next dashboard visit.");
  };

  const toggleConsent = async (type: "cookie" | "analytics", value: boolean) => {
    if (type === "cookie") {
      setCookieConsent(value);
      localStorage.setItem("gilani_cookie_consent", String(value));
      toast.success(value ? "Essential cookies enabled." : "Essential cookies disabled.");
    } else {
      setAnalyticsConsent(value);
      localStorage.setItem("gilani_analytics_consent", String(value));
      toast.success(value ? "Anonymous usage tracking enabled." : "Anonymous usage tracking disabled.");
    }
    if (user?.id) {
      const updateData = type === "cookie"
        ? { cookie_consent: value, updated_at: new Date().toISOString() }
        : { analytics_consent: value, updated_at: new Date().toISOString() };
      await supabase.from("profiles").update(updateData).eq("id", user.id);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8 lg:p-12 animate-in-slide">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-border pb-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            Settings
          </p>
          <h2 className="mt-1 font-serif text-3xl sm:text-4xl">App Preferences</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Control your profile details, theme settings, disclaimers, and legal consent choices.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Nav Columns */}
        <div className="md:col-span-1 rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="px-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
            Categories
          </p>
          <a
            href="#profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-accent hover:text-foreground transition-all text-primary"
          >
            <User className="h-4 w-4" /> Profile Details
          </a>
          <a
            href="#theme"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-accent hover:text-foreground transition-all text-primary"
          >
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} Display Theme
          </a>
          <a
            href="#consent"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-accent hover:text-foreground transition-all text-primary"
          >
            <Shield className="h-4 w-4" /> Consent & Privacy
          </a>
          <a
            href="#legal"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-accent hover:text-foreground transition-all text-primary"
          >
            <FileText className="h-4 w-4" /> Legal & Terms
          </a>
          <a
            href="#danger"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-accent hover:text-foreground transition-all text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Danger Zone
          </a>
        </div>

        {/* Right Settings Columns */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Section */}
          <section id="profile" className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-serif text-xl font-bold flex items-center gap-2 mb-4 text-foreground">
              <User className="h-5 w-5 text-primary" /> Profile Details
            </h3>
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Display Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Preferred Curriculum:
                </label>
                <select
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="KCSE">KCSE (Kenya Certificate of Secondary Education)</option>
                  <option value="CBC">CBC (Competency-Based Curriculum)</option>
                  <option value="IGCSE">
                    IGCSE (International General Certificate of Secondary Education)
                  </option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" /> Adjusts the Socratic AI tutor's
                  reference syllabus.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Save className="h-3.5 w-3.5" /> {busy ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </section>

          {/* Theme Section */}
          <section id="theme" className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-serif text-xl font-bold flex items-center gap-2 mb-2 text-foreground">
              {isDark ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-primary" />
              )}{" "}
              Display Theme
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Switch between light and dark modes according to your reading comfort.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => toggleTheme("light")}
                className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition-all ${
                  !isDark
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                <Sun className="h-4 w-4" /> Light Mode
              </button>
              <button
                type="button"
                onClick={() => toggleTheme("dark")}
                className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition-all ${
                  isDark
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                <Moon className="h-4 w-4" /> Dark Mode
              </button>
            </div>
          </section>

          {/* Consent Section */}
          <section
            id="consent"
            className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
          >
            <h3 className="font-serif text-xl font-bold flex items-center gap-2 mb-2 text-foreground">
              <Shield className="h-5 w-5 text-primary" /> Consent & Privacy
            </h3>
            <p className="text-xs text-muted-foreground">
              Manage your legal disclaimers, cookie tracking policies, and analytics preferences.
            </p>

            {/* AI Disclaimer Consent */}
            <div className="border-t border-border/50 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> AI Disclaimer Agreement
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Controls your acknowledgement of AI limitations and safety compliance.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {disclaimerAccepted ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-700">
                      <CheckCircle className="h-3 w-3" /> Accepted
                    </span>
                    <button
                      onClick={handleDisclaimerRevoke}
                      className="rounded border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-accent hover:text-destructive transition-colors"
                    >
                      Revoke
                    </button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-700">
                    Pending Read
                  </span>
                )}
              </div>
            </div>

            {/* Cookie Consent */}
            <div className="border-t border-border/50 pt-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Cookie className="h-4 w-4 text-primary" /> Cookie Storage Consent
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Required to save session details and client application state locally.
                </p>
              </div>
              <button
                onClick={() => toggleConsent("cookie", !cookieConsent)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
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

            {/* Analytics Consent */}
            <div className="border-t border-border/50 pt-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <BarChart className="h-4 w-4 text-primary" /> Usage Analytics Telemetry
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Allow anonymous performance logging to help improve study resources.
                </p>
              </div>
              <button
                onClick={() => toggleConsent("analytics", !analyticsConsent)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
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
          </section>

          {/* Legal Section */}
          <section id="legal" className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-serif text-xl font-bold flex items-center gap-2 mb-2 text-foreground">
              <FileText className="h-5 w-5 text-primary" /> Legal & Terms
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Review our platform policies, rules of use, and privacy commitments.
            </p>

            <div className="flex flex-col gap-2">
              <Link
                to="/terms"
                className="w-full text-left rounded-lg border border-border hover:bg-accent px-4 py-2.5 text-xs font-semibold text-primary transition-all flex items-center justify-between"
              >
                <span>Terms of Service Agreement</span>
                <span className="text-[10px] font-mono text-muted-foreground">Read &rarr;</span>
              </Link>
              <Link
                to="/privacy"
                className="w-full text-left rounded-lg border border-border hover:bg-accent px-4 py-2.5 text-xs font-semibold text-primary transition-all flex items-center justify-between"
              >
                <span>Privacy Policy Commitments</span>
                <span className="text-[10px] font-mono text-muted-foreground">Read &rarr;</span>
              </Link>
              <Link
                to="/cookies"
                className="w-full text-left rounded-lg border border-border hover:bg-accent px-4 py-2.5 text-xs font-semibold text-primary transition-all flex items-center justify-between"
              >
                <span>Full Cookie Policy Details</span>
                <span className="text-[10px] font-mono text-muted-foreground">Read &rarr;</span>
              </Link>
            </div>
          </section>
          {/* Danger Zone */}
          <section
            id="danger"
            className="rounded-xl border border-destructive/40 bg-card p-6 shadow-sm"
          >
            <h3 className="font-serif text-xl font-bold flex items-center gap-2 mb-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Danger Zone
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-destructive/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete My Account
              </button>
            ) : (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <p className="text-sm font-semibold text-destructive">
                  Are you sure? This will permanently delete your account, profile, and all chat
                  history.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-xs font-bold uppercase tracking-wider text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleting ? "Deleting..." : "Yes, Delete Everything"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
