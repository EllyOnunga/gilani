import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { sendTransactionalEmail } from "@/lib/email.server";

export const Route = createFileRoute("/api/newsletter/send")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const request = getRequest();

          // Admin only
          const authResult = await authenticateRequest(request);
          const { data: roleCheck } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", authResult.userId)
            .eq("role", "admin")
            .single();

          if (!roleCheck) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          const body = await request.json().catch(() => ({}));
          const { subject, html, text } = body as {
            subject?: string;
            html?: string;
            text?: string;
          };

          if (!subject || !html) {
            return new Response(JSON.stringify({ error: "subject and html are required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const safeSubject = subject.slice(0, 200);
          const safeHtml = html.slice(0, 100_000);
          const safeText = text ? text.slice(0, 50_000) : undefined;

          // Get all active subscribers
          const { data: subscribers, error } = await supabaseAdmin
            .from("newsletter_subscribers")
            .select("email, name")
            .eq("status", "active");

          if (error) throw new Error(error.message);
          if (!subscribers?.length) {
            return new Response(JSON.stringify({ message: "No active subscribers found" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Send in batches of 10
          const batchSize = 10;
          let sent = 0;
          for (let i = 0; i < subscribers.length; i += batchSize) {
            const batch = subscribers.slice(i, i + batchSize);
            await Promise.all(
              batch.map((sub) =>
                sendTransactionalEmail({
                  to: sub.email,
                  subject: safeSubject,
                  html: safeHtml,
                  text: safeText,
                  fromName: "GilaniAI",
                }),
              ),
            );
            sent += batch.length;
          }

          return new Response(JSON.stringify({ success: true, sent, total: subscribers.length }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("[Newsletter Send]", err?.message);
          return new Response(
            JSON.stringify({ error: "Failed to send newsletter. Please try again." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
