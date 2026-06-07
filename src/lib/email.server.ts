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
    personalizations: [
      {
        to: recipients.map((email) => ({ email })),
      },
    ],
    from: {
      email: senderEmail,
      name: fromName,
    },
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
      console.error("[Email] SendGrid error:", response.status, err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Email] Failed to send email:", err);
    return false;
  }
}

export function emailTemplate({
  title,
  heading,
  body,
  buttonText,
  buttonUrl,
  footerNote,
}: {
  title?: string;
  heading?: string;
  body: string;
  buttonText?: string;
  buttonUrl?: string;
  footerNote?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;margin:0;padding:2rem">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:2rem;box-shadow:0 1px 4px rgba(0,0,0,0.07)">
    <div style="margin-bottom:1.5rem">
      <span style="font-size:1.4rem;font-weight:700;color:#d9531e">G</span><span style="font-size:1.4rem;font-weight:700;color:#111">ilaniAI</span>
    </div>
    <h2 style="color:#111;font-size:1.2rem;margin:0 0 0.25rem">${title || heading}</h2>${heading ? `<p style="color:#666;font-size:0.95rem;margin:0 0 1rem">${heading}</p>` : ""}
    <div style="color:#444;font-size:0.95rem;line-height:1.6;margin-bottom:1.5rem">${body}</div>
    ${buttonText && buttonUrl ? `
    <a href="${buttonUrl}" style="background:#d9531e;color:#fff;text-decoration:none;padding:0.75rem 2rem;border-radius:8px;font-weight:600;font-size:0.9rem;display:inline-block">${buttonText}</a>
    ` : ""}
    ${footerNote ? `<p style="color:#999;font-size:0.8rem;margin-top:2rem;border-top:1px solid #eee;padding-top:1rem">${footerNote}</p>` : ""}
  </div>
</body>
</html>`;
}
