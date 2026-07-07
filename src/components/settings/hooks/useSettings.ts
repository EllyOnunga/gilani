import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/async";

export type TabType =
  | "profile"
  | "tutor"
  | "theme"
  | "plan"
  | "consent"
  | "notifications"
  | "language"
  | "accessibility"
  | "shortcuts"
  | "sessions";

type SettingsServerFns = {
  deleteAccount: (args: { data: { otp: string } }) => Promise<void>;
};

export function useSettings(user: any, serverFns: SettingsServerFns) {
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // Profile Details
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Tutor Preferences
  const [tutorTone, setTutorTone] = useState("encouraging");
  const [tutorStyle, setTutorStyle] = useState("socratic");
  const [tutorDepth, setTutorDepth] = useState("standard");

  // Advanced Preferences (JSONB)
  const [preferences, setPreferences] = useState<Record<string, any>>({
    notificationsEmail: true,
    notificationsPush: false,
    notificationsDigest: true,
    uiLanguage: "en",
    curriculum: "KCSE",
    timezone: "EAT",
    grade: "",
    subjectsEnrolled: [],
    targetGrade: "",
    responseLanguage: "english",
    stepByStepDefault: true,
    mathRendering: "latex",
    autoSaveResponses: false,
    fontSize: "standard",
    reduceMotion: false,
    highContrast: false,
  });

  const updatePreference = useCallback((key: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Loading States
  const [busy, setBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reauthSending, setReauthSending] = useState(false);

  // Plan & Usage
  const [showPlans, setShowPlans] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [dailyMessageCount, setDailyMessageCount] = useState(0);

  // Account Deletion Flow
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reauthError, setReauthError] = useState("");
  const [reauthOtp, setReauthOtp] = useState("");
  const [reauthSent, setReauthSent] = useState(false);

  // Credentials Update Flow
  const [newEmail, setNewEmail] = useState("");

  // Consent & Theme
  const [isDark, setIsDark] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(true);
  const [analyticsConsent, setAnalyticsConsent] = useState(true);

  // ─── Data Fetching ───────────────────────────────────────────────────────────
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
          setDisclaimerAccepted(!!(data as any).disclaimer_accepted);
          setCookieConsent((data as any).cookie_consent !== false);
          setAnalyticsConsent((data as any).analytics_consent !== false);

          if ((data as any).plan) setCurrentPlan((data as any).plan);
          if ((data as any).tutor_tone) setTutorTone((data as any).tutor_tone);
          if ((data as any).tutor_style) setTutorStyle((data as any).tutor_style);
          if ((data as any).tutor_depth) setTutorDepth((data as any).tutor_depth);
          if ((data as any).preferences) {
            setPreferences((prev) => ({ ...prev, ...(data as any).preferences }));
          } else {
            // Fallback: load from localStorage if DB column not migrated yet
            const local = localStorage.getItem(`gilani_prefs_${user.id}`);
            if (local) {
              try {
                const parsed = JSON.parse(local);
                if (parsed.tutorTone) setTutorTone(parsed.tutorTone);
                if (parsed.tutorStyle) setTutorStyle(parsed.tutorStyle);
                if (parsed.tutorDepth) setTutorDepth(parsed.tutorDepth);
                if (parsed.preferences)
                  setPreferences((prev) => ({ ...prev, ...parsed.preferences }));
              } catch {
                /* ignore */
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    })();

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

  // ─── Analytics ────────────────────────────────────────────────────────────────
  const fireSettingsEvent = useCallback(
    (action: string, payload?: Record<string, any>) => {
      if (!user?.id) return;
      // Fire-and-forget: no await, never blocks UI
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;
        fetch("/api/settings/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action, payload }),
        }).catch(() => {}); // silently ignore failures
      });
    },
    [user?.id],
  );

  const setActiveTabTracked = useCallback(
    (tab: TabType) => {
      setActiveTab(tab);
      fireSettingsEvent("settings.tab_viewed", { tab });
    },
    [fireSettingsEvent],
  );

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleProfileSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user?.id) return;

    setBusy(true);
    try {
      // Step 1: Save core fields that are always present in the profiles table
      const corePayload: Record<string, any> = {
        id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: coreError } = await supabase.from("profiles").upsert(corePayload as any);

      if (coreError) throw coreError;

      // Step 2: Attempt to save extended columns; silently ignore if columns don't exist yet.
      // These will work once the DB migration has been applied.
      const extPayload: Record<string, any> = {
        id: user.id,
        tutor_tone: tutorTone,
        tutor_style: tutorStyle,
        tutor_depth: tutorDepth,
        disclaimer_accepted: disclaimerAccepted,
        cookie_consent: cookieConsent,
        analytics_consent: analyticsConsent,
        preferences,
        updated_at: new Date().toISOString(),
      };

      const { error: extError } = await supabase.from("profiles").upsert(extPayload as any);

      if (extError) {
        // Extended columns missing — store preferences locally as fallback
        console.warn(
          "[Settings] Extended columns not yet migrated, using localStorage fallback:",
          extError.message,
        );
        localStorage.setItem(
          `gilani_prefs_${user.id}`,
          JSON.stringify({
            tutorTone,
            tutorStyle,
            tutorDepth,
            disclaimerAccepted,
            cookieConsent,
            analyticsConsent,
            preferences,
          }),
        );
      }

      // Analytics: log which tab/preferences were saved
      fireSettingsEvent("settings.preferences_saved", {
        tab: activeTab,
        tutorTone,
        tutorStyle,
        tutorDepth,
        preferencesKeys: Object.keys(preferences),
      });

      toast.success("Settings saved successfully! ✨");
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

  const handleRequestReauth = async () => {
    setReauthSending(true);
    setReauthError("");
    const { error } = await supabase.auth.reauthenticate();
    setReauthSending(false);
    if (error) setReauthError("Failed to send verification code. Please try again.");
    else setReauthSent(true);
  };

  const handleDeleteAccount = async () => {
    if (!reauthOtp) return;
    setReauthError("");
    setDeleting(true);
    try {
      const { error: otpError } = await supabase.auth.updateUser({}, { nonce: reauthOtp } as any);
      if (otpError) {
        setReauthError("Invalid or expired verification code. Please try again.");
        setDeleting(false);
        return;
      }
      await serverFns.deleteAccount({ data: { otp: reauthOtp } });
      await supabase.auth.signOut();
      toast.success("Account deleted successfully.");
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err: any) {
      setReauthError(friendlyError(err, "Failed to delete account."));
      setDeleting(false);
    }
  };

  const handleDisclaimerRevoke = async () => {
    localStorage.removeItem("gilani_disclaimer_accepted");
    setDisclaimerAccepted(false);
    if (user?.id) {
      await supabase
        .from("profiles")
        .update({ disclaimer_accepted: false, updated_at: new Date().toISOString() })
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
    if (!newEmail) return;
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailBusy(false);
    if (error) toast.error(error.message || "Failed to update email.");
    else {
      toast.success("Confirmation sent to your new email. Please verify it.");
      setNewEmail("");
    }
  };

  return {
    activeTab,
    setActiveTab: setActiveTabTracked,
    displayName,
    setDisplayName,
    avatarUrl,
    setAvatarUrl,
    tutorTone,
    setTutorTone,
    tutorStyle,
    setTutorStyle,
    tutorDepth,
    setTutorDepth,
    preferences,
    updatePreference,
    busy,
    emailBusy,
    deleting,
    reauthSending,
    showPlans,
    setShowPlans,
    currentPlan,
    setCurrentPlan,
    dailyMessageCount,
    showDeleteConfirm,
    setShowDeleteConfirm,
    reauthError,
    setReauthError,
    reauthOtp,
    setReauthOtp,
    reauthSent,
    setReauthSent,
    newEmail,
    setNewEmail,
    isDark,
    setIsDark,
    disclaimerAccepted,
    setDisclaimerAccepted,
    cookieConsent,
    setCookieConsent,
    analyticsConsent,
    setAnalyticsConsent,
    handleProfileSave,
    handlePhotoUpload,
    toggleTheme,
    handleRequestReauth,
    handleDeleteAccount,
    handleDisclaimerRevoke,
    toggleConsent,
    handleEmailChange,
  };
}
