/**
 * Backend utility for sending transactional emails via SendGrid API.
 * Uses fetch — no npm package needed, works on Vercel serverless.
 */

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  fromName = "GilaniAI",
}: EmailPayload): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    console.error("[Email] SENDGRID_API_KEY is not set");
    return false;
  }

  const recipients = Array.isArray(to) ? to : [to];

  const body = {
    personalizations: [{ to: recipients.map((email) => ({ email })) }],
    from: { email: senderEmail, name: fromName },
    subject,
    content: [
      ...(text ? [{ type: "text/plain", value: text }] : []),
      { type: "text/html", value: html },
    ],
  };

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Email] SendGrid error:", response.status, response.statusText, err);
      console.error("[Email] Sender used:", senderEmail);
      return false;
    }

    console.log("[Email] Successfully sent to:", recipients.join(", "));
    return true;
  } catch (err) {
    console.error("[Email] Failed to send email:", err);
    return false;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Shared Design Tokens ────────────────────────────────────────────────────

const BRAND_ORANGE = "#d9531e";
const BRAND_DARK   = "#111111";
const BG_PAGE      = "#f4f4f5";
const BG_CARD      = "#ffffff";
const TEXT_BODY    = "#374151";
const TEXT_MUTED   = "#6b7280";
const TEXT_LIGHT   = "#9ca3af";
const BORDER       = "#e5e7eb";
const APP_URL      = process.env.APP_URL || "https://gilaniai.vercel.app";

// ─── Shared Header ───────────────────────────────────────────────────────────

function emailHeader(): string {
  return `
  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:32px 24px 0">
        <table width="560" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:${BRAND_DARK};border-radius:12px 12px 0 0;padding:24px 32px;text-align:left">
              <!-- Logo -->
              <a href="${APP_URL}" style="text-decoration:none;display:inline-block">
                <span style="font-size:22px;font-weight:800;color:${BRAND_ORANGE};font-family:Georgia,serif">G</span><span style="font-size:22px;font-weight:800;color:#ffffff;font-family:Georgia,serif">ilaniAI</span>
              </a>
              <!-- Tagline -->
              <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;font-family:system-ui,sans-serif;letter-spacing:0.05em;text-transform:uppercase">Your Curriculum-Aligned AI Study Assistant</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

// ─── Shared Footer ───────────────────────────────────────────────────────────

function emailFooter(footerNote?: string): string {
  return `
  <!-- Footer -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:0 24px 32px">
        <table width="560" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:${BRAND_DARK};border-radius:0 0 12px 12px;padding:24px 32px">

              <!-- Nav links -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:16px">
                    <a href="${APP_URL}/dashboard"    style="color:#9ca3af;font-size:12px;font-family:system-ui,sans-serif;text-decoration:none;margin:0 10px">Dashboard</a>
                    <span style="color:#374151">|</span>
                    <a href="${APP_URL}/tutor"        style="color:#9ca3af;font-size:12px;font-family:system-ui,sans-serif;text-decoration:none;margin:0 10px">Tutor</a>
                    <span style="color:#374151">|</span>
                    <a href="${APP_URL}/notes"        style="color:#9ca3af;font-size:12px;font-family:system-ui,sans-serif;text-decoration:none;margin:0 10px">Notes</a>
                    <span style="color:#374151">|</span>
                    <a href="${APP_URL}/quizzes"      style="color:#9ca3af;font-size:12px;font-family:system-ui,sans-serif;text-decoration:none;margin:0 10px">Quizzes</a>
                    <span style="color:#374151">|</span>
                    <a href="${APP_URL}/planner"      style="color:#9ca3af;font-size:12px;font-family:system-ui,sans-serif;text-decoration:none;margin:0 10px">Planner</a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #1f2937;padding-bottom:16px"></td></tr>
              </table>

              <!-- Footer note -->
              ${footerNote ? `<p style="margin:0 0 12px;font-size:11px;color:#6b7280;font-family:system-ui,sans-serif;text-align:center;line-height:1.6">${escapeHtml(footerNote)}</p>` : ""}

              <!-- Legal -->
              <p style="margin:0;font-size:11px;color:#4b5563;font-family:system-ui,sans-serif;text-align:center;line-height:1.8">
                © ${new Date().getFullYear()} GilaniAI · Nairobi, Kenya
                <br>
                <a href="${APP_URL}/privacy" style="color:#6b7280;text-decoration:underline">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/faq"     style="color:#6b7280;text-decoration:underline">Help &amp; FAQ</a>
                &nbsp;·&nbsp;
                <a href="mailto:support@gilaniai.com" style="color:#6b7280;text-decoration:underline">Contact Support</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

// ─── Main Template ───────────────────────────────────────────────────────────

export function emailTemplate({
  heading,
  body,
  buttonText,
  buttonUrl,
  footerNote,
  alertBanner,
}: {
  heading?: string;
  body: string;
  buttonText?: string;
  buttonUrl?: string;
  footerNote?: string;
  /** Optional top-of-card coloured alert strip e.g. "⚠️ Security Notice" */
  alertBanner?: { text: string; color?: string };
}): string {
  const safeButtonUrl = buttonUrl ? encodeURI(buttonUrl) : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${heading ? escapeHtml(heading) : "GilaniAI"}</title>
</head>
<body style="margin:0;padding:0;background:${BG_PAGE};font-family:system-ui,-apple-system,sans-serif">

  ${emailHeader()}

  <!-- Card body -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:0 24px">
        <table width="560" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:${BG_CARD};padding:0 32px 32px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER}">

              ${alertBanner ? `
              <!-- Alert banner -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
                <tr>
                  <td style="background:${alertBanner.color || "#fef3c7"};border-left:4px solid ${alertBanner.color ? "#b45309" : "#d97706"};padding:12px 16px;border-radius:4px;font-size:13px;color:#92400e;font-weight:600">
                    ${escapeHtml(alertBanner.text)}
                  </td>
                </tr>
              </table>` : ""}

              ${heading ? `
              <!-- Heading -->
              <h1 style="margin:32px 0 8px;font-size:22px;font-weight:700;color:${BRAND_DARK};line-height:1.3">${escapeHtml(heading)}</h1>
              <!-- Accent rule -->
              <table width="40" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">
                <tr><td style="height:3px;background:${BRAND_ORANGE};border-radius:2px"></td></tr>
              </table>` : ""}

              <!-- Body content -->
              <div style="font-size:15px;color:${TEXT_BODY};line-height:1.7;margin-bottom:${buttonText ? "28px" : "8px"}">
                ${body}
              </div>

              ${buttonText && safeButtonUrl ? `
              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px">
                <tr>
                  <td style="border-radius:8px;background:${BRAND_ORANGE}">
                    <a href="${safeButtonUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;font-family:system-ui,sans-serif;letter-spacing:0.01em">
                      ${escapeHtml(buttonText)} →
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Fallback URL -->
              <p style="margin:10px 0 0;font-size:11px;color:${TEXT_LIGHT}">
                Button not working? Copy this link:<br>
                <a href="${safeButtonUrl}" style="color:${BRAND_ORANGE};word-break:break-all">${safeButtonUrl}</a>
              </p>` : ""}

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  ${emailFooter(footerNote)}

</body>
</html>`;
}

// ─── Password Reset Confirmation Email ───────────────────────────────────────

/**
 * Sent AFTER a successful password reset to confirm it was intentional.
 * Includes a "Not you? Secure your account" CTA.
 */
export function passwordResetConfirmationEmail(userName?: string): string {
  const name = userName ? escapeHtml(userName) : "there";
  const resetUrl = `${APP_URL}/forgot-password`;
  const supportUrl = `mailto:support@gilaniai.com?subject=${encodeURIComponent("Unauthorized password reset on my account")}`;

  return emailTemplate({
    heading: "Your Password Was Reset",
    alertBanner: {
      text: "🔒 Security Notice — If you did not make this change, act immediately.",
      color: "#fef3c7",
    },
    body: `
      <p style="margin:0 0 16px">Hi <strong>${name}</strong>,</p>
      <p style="margin:0 0 16px">Your GilaniAI password was successfully changed. You can now sign in with your new password.</p>

      <!-- Summary card -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
        <tr>
          <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
            <p style="margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">What changed</p>
            <p style="margin:0;font-size:14px;color:#111111">Account password updated</p>
            <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">${new Date().toUTCString()}</p>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px;font-size:13px;color:#6b7280">
        ✅ <strong>This was you?</strong> No action needed — you're all set.
      </p>
      <p style="margin:0;font-size:13px;color:#6b7280">
        ⚠️ <strong>Wasn't you?</strong> Your account may be compromised. Reset your password immediately and contact our support team.
      </p>
    `,
    buttonText: "Sign In to Your Account",
    buttonUrl: `${APP_URL}/login`,
    footerNote: "You received this because a password reset was completed on your GilaniAI account.",
  });
}
