import { Bell, Mail, Smartphone, RefreshCcw, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/client/supabase";
import type { useSettings } from "@/client/components/settings/hooks/useSettings";

// Utility to convert Base64 URL safe VAPID key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type Props = {
  settings: ReturnType<typeof useSettings>;
};

export function NotificationsTab({ settings }: Props) {
  const { preferences, updatePreference, busy, handleProfileSave } = settings;
  const [isPushToggling, setIsPushToggling] = useState(false);

  const handlePushToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabling = e.target.checked;
    // Optimistically update UI
    updatePreference("notificationsPush", isEnabling);

    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      toast.error("Push notifications are not supported in your browser.");
      updatePreference("notificationsPush", false);
      return;
    }

    setIsPushToggling(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      if (isEnabling) {
        // Ask for permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("You must grant permission to receive push notifications.");
          updatePreference("notificationsPush", false);
          return;
        }

        // Subscribe via Service Worker
        const swRegistration = await navigator.serviceWorker.ready;
        let subscription = await swRegistration.pushManager.getSubscription();

        if (!subscription) {
          const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          if (!vapidKey) throw new Error("VAPID public key not found");

          subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        }

        // Send subscription to backend
        const res = await fetch("/api/notifications/push-subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ subscription }),
        });

        if (!res.ok) throw new Error("Failed to save push subscription");
        toast.success("Push notifications enabled!");
      } else {
        // Disabling
        const swRegistration = await navigator.serviceWorker.ready;
        const subscription = await swRegistration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }

        const res = await fetch("/api/notifications/push-subscribe", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) throw new Error("Failed to remove push subscription");
        toast.info("Push notifications disabled.");
      }
    } catch (err: any) {
      console.error("[Push Setup Error]:", err);
      toast.error(err.message || "Something went wrong setting up push notifications.");
      // Revert optimism on error
      updatePreference("notificationsPush", !isEnabling);
    } finally {
      setIsPushToggling(false);
    }
  };

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
              <label htmlFor="notif-email" className="text-sm font-semibold text-foreground">
                Email Notifications
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Receive emails when a teacher replies to an escalation.
            </p>
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
              <label htmlFor="notif-push" className="text-sm font-semibold text-foreground">
                Push Notifications
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Receive in-app push notifications for reminders.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="notif-push"
              className="sr-only peer"
              checked={preferences.notificationsPush}
              disabled={isPushToggling}
              onChange={handlePushToggle}
            />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="notif-digest" className="text-sm font-semibold text-foreground">
                Weekly Digest
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Get a weekly summary of your study progress.
            </p>
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
          <span className="inline-flex items-center gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Saving…" : "Save Preferences"}
          </span>
        </button>
      </div>
    </section>
  );
}
