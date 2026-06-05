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
    console.warn(
      `[Email Service] RESEND_API_KEY is not configured. Email to "${to}" was skipped.`,
    );
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
        "Authorization": `Bearer ${apiKey}`,
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
