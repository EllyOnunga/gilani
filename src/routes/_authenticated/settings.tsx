import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  User,
  Sun,
  Shield,
  CreditCard,
  Brain,
  ChevronLeft,
  Bell,
  Globe,
  Monitor,
  Keyboard,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useAuth } from "@/client/hooks/use-auth";
import { useSettings } from "@/client/components/settings/hooks/useSettings";
import { useI18n } from "@/client/i18n/I18nContext";
import { useLayout } from "@/client/contexts/layout-context";
import { PresetAvatarSVG } from "@/client/components/settings/PresetAvatarSVG";
import { ProfileDetailsTab } from "@/client/components/settings/tabs/ProfileDetailsTab";
import { TutorPreferencesTab } from "@/client/components/settings/tabs/TutorPreferencesTab";
import { DisplayThemeTab } from "@/client/components/settings/tabs/DisplayThemeTab";
import { PlanUsageTab } from "@/client/components/settings/tabs/PlanUsageTab";
import { ConsentSecurityTab } from "@/client/components/settings/tabs/ConsentSecurityTab";
import { AccountCredentialsTab } from "@/client/components/settings/tabs/AccountCredentialsTab";
import { NotificationsTab } from "@/client/components/settings/tabs/NotificationsTab";
import { LanguageRegionTab } from "@/client/components/settings/tabs/LanguageRegionTab";
import { AccessibilityTab } from "@/client/components/settings/tabs/AccessibilityTab";
import { ShortcutsTab } from "@/client/components/settings/tabs/ShortcutsTab";
import { PlansModal } from "@/client/components/PlansModal";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/server/supabase";
import { authenticateRequest } from "@/server/api-auth.server";
import { AppHeader } from "@/client/components/layout/AppHeader";

