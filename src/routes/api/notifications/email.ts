import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/server/supabase";
import { authenticateRequest } from "@/server/api-auth.server";
import {
  sendTransactionalEmail,
  teacherReplyEmailTemplate,
  studyReminderEmailTemplate,
} from "@/server/email.server";

export const Route = createFileRoute("/api/notifications/email")({
  server: {
    handlers: {
      /**
       * Send a specific email notification (e.g., teacher reply).
       * Must be authenticated, or triggered via service role.
       */
      POST: async () => {
        try {
          const request = getRequest();
          // We can allow either authenticated user OR service role (cron/webhooks)
          // For simplicity here, we assume it's called by an authenticated admin or teacher
          const authResult = await authenticateRequest(request);

          const body = await request.json().catch(() => ({}));
          const { type, targetUserId, payload } = body as {
            type: "teacher_reply" | "study_reminder";
            targetUserId: string;
            payload: any;
          };

          if (!type || !targetUserId || !payload) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Fetch target user's profile and preferences
          const { data: profile } = await (supabaseAdmin as any)
            .from("profiles")
            .select("display_name, preferences")
            .eq("id", targetUserId)
            .single();

          if (!profile) {
            return new Response(JSON.stringify({ error: "User not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Respect user preferences (default to true if preferences JSON doesn't exist yet)
          const prefs = (profile.preferences as any) || {};
          if (prefs.notificationsEmail === false) {
            return new Response(
              JSON.stringify({ message: "User opted out of email notifications" }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Fetch auth email
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
          const email = authUser?.user?.email;

          if (!email) {
            return new Response(JSON.stringify({ error: "No email address found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          let html = "";
          let subject = "";

          if (type === "teacher_reply") {
            subject = `New reply from ${payload.teacherName}`;
            html = teacherReplyEmailTemplate({
              studentName: profile.display_name || email.split("@")[0],
              teacherName: payload.teacherName,
              threadTitle: payload.threadTitle,
              previewText: payload.previewText,
              threadUrl: payload.threadUrl,
            });
          } else if (type === "study_reminder") {
            subject = "Your AI tutor is waiting! 📚";
            html = studyReminderEmailTemplate({
              studentName: profile.display_name || email.split("@")[0],
              lastStudied: payload.lastStudied,
            });
          } else {
            return new Response(JSON.stringify({ error: "Unknown notification type" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const sent = await sendTransactionalEmail({
            to: email,
            subject,
            html,
            fromEmail: "info@gilaniai.site",
            fromName: "GilaniAI",
          });

          // Log to notification_logs best-effort
          if (sent) {
            try {
              await (supabaseAdmin as any).from("notification_logs").insert({
                user_id: targetUserId,
                type: "email",
                subject,
                status: "sent",
              });
            } catch (e) {
              // Ignore
            }
          }

          return new Response(JSON.stringify({ ok: sent }), {
            status: sent ? 200 : 500,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[API Email Notification] Error:", error);
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
