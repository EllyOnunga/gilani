/**
 * Backend utility for sending transactional emails via Resend's REST API.
 * This runs exclusively on the server side.
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
  const apiKey = process.env.RESEND_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL || "onboarding@resend.dev";

  if (!apiKey) {
    console.warn(`[Email Service] RESEND_API_KEY is not configured. Email to "${to}" was skipped.`);
    console.log(`[Email Service] Simulated Email Content:`, {
      to,
      subject,
      html,
    });
    return false;
  }

  const recipients = Array.isArray(to) ? to : [to];
  const fromAddress = `${fromName} <${senderEmail}>`;

  try {
    console.log(`[Email Service] Sending email to: ${recipients.join(", ")}`);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Email Service] Email successfully sent. ID: ${data.id}`);
    return true;
  } catch (error) {
    console.error("[Email Service] Failed to send email:", error);
    return false;
  }
}

export function emailTemplate({
  heading,
  body,
  buttonText,
  buttonUrl,
  footerNote,
}: {
  heading: string;
  body: string;
  buttonText: string;
  buttonUrl: string;
  footerNote?: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0a0f1e; color: #e8eaf6; border-radius: 12px; overflow: hidden;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 1.75rem 2rem; text-align: center;">
        <h1 style="margin: 0; font-size: 1.4rem; color: #fff; letter-spacing: -0.02em;">GilaniAI</h1>
        <p style="margin: 0.2rem 0 0; color: rgba(255,255,255,0.8); font-size: 0.8rem;">AI Study Assistant</p>
      </div>

      <!-- Body -->
      <div style="padding: 2rem;">
        <h2 style="color: #f1f5f9; font-size: 1.05rem; margin-top: 0;">${heading}</h2>
        <p style="color: #94a3b8; line-height: 1.7; margin: 0 0 1.5rem;">${body}</p>

        <!-- CTA -->
        <div style="text-align: center; margin: 2rem 0;">
          <a href="${buttonUrl}"
            style="background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; text-decoration: none; padding: 0.75rem 2rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem; display: inline-block;">
            ${buttonText}
          </a>
        </div>

        ${footerNote ? `<p style="color: #475569; font-size: 0.78rem; line-height: 1.6;">${footerNote}</p>` : ""}
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid rgba(255,255,255,0.08); padding: 1rem 2rem; text-align: center;">
        <p style="color: #475569; font-size: 0.72rem; margin: 0;">
          © ${new Date().getFullYear()} GilaniAI · Kenya ·
          <a href="https://gilaniai.vercel.app/privacy" style="color: #f97316; text-decoration: none;">Privacy</a> ·
          <a href="https://gilaniai.vercel.app/terms" style="color: #f97316; text-decoration: none;">Terms</a>
        </p>
      </div>
    </div>
  `;
}
