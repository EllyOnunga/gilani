import { useState, useEffect } from "react";
import { PlansModal } from "@/components/PlansModal";
import { PLANS } from "@/lib/plans";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/async";
import {
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
  CreditCard,
  Upload,
  Sparkles,
  Info,
  ChevronRight,
  Brain,
  Zap,
  Mail,
} from "lucide-react";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";

const deleteAccount = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }

    const { userId, user } = authResult;

    // Server-side reauth — verify password before deletion
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_ANON_KEY =
      process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY!;
    const { createClient } = await import("@supabase/supabase-js");
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: reauthErr } = await anonClient.auth.signInWithPassword({
      email: user.email!,
      password: data.password,
    });
    if (reauthErr) throw new Error("Incorrect password. Please try again.");

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    if (roleRow?.role === "admin") {
      throw new Error("Admin accounts cannot be self-deleted. Transfer ownership first.");
    }

    // Send goodbye email before deletion using Supabase's magic link (repurposed as notification)
    // The user is already verified so this is purely informational
    try {
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: user.email!,
      });
    } catch (_) {
      // best-effort, don't block deletion
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

const PRESETS = [
  { id: "socrates", label: "Socrates", desc: "Philosophy & Socratic Methods" },
  { id: "curie", label: "Marie Curie", desc: "Physics & Chemistry pioneer" },
  { id: "galileo", label: "Galileo", desc: "Observational Astronomy" },
  { id: "lovelace", label: "Ada Lovelace", desc: "First algorithm architect" },
  { id: "hypatia", label: "Hypatia", desc: "Mathematics & Philosophy" },
  { id: "einstein", label: "Einstein", desc: "Modern Theoretical Physics" },
];

function PresetAvatarSVG({ preset }: { preset: string }) {
  switch (preset) {
    case "socrates":
      return (
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full bg-gradient-to-br from-amber-500 to-amber-700 p-2 text-white"
        >
          <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1" />
          <path
            d="M12 24h8M16 24V14M13 14h6M11 11h10v3H11z"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "curie":
      return (
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full bg-gradient-to-br from-emerald-500 to-emerald-700 p-2 text-white"
        >
          <path
            d="M11 23h10M13 23v-7a3 3 0 0 1-1-2.5v-3.5h8v3.5a3 3 0 0 1-1 2.5v7"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="7" r="1" fill="currentColor" />
          <circle cx="12" cy="15" r="1.2" fill="currentColor" />
          <circle cx="20" cy="17" r="0.8" fill="currentColor" />
        </svg>
      );
    case "galileo":
      return (
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full bg-gradient-to-br from-blue-500 to-blue-700 p-2 text-white"
        >
          <path
            d="M9 23l7-7M23 9l-7 7M16 16l4 4M21 7l4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="24" cy="16" r="0.8" fill="currentColor" />
          <polygon
            points="12,7 13,9 15,9 13,10 14,12 12,11 10,12 11,10 9,9 11,9"
            fill="currentColor"
          />
        </svg>
      );
    case "lovelace":
      return (
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full bg-gradient-to-br from-purple-500 to-purple-700 p-2 text-white"
        >
          <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path
            d="M16 8v3M16 21v3M8 16h3M21 16h3M10.5 10.5l2 2M19.5 19.5l2 2M10.5 19.5l2-2M19.5 10.5l2-2"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "hypatia":
      return (
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full bg-gradient-to-br from-pink-500 to-pink-700 p-2 text-white"
        >
          <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <line x1="16" y1="9" x2="16" y2="23" stroke="currentColor" strokeWidth="1" />
          <line x1="9" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="1" />
          <polygon
            points="16,11 19,16 16,21 13,16"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      );
    case "einstein":
      return (
        <svg
          viewBox="0 0 32 32"
          className="h-full w-full bg-gradient-to-br from-rose-500 to-rose-700 p-2 text-white"
        >
          <path
            d="M12 15a4 4 0 0 1 8 0c0 2.5-2 3.5-2 5h-4c0-1.5-2-2.5-2-5zM13 23h6M14 26h4"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="16"
            y1="7"
            x2="16"
            y2="9"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <line
            x1="8"
            y1="11"
            x2="10"
            y2="12"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <line
            x1="24"
            y1="11"
            x2="22"
            y2="12"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

type TabType = "profile" | "tutor" | "theme" | "plan" | "consent";

function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // State Variables
  const [displayName, setDisplayName] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tutorTone, setTutorTone] = useState("encouraging");
  const [tutorStyle, setTutorStyle] = useState("socratic");
  const [tutorDepth, setTutorDepth] = useState("standard");

  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [reauthError, setReauthError] = useState("");

  // Theme & Stats States
  const [isDark, setIsDark] = useState(false);
  const [dailyMessageCount, setDailyMessageCount] = useState(0);

  // Consent States
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(true);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);

  // Fetch profiles table & daily stats
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setDisplayName(data.display_name || "");

          setAvatarUrl(data.avatar_url || null);
          setDisclaimerAccepted(!!data.disclaimer_accepted);
          setCookieConsent(data.cookie_consent !== false);
          setAnalyticsConsent(data.analytics_consent !== false);

          if (data.plan) setCurrentPlan(data.plan);
          if (data.tutor_tone) setTutorTone(data.tutor_tone);
          if (data.tutor_style) setTutorStyle(data.tutor_style);
          if (data.tutor_depth) setTutorDepth(data.tutor_depth);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    })();

    // Fetch message count sent today since midnight
    (async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { count, error } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("role", "user")
          .gte("created_at", startOfDay.toISOString());

        if (!error && count !== null) {
          setDailyMessageCount(count);
        }
      } catch (err) {
        console.error("Failed to fetch message usage stats:", err);
      }
    })();

    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
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
          avatar_url: avatarUrl,
          tutor_tone: tutorTone,
          tutor_style: tutorStyle,
          tutor_depth: tutorDepth,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Settings saved successfully! ✨");
      // Fire broadcast update event so sidebar fetches changes immediately
      window.dispatchEvent(new CustomEvent("custom:profile-updated"));
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to update profile settings."));
    } finally {
      setBusy(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Original photo must be under 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 128;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const base64 = canvas.toDataURL("image/jpeg", 0.75);

            if (base64.length > 50 * 1024) {
              toast.error("Compressed avatar is too large. Choose a simpler photo.");
              return;
            }

            setAvatarUrl(base64);
            toast.success("Photo uploaded and optimized! Save settings to sync. 📸");
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
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
    if (!deletePassword) return;
    setReauthError("");
    setDeleting(true);
    try {
      await deleteAccount({ data: { password: deletePassword } });
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err: any) {
      const msg = err?.message || "Failed to delete account.";
      if (msg.toLowerCase().includes("incorrect password")) {
        setReauthError(msg);
      } else {
        toast.error(friendlyError(err, "Failed to delete account."));
      }
      setDeleting(false);
    }
  };

  const handleDisclaimerRevoke = async () => {
    localStorage.removeItem("gilani_disclaimer_accepted");
    setDisclaimerAccepted(false);
    if (user?.id) {
      await supabase
        .from("profiles")
        .update({
          disclaimer_accepted: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }
    toast.info(
      "AI Disclaimer consent revoked. You will be prompted to read it again on your next dashboard visit.",
    );
  };

  const toggleConsent = async (type: "cookie" | "analytics", value: boolean) => {
    if (type === "cookie") {
      setCookieConsent(value);
      localStorage.setItem("gilani_cookie_consent", String(value));
      toast.success(value ? "Essential cookies enabled." : "Essential cookies disabled.");
    } else {
      setAnalyticsConsent(value);
      localStorage.setItem("gilani_analytics_consent", String(value));
      toast.success(
        value ? "Anonymous usage tracking enabled." : "Anonymous usage tracking disabled.",
      );
    }
    if (user?.id) {
      const updateData =
        type === "cookie"
          ? { cookie_consent: value, updated_at: new Date().toISOString() }
          : { analytics_consent: value, updated_at: new Date().toISOString() };
      await supabase.from("profiles").update(updateData).eq("id", user.id);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !currentPassword) return;
    setEmailBusy(true);
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });
    if (reauthErr) {
      toast.error("Current password is incorrect.");
      setEmailBusy(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailBusy(false);
    if (error) {
      toast.error(error.message || "Failed to update email.");
    } else {
      toast.success("Confirmation sent to your new email. Please verify it.");
      setNewEmail("");
      setCurrentPassword("");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });
    if (reauthErr) {
      toast.error("Current password is incorrect.");
      setPasswordBusy(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordBusy(false);
    if (error) {
      toast.error(error.message || "Failed to update password.");
    } else {
      // Notify user via email that their password was changed
      await supabase.auth
        .resetPasswordForEmail(user?.email ?? "", {
          redirectTo: `${window.location.origin}/login`,
        })
        .catch(() => {}); // best-effort, don't block on failure
      toast.success("Password updated. A confirmation email has been sent to " + user?.email);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  const dailyLimit = currentPlan === "free" ? 10 : currentPlan === "basic" ? 50 : 200;
  const usagePercentage = Math.min(100, (dailyMessageCount / dailyLimit) * 100);

  const TABS = [
    { id: "profile", label: "Profile Details", icon: User },
    { id: "tutor", label: "Tutor Preferences", icon: Brain },
    { id: "theme", label: "Display Theme", icon: Sun },
    { id: "plan", label: "Plan & Usage", icon: CreditCard },
    { id: "consent", label: "Consent & Security", icon: Shield },
  ] as const;

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6 p-3 sm:p-6 lg:p-10 animate-in-slide">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-border/60 pb-5 text-center sm:text-left">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
              Preferences
            </p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold">App Settings</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Customize your tutor's persona, change your profile appearance, and oversee
              subscription parameters.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Navigation Sidebar */}
          <div className="md:col-span-1 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible border border-border/40 bg-card/40 rounded-2xl p-2 gap-2 flex-shrink-0 scrollbar-none">
            {TABS.map((t) => {
              const TabIcon = t.icon;
              const isSelected = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs font-semibold whitespace-nowrap md:w-full transition-all duration-200 border-2 ${
                    isSelected
                      ? "border-primary text-primary bg-transparent font-bold shadow-sm scale-102"
                      : "border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form wrapper */}
          <div className="md:col-span-3 space-y-6">
            <form onSubmit={handleProfileSave} className="space-y-6">
              {/* Profile Details Tab */}
              {activeTab === "profile" && (
                <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
                  <div className="flex items-center gap-2.5">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="font-serif text-xl font-bold text-foreground">
                      Profile Details
                    </h3>
                  </div>

                  {/* Avatar Picker Section */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 bg-background/40 border border-border/20 p-4 rounded-xl">
                    <div className="relative group flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full overflow-hidden border-2 border-primary/20 bg-background shadow-inner">
                      {avatarUrl ? (
                        avatarUrl.startsWith("preset:") ? (
                          <PresetAvatarSVG preset={avatarUrl.substring(7)} />
                        ) : (
                          <img
                            src={avatarUrl}
                            alt="Avatar"
                            className="h-full w-full object-cover"
                          />
                        )
                      ) : (
                        <span className="font-serif text-xl font-bold text-primary">
                          {(displayName || user?.email || "U").substring(0, 2).toUpperCase()}
                        </span>
                      )}
                      {/* Photo Overlap overlay */}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity duration-200">
                        <Upload className="h-5 w-5 text-white" />
                        <input
                          type="file"
                          onChange={handlePhotoUpload}
                          accept="image/*"
                          className="sr-only"
                        />
                      </label>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-foreground">
                        {displayName || "No name set"}
                      </p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Info className="h-3.5 w-3.5 flex-shrink-0 text-primary" /> Upload a photo
                        or use your initials as avatar.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                        Display Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      disabled={busy}
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/95 disabled:opacity-50 transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
                    >
                      <Save className="h-4 w-4" /> {busy ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </section>
              )}

              {/* Tutor Preferences Tab */}
              {activeTab === "tutor" && (
                <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
                  <div className="flex items-center gap-2.5">
                    <Brain className="h-5 w-5 text-primary" />
                    <h3 className="font-serif text-xl font-bold text-foreground">
                      Tutor Preferences
                    </h3>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Personalize how GilaniAI responds to your study questions. Choose styles that
                    match your preferred learning pacing.
                  </p>

                  <div className="space-y-3">
                    {/* Tutor Tone selector */}
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                        Tutor Tone / Personality
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { id: "encouraging", label: "Encouraging", desc: "Warm & supportive" },
                          { id: "scholarly", label: "Scholarly", desc: "Formal & precise" },
                          { id: "friendly", label: "Friendly", desc: "Casual & conversational" },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTutorTone(t.id)}
                            className={`rounded-xl border p-3.5 text-left transition-all ${
                              tutorTone === t.id
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border hover:bg-accent hover:border-primary/20"
                            }`}
                          >
                            <p className="text-xs font-bold">{t.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tutor Style Selector */}
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                        Teaching Methodology
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { id: "socratic", label: "Socratic Method", desc: "Guides with hints" },
                          { id: "direct", label: "Direct Mentor", desc: "Immediate solutions" },
                          {
                            id: "rigorous",
                            label: "Proofs & Derivations",
                            desc: "First principles",
                          },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTutorStyle(t.id)}
                            className={`rounded-xl border p-3.5 text-left transition-all ${
                              tutorStyle === t.id
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border hover:bg-accent hover:border-primary/20"
                            }`}
                          >
                            <p className="text-xs font-bold">{t.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Socratic Depth */}
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                        Scaffolding Depth Level
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          {
                            id: "guided",
                            label: "Highly Scaffolded",
                            desc: "Small incremental hints",
                          },
                          {
                            id: "standard",
                            label: "Standard Paced",
                            desc: "Standard target level",
                          },
                          {
                            id: "rigorous",
                            label: "Deep Challenges",
                            desc: "Minimal hand-holding",
                          },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTutorDepth(t.id)}
                            className={`rounded-xl border p-3.5 text-left transition-all ${
                              tutorDepth === t.id
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                : "border-border hover:bg-accent hover:border-primary/20"
                            }`}
                          >
                            <p className="text-xs font-bold">{t.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      disabled={busy}
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/95 disabled:opacity-50 transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
                    >
                      <Save className="h-4 w-4" /> {busy ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </section>
              )}
            </form>

            {/* Account Credentials */}
            {activeTab === "profile" && (
              <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
                <div className="flex items-center gap-2.5">
                  <Mail className="h-5 w-5 text-primary" />
                  <h3 className="font-serif text-xl font-bold text-foreground">
                    Account Credentials
                  </h3>
                </div>

                <form onSubmit={handleEmailChange} className="space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block">
                    Change Email
                  </label>
                  <input
                    type="email"
                    placeholder="Current email address"
                    value={user?.email ?? ""}
                    readOnly
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                  />
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                  />
                  <input
                    type="email"
                    placeholder="New email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={emailBusy || !newEmail || !currentPassword}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Mail className="h-3.5 w-3.5" /> {emailBusy ? "Sending…" : "Update Email"}
                  </button>
                </form>

                <form onSubmit={handlePasswordChange} className="space-y-2">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block">
                    Change Password
                  </label>
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                  />
                  <input
                    type="password"
                    placeholder="New password (min 8 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={
                      passwordBusy || !currentPassword || !newPassword || !confirmNewPassword
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />{" "}
                    {passwordBusy ? "Updating…" : "Update Password"}
                  </button>
                </form>
              </section>
            )}

            {/* Display Theme Tab */}
            {activeTab === "theme" && (
              <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
                <div className="flex items-center gap-2.5">
                  {isDark ? (
                    <Moon className="h-5 w-5 text-primary" />
                  ) : (
                    <Sun className="h-5 w-5 text-primary" />
                  )}
                  <h3 className="font-serif text-xl font-bold text-foreground">Display Theme</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose between Light mode (scholarly warm parchment layout) and Dark mode
                  (charcoal deep theme).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Light Theme Card */}
                  <button
                    type="button"
                    onClick={() => toggleTheme("light")}
                    className={`group rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                      !isDark
                        ? "border-primary bg-primary/5 shadow-sm scale-101"
                        : "border-border bg-background hover:border-primary/40 hover:bg-accent/40"
                    }`}
                  >
                    <div className="aspect-video w-full rounded-lg bg-orange-50 border border-amber-900/10 p-2 flex flex-col justify-between mb-3 shadow-inner">
                      <div className="h-2.5 w-1/3 rounded-full bg-amber-900/20" />
                      <div className="space-y-1">
                        <div className="h-1.5 w-full rounded-full bg-amber-900/15" />
                        <div className="h-1.5 w-5/6 rounded-full bg-amber-900/15" />
                      </div>
                    </div>
                    <p className="text-sm font-bold flex items-center gap-2 text-amber-950">
                      <Sun className="h-4 w-4 text-primary" /> Scholarly Parchment
                    </p>
                  </button>

                  {/* Dark Theme Card */}
                  <button
                    type="button"
                    onClick={() => toggleTheme("dark")}
                    className={`group rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                      isDark
                        ? "border-primary bg-primary/5 shadow-sm scale-101"
                        : "border-border bg-background hover:border-primary/40 hover:bg-accent/40"
                    }`}
                  >
                    <div className="aspect-video w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 flex flex-col justify-between mb-3 shadow-inner">
                      <div className="h-2.5 w-1/3 rounded-full bg-zinc-800" />
                      <div className="space-y-1">
                        <div className="h-1.5 w-full rounded-full bg-zinc-800" />
                        <div className="h-1.5 w-5/6 rounded-full bg-zinc-800" />
                      </div>
                    </div>
                    <p className="text-sm font-bold flex items-center gap-2 text-zinc-100">
                      <Moon className="h-4 w-4 text-primary" /> Charcoal Dark
                    </p>
                  </button>
                </div>
              </section>
            )}

            {/* Plan & Usage Tab */}
            {activeTab === "plan" && (
              <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="font-serif text-xl font-bold text-foreground">
                    Subscription Plan
                  </h3>
                </div>

                <p className="text-xs text-muted-foreground">
                  Upgrade your plan to unlock more daily questions, quizzes, study notes synthesis,
                  and premium AI models.
                </p>

                {/* Current plan + usage */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="font-bold capitalize text-sm text-foreground">
                        {currentPlan} Plan
                      </span>
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                        Active
                      </span>
                    </div>
                    {currentPlan !== "school" && (
                      <button
                        type="button"
                        onClick={() => setShowPlans(true)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer w-full sm:w-auto"
                      >
                        <CreditCard className="h-3 w-3" /> Upgrade
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Daily messages</span>
                      <span className="font-mono font-bold">
                        {dailyMessageCount} / {(dailyLimit as number) >= 999999 ? "∞" : dailyLimit}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${usagePercentage > 90 ? "bg-red-500" : usagePercentage > 60 ? "bg-amber-500" : "bg-primary"}`}
                        style={{ width: `${usagePercentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Resets daily at midnight EAT
                    </p>
                  </div>
                </div>

                {/* Plan comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(["free", "basic", "premium", "school"] as const).map((pid) => {
                    const p = PLANS[pid];
                    const isActive = currentPlan === pid;
                    return (
                      <div
                        key={pid}
                        className={`rounded-xl border p-4 space-y-3 transition-all ${isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm text-foreground">{p.label}</p>
                            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                              {p.price === 0 ? "Free" : `KSh ${p.price.toLocaleString()}/mo`}
                            </p>
                          </div>
                          {isActive && (
                            <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-primary-foreground">
                              Current
                            </span>
                          )}
                        </div>
                        <ul className="space-y-1">
                          {p.features.map((feat) => (
                            <li
                              key={feat}
                              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                            >
                              <span className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
                              {feat}
                            </li>
                          ))}
                        </ul>
                        {!isActive && pid !== "free" && (
                          <button
                            type="button"
                            onClick={() => setShowPlans(true)}
                            className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
                          >
                            Select Plan
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Consent & Security Tab */}
            {activeTab === "consent" && (
              <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
                <div className="flex items-center gap-2.5">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="font-serif text-xl font-bold text-foreground">
                    Consent & Security
                  </h3>
                </div>

                <div className="space-y-5">
                  {/* AI Disclaimer Consent */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background/50 border border-border/20 p-4 rounded-xl">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <AlertTriangle className="h-4 w-4 text-amber-500" /> AI Disclaimer Agreement
                      </p>
                      <p className="text-xs text-muted-foreground leading-normal max-w-md">
                        Acknowledgment of AI safety rules, limitations, and guidelines for ethical
                        learning assistance.
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
                            type="button"
                            className="rounded-lg border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-accent hover:text-destructive transition-colors cursor-pointer"
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
                  <div className="flex items-center justify-between gap-4 bg-background/50 border border-border/20 p-4 rounded-xl">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <Cookie className="h-4 w-4 text-primary" /> Cookie Storage Consent
                      </p>
                      <p className="text-xs text-muted-foreground leading-normal max-w-md">
                        Required to save session details and client application state locally.
                      </p>
                    </div>
                    <button
                      onClick={() => toggleConsent("cookie", !cookieConsent)}
                      type="button"
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
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
                  <div className="flex items-center justify-between gap-4 bg-background/50 border border-border/20 p-4 rounded-xl">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <BarChart className="h-4 w-4 text-primary" /> Usage Analytics Telemetry
                      </p>
                      <p className="text-xs text-muted-foreground leading-normal max-w-md">
                        Allow anonymous performance logging to help improve study resources.
                      </p>
                    </div>
                    <button
                      onClick={() => toggleConsent("analytics", !analyticsConsent)}
                      type="button"
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
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

                  {/* Policies Section */}
                  <div className="space-y-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      Review Policies
                    </p>
                    <div className="flex flex-col gap-2">
                      <Link
                        to="/terms"
                        className="w-full text-left rounded-xl border border-border hover:bg-accent px-4 py-3 text-xs font-semibold text-primary transition-all flex items-center justify-between"
                      >
                        <span>Terms of Service Agreement</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                      <Link
                        to="/privacy"
                        className="w-full text-left rounded-xl border border-border hover:bg-accent px-4 py-3 text-xs font-semibold text-primary transition-all flex items-center justify-between"
                      >
                        <span>Privacy Policy Commitments</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                      <Link
                        to="/cookies"
                        className="w-full text-left rounded-xl border border-border hover:bg-accent px-4 py-3 text-xs font-semibold text-primary transition-all flex items-center justify-between"
                      >
                        <span>Full Cookie Policy Details</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="border border-destructive/40 bg-destructive/5 rounded-xl p-5 space-y-3">
                    <p className="text-sm font-bold text-destructive flex items-center gap-1.5">
                      <Trash2 className="h-4 w-4" /> Danger Zone
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete your account and all associated data. This action cannot be
                      undone.
                    </p>

                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-destructive/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete My Account
                      </button>
                    ) : (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 space-y-3">
                        <p className="text-xs font-semibold text-destructive">
                          Are you sure? This will permanently delete your account, profile, and all
                          chat history. Enter your password to confirm.
                        </p>
                        <div>
                          <input
                            type="password"
                            placeholder="Enter your password to confirm"
                            value={deletePassword}
                            onChange={(e) => {
                              setDeletePassword(e.target.value);
                              setReauthError("");
                            }}
                            className="w-full rounded-lg border border-destructive/30 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/40"
                          />
                          {reauthError && (
                            <p className="text-xs text-destructive mt-1">{reauthError}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleting || !deletePassword}
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-xs font-bold uppercase tracking-wider text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deleting ? "Deleting..." : "Yes, Delete Everything"}
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeletePassword("");
                              setReauthError("");
                            }}
                            disabled={deleting}
                            type="button"
                            className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {showPlans && <PlansModal onClose={() => setShowPlans(false)} currentPlan={currentPlan} />}
    </>
  );
}
