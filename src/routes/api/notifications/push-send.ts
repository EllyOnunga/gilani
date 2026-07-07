import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { sendPushNotification } from "@/lib/push.server";
import type { PushPayload } from "@/lib/push.server";

export const Route = createFileRoute("/api/notifications/push-send")({
  server: {
    handlers: {
      /**
       * Send a push notification to a specific user.
       * Admin-only or service-role access.
       */
      POST: async () => {
        try {
          const request = getRequest();
          const authResult = await authenticateRequest(request);

          // Only admins can send arbitrary push notifications
          const { data: roleRow } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", authResult.userId)
            .in("role", ["admin"])
            .single();

          if (!roleRow) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          const body = await request.json().catch(() => ({}));
          const { targetUserId, title, message, url } = body as {
            targetUserId?: string;
            title?: string;
            message?: string;
            url?: string;
          };

          if (!targetUserId || !title || !message) {
            return new Response(
              JSON.stringify({ error: "targetUserId, title, and message are required" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // Fetch target user's subscription
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("push_subscription")
            .eq("id", targetUserId)
            .single();

          if (!(profile as any)?.push_subscription) {
            return new Response(
              JSON.stringify({ error: "Target user has no push subscription" }),
              { status: 404, headers: { "Content-Type": "application/json" } },
            );
          }

          const payload: PushPayload = { title, body: message, url: url || "/" };
          const sent = await sendPushNotification(
            (profile as any).push_subscription,
            payload,
          );

          return new Response(JSON.stringify({ ok: sent }), {
            status: sent ? 200 : 500,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[API Push Send] Error:", error);
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
