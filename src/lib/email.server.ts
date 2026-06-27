/**
 * Backend utility for sending transactional emails via Resend API.
 * Uses fetch — no npm package needed, works on Vercel serverless.
 *
 * From-address routing:
 *  - Auth / account emails   → noreply@gilaniai.site
 *  - Notifications / alerts  → info@gilaniai.site
 *  - Support / contact reply → support@gilaniai.site
 */

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  /** Override the default from-address (noreply@gilaniai.site) */
  fromEmail?: string;
  /** Set Reply-To header so recipients can reply directly to the original sender */
  replyTo?: string;
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  fromName = "GilaniAI",
  fromEmail = "noreply@gilaniai.site",
  replyTo,
}: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("[Email] RESEND_API_KEY is not set");
    return false;
  }

  const recipients = Array.isArray(to) ? to : [to];

  const body: Record<string, unknown> = {
    from: `${fromName} <${fromEmail}>`,
    to: recipients,
    subject,
    html,
    ...(text ? { text } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
  };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Email] Resend error:", response.status, response.statusText, err);
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

// ─── Shared Design Tokens ────────────────────────────────────────────────────

const BRAND_ORANGE = "#d9531e";
const BG_PAGE = "#0f1117";
const BG_CARD = "#1a1d27";
const BORDER = "#2a2d3a";
const TEXT_BODY = "#9ca3af";
const TEXT_HEADING = "#f9fafb";
const APP_URL = process.env.APP_URL || "https://gilaniai.site";

// ─── Shared Header ───────────────────────────────────────────────────────────

function emailHeader(): string {
  return `
  <!-- Logo / Brand -->
  <tr>
    <td align="center" style="padding-bottom:32px">
      <a href="${APP_URL}" style="text-decoration:none;display:inline-block">
        <p style="margin:0;font-size:22px;font-weight:800;color:${BRAND_ORANGE};letter-spacing:-0.5px;font-family:Georgia,serif">
          GilaniAI
        </p>
      </a>
      <p style="margin:4px 0 0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.15em;font-weight:600">
        Ethical Learning
      </p>
    </td>
  </tr>`;
}

// ─── Shared Footer ───────────────────────────────────────────────────────────

function emailFooter(footerNote?: string): string {
  return `
  <!-- Footer -->
  <tr>
    <td style="padding-top:28px">
      ${footerNote ? `<p style="margin:0 0 4px;font-size:11px;color:#4b5563;text-align:center">${escapeHtml(footerNote)}</p>` : ""}
      <p style="margin:0;font-size:11px;color:#4b5563;text-align:center">
        &copy; ${new Date().getFullYear()} GilaniAI &middot; Nairobi, Kenya &middot;
        <a href="${APP_URL}/privacy" style="color:#6b7280;text-decoration:none">Privacy</a> &middot;
        <a href="${APP_URL}/contact" style="color:#6b7280;text-decoration:none">Contact</a>
      </p>
    </td>
  </tr>`;
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
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${heading ? escapeHtml(heading) : "GilaniAI"}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_PAGE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG_PAGE};padding:40px 16px">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">

          ${emailHeader()}

          <!-- Card -->
          <tr>
            <td style="background:${BG_CARD};border:1px solid ${BORDER};border-radius:16px;padding:36px 32px">

              ${alertBanner ? `
              <!-- Alert banner -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
                <tr>
                  <td style="background:#1e1a0e;border:1px solid #3d2e00;border-radius:8px;padding:14px 16px;font-size:12px;color:#f59e0b;line-height:1.5">
                    ${escapeHtml(alertBanner.text)}
                  </td>
                </tr>
              </table>` : ""}

              ${heading ? `
              <!-- Heading -->
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:${TEXT_HEADING};text-align:center;font-family:Georgia,serif">
                ${escapeHtml(heading)}
              </p>` : ""}

              <!-- Body content -->
              <div style="margin:0 0 28px;font-size:14px;color:${TEXT_BODY};line-height:1.6">
                ${body}
              </div>

              ${buttonText && safeButtonUrl ? `
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px">
                <tr>
                  <td align="center">
                    <a href="${safeButtonUrl}"
                       style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;letter-spacing:0.02em">
                      ${escapeHtml(buttonText)}
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Fallback URL -->
              <p style="margin:10px 0 0;font-size:11px;color:#6b7280;text-align:center">
                Button not working? Copy this link:<br>
                <a href="${safeButtonUrl}" style="color:${BRAND_ORANGE};word-break:break-all">${safeButtonUrl}</a>
              </p>` : ""}

            </td>
          </tr>

          ${emailFooter(footerNote)}

        </table>
      </td>
    </tr>
  </table>
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

  return emailTemplate({
    heading: "Password Changed",
    body: `
      <!-- Icon -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
        <tr>
          <td align="center">
            <div style="width:48px;height:48px;background:#16a34a1a;border-radius:50%;display:inline-block;text-align:center;line-height:48px;font-size:22px">
              ✅
            </div>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 16px;text-align:center">Hi <strong>${name}</strong>,</p>
      <p style="margin:0 0 28px;text-align:center;line-height:1.6">The password for your GilaniAI account was successfully updated.</p>

      <!-- Summary card -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px">
        <tr>
          <td style="background:#0f1117;border:1px solid #2a2d3a;border-radius:10px;padding:16px 18px">
            <p style="margin:0 0 6px;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;font-weight:600">What changed</p>
            <p style="margin:0 0 4px;font-size:14px;color:#f9fafb;font-weight:600">Account password updated</p>
            <p style="margin:0;font-size:11px;color:#6b7280">If this was you, no further action is needed.</p>
          </td>
        </tr>
      </table>

      <!-- Warning box -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:#1e1a0e;border:1px solid #3d2e00;border-radius:8px;padding:14px 16px">
            <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#f59e0b">
              ⚠️ Didn't make this change?
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5">
              Your account may be compromised. Reset your password immediately and contact us at
              <a href="${resetUrl}" style="color:${BRAND_ORANGE};text-decoration:none">Reset Password</a> or reply to this email.
            </p>
          </td>
        </tr>
      </table>
    `,
    buttonText: "Sign In to Your Account",
    buttonUrl: `${APP_URL}/login`,
    footerNote: "You received this because your GilaniAI account password was recently changed.",
  });
}

