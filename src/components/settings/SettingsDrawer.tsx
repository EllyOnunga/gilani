import { useState, useEffect } from "react";
import { X, User, Sun, Shield, CreditCard, Brain, ChevronRight, ChevronLeft, Settings, Bell, Globe, Monitor, Keyboard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/components/settings/hooks/useSettings";
import { PresetAvatarSVG } from "@/components/settings/PresetAvatarSVG";
import { ProfileDetailsTab } from "@/components/settings/tabs/ProfileDetailsTab";
import { TutorPreferencesTab } from "@/components/settings/tabs/TutorPreferencesTab";
import { DisplayThemeTab } from "@/components/settings/tabs/DisplayThemeTab";
import { PlanUsageTab } from "@/components/settings/tabs/PlanUsageTab";
import { ConsentSecurityTab } from "@/components/settings/tabs/ConsentSecurityTab";
import { AccountCredentialsTab } from "@/components/settings/tabs/AccountCredentialsTab";
import { NotificationsTab } from "@/components/settings/tabs/NotificationsTab";
import { LanguageRegionTab } from "@/components/settings/tabs/LanguageRegionTab";
import { AccessibilityTab } from "@/components/settings/tabs/AccessibilityTab";
import { ShortcutsTab } from "@/components/settings/tabs/ShortcutsTab";
import { PlansModal } from "@/components/PlansModal";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";

const deleteAccount = createServerFn({ method: "POST" })
  .validator((data: { otp: string }) => data)
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try { authResult = await authenticateRequest(request); } catch (err) { throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized"); }
    const { userId, user } = authResult;
    const { data: roleRow } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).single();
    if (roleRow?.role === "admin") throw new Error("Admin accounts cannot be self-deleted. Transfer ownership first.");
    const userEmail = user.email;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    if (userEmail) {
      try {
        const { sendTransactionalEmail, emailTemplate } = await import("@/lib/email.server");
        await sendTransactionalEmail({
          to: userEmail,
          subject: "Your GilaniAI account has been deleted",
          fromEmail: "noreply@gilaniai.site",
          html: emailTemplate({ heading: "Account Deleted", body: "This confirms that your GilaniAI account and all associated data have been permanently deleted, as requested.", footerNote: "This is an automated confirmation. No further action is needed." }),
        });
      } catch { /* ignore */ }
    }
  });

const TABS = [
  { id: "profile" as const, label: "Profile Details", icon: User, description: "Name, avatar and account credentials" },
  { id: "notifications" as const, label: "Notifications", icon: Bell, description: "Email and push alerts" },
  { id: "language" as const, label: "Language & Region", icon: Globe, description: "Locale and time settings" },
  { id: "tutor" as const, label: "Tutor Preferences", icon: Brain, description: "Teaching style and personality" },
  { id: "accessibility" as const, label: "Accessibility", icon: Monitor, description: "Font size and contrast" },
  { id: "shortcuts" as const, label: "Keyboard Shortcuts", icon: Keyboard, description: "App navigation hotkeys" },
  { id: "theme" as const, label: "Display Theme", icon: Sun, description: "Light, dark and appearance" },
  { id: "plan" as const, label: "Plan & Usage", icon: CreditCard, description: "Subscription and message limits" },
  { id: "consent" as const, label: "Consent & Security", icon: Shield, description: "Privacy, consent and data" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsDrawer({ open, onClose }: Props) {
  const { user } = useAuth();
  const settings = useSettings(user, { deleteAccount });

  // On mount, sync settings active tab to default "profile" if empty
  useEffect(() => {
    if (open && !settings.activeTab) {
      settings.setActiveTab("profile");
    }
  }, [open, settings.activeTab]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Centered Modal / Fullscreen on Mobile */}
      <div
        className={`fixed inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[70] flex flex-col md:w-[90vw] md:max-w-5xl md:h-[85vh] bg-background md:rounded-2xl md:border md:border-border shadow-2xl transition-all duration-300 ease-in-out ${
          open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 md:scale-95 translate-y-4 md:translate-y-[calc(-50%+1rem)] pointer-events-none"
        }`}
      >
        {/* Mobile Header (Only visible on mobile) */}
        <header className="md:hidden flex h-14 items-center justify-between border-b border-border px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-semibold text-foreground">App Settings</h1>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground active:scale-95 flex-shrink-0"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </header>

        {/* Layout: Sidebar + Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-border bg-sidebar/50 flex flex-col">
            {/* Desktop Header area */}
            <div className="hidden md:flex items-center justify-between p-5 border-b border-border/40">
              <h2 className="font-serif text-lg font-bold text-foreground">Settings</h2>
              <button 
                onClick={onClose} 
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Tab navigation */}
            <nav className="flex-1 overflow-y-auto p-2 md:p-3 flex flex-row md:flex-col gap-1 overflow-x-auto scrollbar-none">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isSelected = settings.activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => settings.setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200 whitespace-nowrap md:whitespace-normal group ${
                      isSelected 
                        ? "bg-muted text-foreground shadow-sm" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-primary" : ""}`} />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {settings.activeTab === "profile" && (
                <>
                  <ProfileDetailsTab settings={settings} userEmail={user?.email} PresetAvatarSVG={PresetAvatarSVG} />
                  <AccountCredentialsTab settings={settings} userEmail={user?.email} />
                </>
              )}
              {settings.activeTab === "notifications" && <NotificationsTab settings={settings} />}
              {settings.activeTab === "language" && <LanguageRegionTab settings={settings} />}
              {settings.activeTab === "tutor" && <TutorPreferencesTab settings={settings} />}
              {settings.activeTab === "accessibility" && <AccessibilityTab settings={settings} />}
              {settings.activeTab === "shortcuts" && <ShortcutsTab settings={settings} />}
              {settings.activeTab === "theme" && <DisplayThemeTab settings={settings} />}
              {settings.activeTab === "plan" && <PlanUsageTab settings={settings} />}
              {settings.activeTab === "consent" && <ConsentSecurityTab settings={settings} userEmail={user?.email} />}
            </div>
          </div>
        </div>
      </div>

      {settings.showPlans && <PlansModal onClose={() => settings.setShowPlans(false)} currentPlan={settings.currentPlan} />}
    </>
  );
}
