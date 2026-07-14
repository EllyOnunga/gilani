import { createServerFn } from "@tanstack/react-start";

import { z } from "zod";

export const submitContactFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1).max(100),
      email: z.string().email().max(200),
      subject: z.string().max(200).optional(),
      category: z.enum([
        "general",
        "bug",
        "billing",
        "account",
        "curriculum",
        "partnership",
        "press",
        "other",
      ]),
      message: z.string().min(1).max(5000),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/server/supabase");
    const { checkPlanRateLimit } = await import("@/server/rate-limit.server");
    const { sendTransactionalEmail, emailTemplate } = await import("@/server/email.server");
    // SECURITY: Rate limit contact form — max 3 submissions per hour per IP
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      "unknown";
    const rlKey = `contact:${ip}`;
    const { data: rlData } = await supabaseAdmin
      .rpc("upsert_rate_limit", {
        p_key: rlKey,
        p_max: 3,
        p_reset_at: new Date(Date.now() + 3600000).toISOString(),
      })
      .single();
    if (!rlData) throw new Error("Rate limit exceeded. Please wait before submitting again.");
    // CS-XSS-002: Escape all user-supplied values before inserting into HTML emails
    const esc = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // 1. Save to DB
    const { error } = await supabaseAdmin.from("contact_messages").insert({
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
        heading: "We've received your message ✓",
        body: `
          <p style="margin:0 0 16px">Hi <strong>${esc(data.name)}</strong>,</p>
          <p style="margin:0 0 20px;color:#374151">
            Thanks for contacting GilaniAI. Your message has been received and a member of our team
            will respond within <strong>24 hours (Mon–Fri)</strong>.
          </p>

          <!-- Message summary card -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px">
            <tr>
              <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px">
                <p style="margin:0 0 14px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;font-weight:700">Your submission</p>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size:12px;color:#9ca3af;padding-bottom:8px;width:90px;vertical-align:top">Category</td>
                    <td style="font-size:13px;color:#111111;font-weight:600;padding-bottom:8px">${esc(categoryLabels[data.category] ?? data.category)}</td>
                  </tr>
                  ${
                    data.subject
                      ? `<tr>
                    <td style="font-size:12px;color:#9ca3af;padding-bottom:8px;vertical-align:top">Subject</td>
                    <td style="font-size:13px;color:#111111;padding-bottom:8px">${esc(data.subject)}</td>
                  </tr>`
                      : ""
                  }
                  <tr>
                    <td style="font-size:12px;color:#9ca3af;vertical-align:top;padding-top:2px">Message</td>
                    <td style="font-size:13px;color:#374151;line-height:1.6;padding-top:2px">${esc(data.message).replace(/\n/g, "<br/>")}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Divider -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px">
            <tr><td style="height:1px;background:#e5e7eb"></td></tr>
          </table>

          <!-- What GilaniAI offers -->
          <p style="margin:0 0 14px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;font-weight:700">While you wait — discover what GilaniAI can do</p>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px">
            <!-- Feature 1: AI Tutor -->
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:36px;vertical-align:top;padding-top:2px">
                      <div style="width:28px;height:28px;background:linear-gradient(135deg,#d9531e,#f97316);border-radius:7px;text-align:center;line-height:28px;font-size:14px">🧠</div>
                    </td>
                    <td style="padding-left:12px;vertical-align:top">
                      <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#111111">Socratic AI Tutor</p>
                      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5">Ask anything — get step-by-step guidance in maths, sciences, languages and more. Supports LaTeX, chemistry notation, and document uploads.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Feature 2: Escalation -->
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:36px;vertical-align:top;padding-top:2px">
                      <div style="width:28px;height:28px;background:linear-gradient(135deg,#7c3aed,#a78bfa);border-radius:7px;text-align:center;line-height:28px;font-size:14px">🧑‍🏫</div>
                    </td>
                    <td style="padding-left:12px;vertical-align:top">
                      <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#111111">Teacher Escalation</p>
                      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5">Stuck? Escalate any conversation directly to your teacher for expert review and a personalised answer.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Feature 3: Analytics -->
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:36px;vertical-align:top;padding-top:2px">
                      <div style="width:28px;height:28px;background:linear-gradient(135deg,#059669,#34d399);border-radius:7px;text-align:center;line-height:28px;font-size:14px">📊</div>
                    </td>
                    <td style="padding-left:12px;vertical-align:top">
                      <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#111111">Learning Analytics</p>
                      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5">Track your study streaks, daily insights, and topic coverage to optimise your revision schedule.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Feature 4: PDF/DOCX Export -->
            <tr>
              <td style="padding:10px 0">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:36px;vertical-align:top;padding-top:2px">
                      <div style="width:28px;height:28px;background:linear-gradient(135deg,#0ea5e9,#38bdf8);border-radius:7px;text-align:center;line-height:28px;font-size:14px">📄</div>
                    </td>
                    <td style="padding-left:12px;vertical-align:top">
                      <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#111111">Export Study Sessions</p>
                      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5">Download any chat as a formatted PDF or Word document for offline revision.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Plans overview -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px">
            <tr>
              <td style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px">
                <p style="margin:0 0 10px;font-size:11px;color:#c2410c;text-transform:uppercase;letter-spacing:0.08em;font-weight:700">Subscription plans</p>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size:12px;font-weight:700;color:#111111;padding-bottom:4px;width:25%">Free</td>
                    <td style="font-size:12px;color:#6b7280;padding-bottom:4px">10 messages · 3 uploads per day</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;font-weight:700;color:#111111;padding-bottom:4px">Pro</td>
                    <td style="font-size:12px;color:#6b7280;padding-bottom:4px">50 messages · quizzes & planner — KES 500/mo</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;font-weight:700;color:#111111">School</td>
                    <td style="font-size:12px;color:#6b7280">Unlimited everything · institutional licence — KES 5,000/mo</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Contact channels -->
          <p style="margin:0 0 6px;font-size:13px;color:#374151">
            Need immediate help? Reach us directly:
          </p>
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280">
            📧 <a href="mailto:support@gilaniai.site" style="color:#d9531e">support@gilaniai.site</a> — Technical support &amp; billing
          </p>
          <p style="margin:0;font-size:13px;color:#6b7280">
            📧 <a href="mailto:contact@gilaniai.site" style="color:#d9531e">contact@gilaniai.site</a> — General enquiries &amp; partnerships
          </p>
        `,
        buttonText: "Open GilaniAI",
        buttonUrl: "https://gilaniai.site",
        footerNote:
          "You received this because you submitted a contact form on GilaniAI. If this wasn't you, please ignore this email or contact support@gilaniai.site.",
      }),
      text: `Hi ${data.name},\n\nThanks for reaching out! We've received your message (${categoryLabels[data.category] ?? data.category}) and will get back to you within 24 hours (Mon–Fri).\n\nGilaniAI Features:\n• Socratic AI Tutor — maths, sciences, languages with LaTeX support\n• Teacher Escalation — direct expert review\n• Learning Analytics — track study streaks & progress\n• Export Sessions — PDF & Word downloads\n\nPlans: Free (10 msgs/day) · Pro KES 500 · School KES 5,000\n\nDirect contact:\n  support@gilaniai.site — technical support & billing\n  contact@gilaniai.site — general enquiries\n\nOpen the app: https://gilaniai.site\n\n— The GilaniAI Team`,
    });

    return { ok: true };
  });
