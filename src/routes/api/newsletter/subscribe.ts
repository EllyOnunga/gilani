import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTransactionalEmail } from "@/lib/email.server";

export const Route = createFileRoute("/api/newsletter/subscribe")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const request = getRequest();
          const body = await request.json().catch(() => ({}));
          const { email, name, user_id } = body as {
            email?: string;
            name?: string;
            user_id?: string;
          };

          if (!email || !email.includes("@")) {
            return new Response(
              JSON.stringify({ error: "Valid email required" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Check if already subscribed
          const { data: existing } = await supabaseAdmin
            .from("newsletter_subscribers")
            .select("id, status")
            .eq("email", email)
            .maybeSingle();

          if (existing) {
            if (existing.status === "active") {
              return new Response(
                JSON.stringify({ message: "Already subscribed!" }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              );
            }
            // Re-activate if previously unsubscribed
            await supabaseAdmin
              .from("newsletter_subscribers")
              .update({ status: "active", unsubscribed_at: null })
              .eq("email", email);

            return new Response(
              JSON.stringify({ success: true, message: "Welcome back! You're subscribed again." }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          // Insert new subscriber
          const { error } = await supabaseAdmin
            .from("newsletter_subscribers")
            .insert({ email, name: name || null, user_id: user_id || null });

          if (error) throw new Error(error.message);

          // Send welcome email
          await sendTransactionalEmail({
            to: email,
            subject: "Welcome to GilaniAI Newsletter! 🎓",
            fromName: "GilaniAI",
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
                <h1 style="color:#16a34a;">Welcome to GilaniAI! 🎓</h1>
                <p>Hi ${name || "there"},</p>
                <p>You're now subscribed to the GilaniAI newsletter. You'll receive:</p>
                <ul>
                  <li>KCSE revision tips and study strategies</li>
                  <li>New feature announcements</li>
                  <li>Past paper breakdowns and exam guides</li>
                </ul>
                <p>Start studying smarter today at <a href="${process.env.APP_URL}">${process.env.APP_URL}</a></p>
                <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
                <p style="font-size:12px;color:#6b7280;">
                  To unsubscribe, reply to this email with "unsubscribe".
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
            JSON.stringify({ error: err?.message ?? "Subscription failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },

      DELETE: async () => {
        try {
          const request = getRequest();
          const body = await request.json().catch(() => ({}));
          const { email } = body as { email?: string };

          if (!email) {
            return new Response(
              JSON.stringify({ error: "Email required" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          await supabaseAdmin
            .from("newsletter_subscribers")
            .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
            .eq("email", email);

          return new Response(
            JSON.stringify({ success: true, message: "Unsubscribed successfully." }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );

        } catch (err: any) {
          return new Response(
            JSON.stringify({ error: err?.message ?? "Failed to unsubscribe" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
