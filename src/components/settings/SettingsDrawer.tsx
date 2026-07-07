import { useState, useEffect } from "react";
import { X, User, Sun, Shield, CreditCard, Brain, ChevronRight, ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/components/settings/hooks/useSettings";
import { PresetAvatarSVG } from "@/components/settings/PresetAvatarSVG";
import { ProfileDetailsTab } from "@/components/settings/tabs/ProfileDetailsTab";
import { TutorPreferencesTab } from "@/components/settings/tabs/TutorPreferencesTab";
import { DisplayThemeTab } from "@/components/settings/tabs/DisplayThemeTab";
import { PlanUsageTab } from "@/components/settings/tabs/PlanUsageTab";
import { ConsentSecurityTab } from "@/components/settings/tabs/ConsentSecurityTab";
import { AccountCredentialsTab } from "@/components/settings/tabs/AccountCredentialsTab";
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
  { id: "tutor" as const, label: "Tutor Preferences", icon: Brain, description: "Teaching style and personality" },
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
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Reset to menu view when drawer closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setActiveTabId(null), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const activeTab = TABS.find((t) => t.id === activeTabId);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-[70] flex flex-col w-full max-w-md bg-sidebar border-l border-border shadow-2xl transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-sidebar/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {activeTabId && (
              <button
                onClick={() => setActiveTabId(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                title="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                {activeTabId ? "Settings" : "Preferences"}
              </p>
              <h2 className="font-serif text-base font-bold text-foreground leading-tight">
                {activeTab?.label ?? "App Settings"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            title="Close Settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Menu view */}
          <div className={`transition-all duration-200 ${activeTabId ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"}`}>
            {/* User card */}
            <div className="mx-4 mt-5 mb-4 flex items-center gap-3 rounded-2xl bg-muted/30 border border-border/40 p-3.5">
              <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full overflow-hidden border-2 border-primary/30 bg-background/60 shadow-inner">
                {settings.avatarUrl ? (
                  settings.avatarUrl.startsWith("preset:") ? (
                    <PresetAvatarSVG preset={settings.avatarUrl.substring(7)} />
                  ) : (
                    <img src={settings.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  )
                ) : (
                  <span className="font-serif text-sm font-bold text-foreground">
                    {(settings.displayName || user?.email || "U").substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{settings.displayName || user?.email?.split("@")[0] || "User"}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/20">
                {settings.currentPlan}
              </span>
            </div>

            {/* Tab buttons */}
            <nav className="px-4 space-y-1.5 pb-6">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      settings.setActiveTab(tab.id);
                      setActiveTabId(tab.id);
                    }}
                    className="group flex w-full items-center gap-3.5 rounded-2xl border border-border/30 bg-card/40 px-4 py-3.5 text-left transition-all duration-200 hover:bg-muted/40 hover:border-border/60 hover:shadow-sm active:scale-[0.98]"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted/60 border border-border/40 text-foreground group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:text-primary transition-all duration-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground leading-tight">{tab.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{tab.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab content view */}
          <div className={`transition-all duration-200 ${!activeTabId ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100 p-5 space-y-5"}`}>
            {activeTabId === "profile" && (
              <>
                <ProfileDetailsTab settings={settings} userEmail={user?.email} PresetAvatarSVG={PresetAvatarSVG} />
                <AccountCredentialsTab settings={settings} userEmail={user?.email} />
              </>
            )}
            {activeTabId === "tutor" && <TutorPreferencesTab settings={settings} />}
            {activeTabId === "theme" && <DisplayThemeTab settings={settings} />}
            {activeTabId === "plan" && <PlanUsageTab settings={settings} />}
            {activeTabId === "consent" && <ConsentSecurityTab settings={settings} userEmail={user?.email} />}
          </div>
        </div>
      </aside>

      {settings.showPlans && <PlansModal onClose={() => settings.setShowPlans(false)} currentPlan={settings.currentPlan} />}
    </>
  );
}
