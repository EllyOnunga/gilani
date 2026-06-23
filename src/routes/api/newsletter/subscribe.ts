import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTransactionalEmail } from "@/lib/email.server";
import { authenticateRequest } from "@/lib/api-auth.server";

// Simple email regex — stronger than just checking for "@"
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Escape HTML to prevent XSS in email templates
function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export const Route = createFileRoute("/api/newsletter/subscribe")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const request = getRequest();

          // SECURITY: Require authentication — prevents anonymous spam subscriptions
          let authResult: { userId: string } | null = null;
          try {
            authResult = await authenticateRequest(request);
          } catch {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401, headers: { "Content-Type": "application/json" },
            });
          }

          const body = await request.json().catch(() => ({}));
          const { email, name } = body as { email?: string; name?: string };

          // SECURITY: Strict email validation
          if (!email || !EMAIL_RE.test(email)) {
            return new Response(
              JSON.stringify({ error: "Valid email required" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // SECURITY: Sanitize name input
          const safeName = name ? esc(name.slice(0, 100)) : null;
          const safeEmail = email.slice(0, 254).toLowerCase().trim();

          // Check if already subscribed
          const { data: existing } = await supabaseAdmin
            .from("newsletter_subscribers")
            .select("id, status")
            .eq("email", safeEmail)
            .maybeSingle();

          if (existing) {
            if (existing.status === "active") {
              return new Response(
                JSON.stringify({ message: "Already subscribed!" }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              );
            }
            await supabaseAdmin
              .from("newsletter_subscribers")
              .update({ status: "active", unsubscribed_at: null })
              .eq("email", safeEmail);

            return new Response(
              JSON.stringify({ success: true, message: "Welcome back! You're subscribed again." }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          // Insert new subscriber — tie to authenticated user_id only
          const { error } = await supabaseAdmin
            .from("newsletter_subscribers")
            .insert({ email: safeEmail, name: safeName, user_id: authResult.userId });

          if (error) throw new Error(error.message);

          // Send welcome email with sanitized name
          await sendTransactionalEmail({
            to: safeEmail,
            subject: "Welcome to GilaniAI Newsletter! 🎓",
            fromName: "GilaniAI",
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
                <h1 style="color:#d9531e;">Welcome to GilaniAI! 🎓</h1>
                <p>Hi ${safeName || "there"},</p>
                <p>You're now subscribed to the GilaniAI newsletter. You'll receive:</p>
                <ul>
                  <li>Study tips and revision strategies</li>
                  <li>New feature announcements</li>
                  <li>Exam guides and learning resources</li>
                </ul>
                <p>Start studying smarter today at <a href="${process.env.APP_URL}">${esc(process.env.APP_URL || "gilaniai.site")}</a></p>
                <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
                <p style="font-size:12px;color:#6b7280;">
                  To unsubscribe, visit your account settings.
                </p>
              </div>
            `,
            text: `Welcome to GilaniAI! You're subscribed to our newsletter.`,
          });

          return new Response(
            JSON.stringify({ success: true, message: "Subscribed successfully! Check your email." }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );

        } catch (err: any) {
          console.error("[Newsletter Subscribe]", err?.message);
          return new Response(
            JSON.stringify({ error: "Subscription failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },

      DELETE: async () => {
        try {
          const request = getRequest();

          // SECURITY: Require authentication — prevents anyone unsubscribing arbitrary emails
          let authResult: { userId: string } | null = null;
          try {
            authResult = await authenticateRequest(request);
          } catch {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401, headers: { "Content-Type": "application/json" },
            });
          }

          // SECURITY: Only unsubscribe the authenticated user's own email
          const { data: subscriber } = await supabaseAdmin
            .from("newsletter_subscribers")
            .select("email")
            .eq("user_id", authResult.userId)
            .maybeSingle();

          if (!subscriber) {
            return new Response(
              JSON.stringify({ message: "Not subscribed." }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          await supabaseAdmin
            .from("newsletter_subscribers")
            .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
            .eq("user_id", authResult.userId);

          return new Response(
            JSON.stringify({ success: true, message: "Unsubscribed successfully." }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );

        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: "Failed to unsubscribe" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
