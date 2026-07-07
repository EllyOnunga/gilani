import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { User, Sun, Shield, CreditCard, Brain, Menu, Bell, Globe, Monitor, Keyboard } from "lucide-react";
import { useLayout } from "@/contexts/layout-context";
import { NotificationBell } from "@/components/notifications";
import { TutorPageHeader } from "@/components/tutor/TutorPageHeader";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { PlansModal } from "@/components/PlansModal";
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
          html: emailTemplate({
            heading: "Account Deleted",
            body: "This confirms that your GilaniAI account and all associated data have been permanently deleted, as requested. If you did not request this, please contact us immediately at support@gilaniai.site.<br/><br/>We are sorry to see you go -- you are always welcome back.",
            footerNote: "This is an automated confirmation. No further action is needed.",
          }),
        });
      } catch (emailErr) {
        console.error("[deleteAccount] confirmation email failed:", emailErr);
      }
    }
  });

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — GilaniAI" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: SettingsPage,
});

const TABS = [
  { id: "profile", label: "Profile Details", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "language", label: "Language & Region", icon: Globe },
  { id: "tutor", label: "Tutor Preferences", icon: Brain },
  { id: "accessibility", label: "Accessibility", icon: Monitor },
  { id: "shortcuts", label: "Keyboard Shortcuts", icon: Keyboard },
  { id: "theme", label: "Display Theme", icon: Sun },
  { id: "plan", label: "Plan & Usage", icon: CreditCard },
  { id: "consent", label: "Consent & Security", icon: Shield },
] as const;

function SettingsPage() {
  const { user } = useAuth();
  const { setSidebarOpen } = useLayout();
  const settings = useSettings(user, { deleteAccount });

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <TutorPageHeader 
          title="App Settings" 
          subtitle="Customize your tutor's persona, change your profile appearance, and oversee subscription parameters." 
          actions={user?.id ? <NotificationBell userId={user.id} /> : null}
        />
        
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8 animate-in-slide">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Navigation Sidebar */}
          <div className="md:col-span-1 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible border border-border/40 bg-card/40 rounded-2xl p-2 gap-2 flex-shrink-0 scrollbar-none">
            {TABS.map((t) => {
              const TabIcon = t.icon;
              const isSelected = settings.activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => settings.setActiveTab(t.id as any)}
                  className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-xs font-semibold whitespace-nowrap md:w-full transition-all duration-200 border-2 ${
                    isSelected ? "border-primary text-primary bg-transparent font-bold shadow-sm scale-102" : "border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground"
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
