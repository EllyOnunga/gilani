import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/server/supabase";
import { authenticateRequest } from "@/server/api-auth.server";

export const Route = createFileRoute("/api/notifications/push-subscribe")({
  server: {
    handlers: {
      /** Save a push subscription to the user's profile */
      POST: async () => {
        try {
          const request = getRequest();
          const { userId } = await authenticateRequest(request);

          const body = await request.json().catch(() => ({}));
          const { subscription } = body as { subscription?: object };

          if (!subscription || typeof subscription !== "object") {
            return new Response(JSON.stringify({ error: "subscription object is required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ push_subscription: subscription } as any)
            .eq("id", userId);

          if (error) throw error;

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[API Push Subscribe] Error:", error);
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },

      /** Remove push subscription (user opted out) */
      DELETE: async () => {
        try {
          const request = getRequest();
          const { userId } = await authenticateRequest(request);

          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ push_subscription: null } as any)
            .eq("id", userId);

          if (error) throw error;

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[API Push Unsubscribe] Error:", error);
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
