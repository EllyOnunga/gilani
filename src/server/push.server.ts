/**
 * Server-side Web Push helper.
 * Uses the `web-push` npm package with VAPID keys from env.
 */
import webpush from "web-push";

let _configured = false;

function configureWebPush() {
  if (_configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@gilaniai.site";

  if (!publicKey || !privateKey) {
    console.warn("[Push] VAPID keys not set — push notifications disabled");
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  _configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to a single subscription object.
 * Returns true on success, false on failure.
 */
export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload,
): Promise<boolean> {
  configureWebPush();
  if (!_configured) return false;

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icon-192.png",
        badge: payload.badge || "/icon-192-maskable.png",
        url: payload.url || "/",
        tag: payload.tag || "gilani-notification",
      }),
    );
    return true;
  } catch (err: any) {
    // 410 Gone = subscription expired, should be removed from DB
    if (err?.statusCode === 410) {
      console.warn("[Push] Subscription expired (410):", err.message);
      return false;
    }
    console.error("[Push] Failed to send notification:", err?.message);
    return false;
  }
}