// ─── M-Pesa Payment Receipt Email ────────────────────────────────────────────

export function mpesaReceiptEmail({
  userName,
  planLabel,
  planDescription,
  amount,
  mpesaReceipt,
  phone,
  expiryDate,
}: {
  userName: string;
  planLabel: string;
  planDescription: string;
  amount: number;
  mpesaReceipt: string;
  phone: string;
  expiryDate: string;
}): string {
  const name = escapeHtml(userName || "there");
  const now = new Date().toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "long",
    timeStyle: "short",
  });

  return emailTemplate({
    heading: "Payment Confirmed",
    body: `
      <p style="margin:0 0 16px">Hi <strong>${name}</strong>,</p>
      <p style="margin:0 0 20px">
        Your M-Pesa payment was received and your GilaniAI account has been upgraded.
        You now have full access to the <strong>${escapeHtml(planLabel)}</strong>.
      </p>

      <!-- Receipt card -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
        <tr>
          <td style="background:#0f1117;border:1px solid #2a2d3a;border-radius:10px;padding:20px 24px">

            <p style="margin:0 0 16px;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">
              Official Receipt
            </p>

            <!-- Receipt rows -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:12px;color:#6b7280;padding-bottom:10px;width:140px">Receipt No.</td>
                <td style="font-size:13px;color:#f9fafb;font-weight:700;padding-bottom:10px;font-family:monospace,monospace">${escapeHtml(mpesaReceipt)}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#6b7280;padding-bottom:10px">Plan</td>
                <td style="font-size:13px;color:#f9fafb;font-weight:600;padding-bottom:10px">${escapeHtml(planLabel)}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#6b7280;padding-bottom:10px">Includes</td>
                <td style="font-size:13px;color:#9ca3af;padding-bottom:10px">${escapeHtml(planDescription)}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#6b7280;padding-bottom:10px">Phone</td>
                <td style="font-size:13px;color:#9ca3af;padding-bottom:10px">${escapeHtml(phone)}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#6b7280;padding-bottom:10px">Date</td>
                <td style="font-size:13px;color:#9ca3af;padding-bottom:10px">${escapeHtml(now)} (EAT)</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#6b7280;padding-bottom:10px">Valid Until</td>
                <td style="font-size:13px;color:#9ca3af;padding-bottom:10px">${escapeHtml(expiryDate)}</td>
              </tr>

              <!-- Divider -->
              <tr><td colspan="2" style="border-top:1px solid #2a2d3a;padding:8px 0"></td></tr>

              <!-- Amount row -->
              <tr>
                <td style="font-size:13px;color:#f9fafb;font-weight:700;padding-top:4px">Total Paid</td>
                <td style="font-size:20px;color:${BRAND_ORANGE};font-weight:800;font-family:Georgia,serif;padding-top:4px">
                  KES ${amount.toLocaleString("en-KE")}
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px;font-size:13px;color:#6b7280">
        Keep this email as your proof of payment. Your plan renews manually — you will receive
        a reminder before expiry.
      </p>
      <p style="margin:0;font-size:13px;color:#6b7280">
        Questions? Email us at
        <a href="mailto:support@gilaniai.site" style="color:${BRAND_ORANGE}">support@gilaniai.site</a>.
      </p>
    `,
    buttonText: "Go to Dashboard",
    buttonUrl: `${APP_URL}/dashboard`,
    footerNote: "You received this receipt because a payment was successfully processed on your GilaniAI account. Please retain it for your records.",
  });
}