const deleteAccount = createServerFn({ method: "POST" })
  .validator((data: { otp: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const { userId, user } = authResult;
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    if (roleRow?.role === "admin")
      throw new Error("Admin accounts cannot be self-deleted. Transfer ownership first.");
    const userEmail = user.email;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    if (userEmail) {
      try {
        const { sendTransactionalEmail, emailTemplate } = await import("@/server/email.server");
        await sendTransactionalEmail({
          to: userEmail,
          subject: "Your GilaniAI account has been deleted",
          fromEmail: "noreply@gilaniai.site",
          html: emailTemplate({
            heading: "Account Deleted",
            body: "This confirms that your GilaniAI account and all associated data have been permanently deleted, as requested.",
            footerNote: "This is an automated confirmation. No further action is needed.",
          }),
        });
      } catch {
        /* ignore */
      }
    }
  });

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const settings = useSettings(user, { deleteAccount });
  const { t } = useI18n();
  const { setSidebarOpen } = useLayout();

  const [mobileView, setMobileView] = useState<"list" | "content">("list");

  const TABS = [
    { id: "profile" as const, label: t("tab_profile"), icon: User },
    { id: "notifications" as const, label: t("tab_notifications"), icon: Bell },
    { id: "language" as const, label: t("tab_language"), icon: Globe },
    { id: "tutor" as const, label: t("tab_tutor"), icon: Brain },
    { id: "theme" as const, label: t("tab_theme"), icon: Sun },
    { id: "accessibility" as const, label: t("tab_accessibility"), icon: Monitor },
    { id: "shortcuts" as const, label: t("tab_shortcuts"), icon: Keyboard },
    { id: "plan" as const, label: t("tab_plan"), icon: CreditCard },
    { id: "consent" as const, label: t("tab_consent"), icon: Shield },
  ];

  // Default to "profile" on desktop
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768 && !settings.activeTab) {
      settings.setActiveTab("profile");
    }
  }, []);

  const activeTabLabel =
    TABS.find((tab) => tab.id === settings.activeTab)?.label ?? t("tab_settings");

  const handleTabClick = (tabId: (typeof TABS)[number]["id"]) => {
    settings.setActiveTab(tabId);
    setMobileView("content");
  };

  const handleBackToList = () => {
    setMobileView("list");
  };

  return (
    <div className="flex flex-col h-full bg-background w-full">
      {/* Optional: we don't strictly need a global AppHeader here if we build our own, 
          but adding it for standard mobile menu toggle */}
      <div className="md:hidden flex items-center justify-between border-b border-border/60 px-4 h-14 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          {mobileView === "content" ? (
            <button
              onClick={handleBackToList}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{t("tab_settings")}</span>
            </button>
          ) : (
            <h1 className="text-base font-semibold text-foreground">{t("tab_settings")}</h1>
          )}
        </div>
        {settings.busy && (
          <span className="text-[10px] text-muted-foreground animate-pulse pr-2">saving…</span>
        )}
      </div>

      {/* Main Layout Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── MOBILE LIST VIEW ─────────────────────────────────────────────────── */}
        {mobileView === "list" && (
          <nav className="flex-1 md:hidden overflow-y-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = settings.activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 border-b border-border/40 transition-colors ${
                    isActive ? "bg-muted/50 text-foreground" : "text-foreground hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </button>
              );
            })}
          </nav>
        )}

        {/* ── MOBILE CONTENT VIEW ─────────────────────────────────────────────── */}
        {mobileView === "content" && (
          <div className="flex-1 md:hidden overflow-y-auto p-5">
            <h2 className="text-base font-semibold text-foreground mb-5">{activeTabLabel}</h2>
            {renderContent(settings, user)}
          </div>
        )}

        {/* ── DESKTOP LAYOUT ────────────────────────────────────────────────── */}
        <div className="hidden md:flex w-full h-full">
          {/* Left nav column */}
          <div className="w-64 lg:w-72 flex-shrink-0 border-r border-border/60 flex flex-col bg-muted/20">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-6 flex-shrink-0 border-b border-border/40">
              <h1 className="text-lg font-semibold text-foreground">{t("tab_settings")}</h1>
              {settings.busy && (
                <span className="text-xs text-muted-foreground animate-pulse">saving…</span>
              )}
            </div>

            {/* Tab nav */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = settings.activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => settings.setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition-all duration-150 ${
                      isActive
                        ? "bg-muted text-foreground font-medium shadow-sm border border-border/50"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
            {/* Desktop content header */}
            <div className="flex items-center justify-between px-10 pt-8 pb-4 border-b border-border/30 flex-shrink-0">
              <h2 className="text-xl font-semibold text-foreground">
                {settings.activeTab ? activeTabLabel : ""}
              </h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-10 py-8">
              {!settings.activeTab ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-3">
                  <p className="text-sm text-muted-foreground">Select a setting from the left</p>
                </div>
              ) : (
                <div className="max-w-2xl space-y-8 animate-in fade-in duration-200 pb-12">
                  {renderContent(settings, user)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {settings.showPlans && (
        <PlansModal
          onClose={() => settings.setShowPlans(false)}
          currentPlan={settings.currentPlan}
        />
      )}
    </div>
  );
}

function renderContent(
  settings: ReturnType<typeof useSettings>,
  user: ReturnType<typeof useAuth>["user"],
) {
  switch (settings.activeTab) {
    case "profile":
      return (
        <>
          <ProfileDetailsTab
            settings={settings}
            userEmail={user?.email}
            PresetAvatarSVG={PresetAvatarSVG}
          />
          <AccountCredentialsTab settings={settings} userEmail={user?.email} />
        </>
      );
    case "notifications":
      return <NotificationsTab settings={settings} />;
    case "language":
      return <LanguageRegionTab settings={settings} />;
    case "tutor":
      return <TutorPreferencesTab settings={settings} />;
    case "theme":
      return <DisplayThemeTab settings={settings} />;
    case "accessibility":
      return <AccessibilityTab settings={settings} />;
    case "shortcuts":
      return <ShortcutsTab settings={settings} />;
    case "plan":
      return <PlanUsageTab settings={settings} />;
    case "consent":
      return <ConsentSecurityTab settings={settings} userEmail={user?.email} />;
    default:
      return null;
  }
}
