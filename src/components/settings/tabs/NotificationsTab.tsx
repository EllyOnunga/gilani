import { Bell, Mail, Smartphone, RefreshCcw } from "lucide-react";
import type { useSettings } from "@/components/settings/hooks/useSettings";

type Props = {
  settings: ReturnType<typeof useSettings>;
};

export function NotificationsTab({ settings }: Props) {
  const { preferences, updatePreference, busy, handleProfileSave } = settings;

  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
      <div className="flex items-center gap-2.5">
        <Bell className="h-5 w-5 text-primary" />
        <h3 className="font-serif text-xl font-bold text-foreground">Notifications</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Choose how and when we should contact you with updates, reminders, and study digests.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="notif-email" className="text-sm font-semibold text-foreground">Email Notifications</label>
            </div>
            <p className="text-[11px] text-muted-foreground">Receive emails when a teacher replies to an escalation.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="notif-email"
              className="sr-only peer"
              checked={preferences.notificationsEmail}
              onChange={(e) => updatePreference("notificationsEmail", e.target.checked)}
            />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="notif-push" className="text-sm font-semibold text-foreground">Push Notifications</label>
            </div>
            <p className="text-[11px] text-muted-foreground">Receive in-app push notifications for reminders.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="notif-push"
              className="sr-only peer"
              checked={preferences.notificationsPush}
              onChange={(e) => updatePreference("notificationsPush", e.target.checked)}
            />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="notif-digest" className="text-sm font-semibold text-foreground">Weekly Digest</label>
            </div>
            <p className="text-[11px] text-muted-foreground">Get a weekly summary of your study progress.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="notif-digest"
              className="sr-only peer"
              checked={preferences.notificationsDigest}
              onChange={(e) => updatePreference("notificationsDigest", e.target.checked)}
            />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleProfileSave}
          disabled={busy}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </section>
  );
}
