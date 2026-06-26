import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkPlanRateLimit } from "@/lib/rate-limit.server";
import { z } from "zod";
import { sendTransactionalEmail, emailTemplate } from "./email.server";

export const submitContactFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(100),
      email: z.string().email().max(200),
      subject: z.string().max(200).optional(),
      category: z.enum([
        "general", "bug", "billing", "account",
        "curriculum", "partnership", "press", "other",
      ]),
      message: z.string().min(1).max(5000),
    })
  )
  .handler(async ({ data }) => {
    // SECURITY: Rate limit contact form — max 3 submissions per hour per IP
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const ip = request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      "unknown";
    const rlKey = `contact:${ip}`;
    const { data: rlData } = await supabaseAdmin.rpc("upsert_rate_limit", {
      p_key: rlKey, p_max: 3, p_reset_at: new Date(Date.now() + 3600000).toISOString()
    }).single();
    if (!rlData) throw new Error("Rate limit exceeded. Please wait before submitting again.");
    // CS-XSS-002: Escape all user-supplied values before inserting into HTML emails
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

    // 1. Save to DB
    const { error } = await supabaseAdmin
      .from("contact_messages")
      .insert({
        name: data.name,
        email: data.email,
        subject: data.subject ?? null,
        category: data.category,
        message: data.message,
      });

    if (error) {
      console.error("[Contact] DB insert failed:", error.message);
      throw new Error("Failed to save message. Please try again.");
    }

    // 2. Notify admin at support inbox
    await sendTransactionalEmail({
      to: "support@gilaniai.site",
      subject: `[GilaniAI Contact] ${data.category} — ${data.subject || data.name}`,
      fromEmail: "info@gilaniai.site",
      fromName: "GilaniAI Notifications",
      replyTo: data.email,
      html: `
        <h2>New contact message</h2>
        <p><strong>Name:</strong> ${esc(data.name)}</p>
        <p><strong>Email:</strong> ${esc(data.email)}</p>
        <p><strong>Category:</strong> ${esc(data.category)}</p>
        <p><strong>Subject:</strong> ${esc(data.subject || "—")}</p>
        <hr/>
        <p>${esc(data.message).replace(/\n/g, "<br/>")}</p>
        <p style="color:#888;font-size:12px">Reply directly to this email to respond to ${esc(data.name)}.</p>
      `,
      text: `Name: ${data.name}\nEmail: ${data.email}\nCategory: ${data.category}\nSubject: ${data.subject || "—"}\n\n${data.message}`,
    });

    // 3. Auto-reply to sender
    const categoryLabels: Record<string, string> = {
      general: "General Enquiry",
      bug: "Bug Report",
      billing: "Billing",
      account: "Account",
      curriculum: "Curriculum",
      partnership: "Partnership",
      press: "Press",
      other: "Other",
    };
    await sendTransactionalEmail({
      to: data.email,
      subject: "We received your message — GilaniAI Support",
      fromEmail: "support@gilaniai.site",
      fromName: "GilaniAI Support",
      html: emailTemplate({
        heading: "We\'ve received your message",
        body: `
          <p style="margin:0 0 16px">Hi <strong>${esc(data.name)}</strong>,</p>
          <p style="margin:0 0 16px">
            Thanks for reaching out to GilaniAI Support. We\'ve received your message and a
            member of our team will get back to you within <strong>24 hours (Mon–Fri)</strong>.
          </p>

          <!-- Message summary card -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
            <tr>
              <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
                <p style="margin:0 0 10px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Your submission</p>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size:12px;color:#9ca3af;padding-bottom:6px;width:90px">Category</td>
                    <td style="font-size:13px;color:#111111;font-weight:600;padding-bottom:6px">${esc(categoryLabels[data.category] ?? data.category)}</td>
                  </tr>
                  ${data.subject ? `<tr>
                    <td style="font-size:12px;color:#9ca3af;padding-bottom:6px">Subject</td>
                    <td style="font-size:13px;color:#111111;padding-bottom:6px">${esc(data.subject)}</td>
                  </tr>` : ""}
                  <tr>
                    <td style="font-size:12px;color:#9ca3af;vertical-align:top;padding-top:4px">Message</td>
                    <td style="font-size:13px;color:#374151;line-height:1.6;padding-top:4px">${esc(data.message).replace(/\n/g, "<br/>")}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 8px;font-size:13px;color:#6b7280">
            While you wait, you might find answers in our
            <a href="https://gilaniai.site/faq" style="color:#d9531e">Help &amp; FAQ</a> page.
          </p>
          <p style="margin:0;font-size:13px;color:#6b7280">
            For urgent matters email us directly at
            <a href="mailto:support@gilaniai.site" style="color:#d9531e">support@gilaniai.site</a>.
          </p>
        `,
        buttonText: "Visit GilaniAI",
        buttonUrl: "https://gilaniai.site",
        footerNote: "You received this because you submitted a message via the GilaniAI contact form. If this wasn\'t you, please ignore this email.",
      }),
      text: `Hi ${data.name},\n\nThanks for reaching out! We\'ve received your message (${categoryLabels[data.category] ?? data.category}) and will get back to you within 24 hours (Mon–Fri).\n\nFor urgent matters: support@gilaniai.site\nHelp & FAQ: https://gilaniai.site/faq\n\n— The GilaniAI Team`,
    });

    return { ok: true };
  });
