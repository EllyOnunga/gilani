/**
 * SMS utility via Africa's Talking
 * Env vars needed:
 *   AT_API_KEY   — Africa's Talking API key
 *   AT_USERNAME  — Africa's Talking username (use "sandbox" for testing)
 */

const AT_USERNAME = process.env.AT_USERNAME ?? "sandbox";
const AT_API_KEY  = process.env.AT_API_KEY ?? "";
const AT_BASE     = AT_USERNAME === "sandbox"
  ? "https://api.sandbox.africastalking.com/version1"
  : "https://api.africastalking.com/version1";

export async function sendSMS(phone: string, message: string): Promise<boolean> {
  if (!AT_API_KEY) {
    console.error("[SMS] AT_API_KEY is not set");
    return false;
  }

  // Normalize phone → +2547XXXXXXXX
  const normalized = phone.startsWith("0")
    ? `+254${phone.slice(1)}`
    : phone.startsWith("254")
    ? `+${phone}`
    : phone;

  try {
    const res = await fetch(`${AT_BASE}/messaging`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey: AT_API_KEY,
      },
      body: new URLSearchParams({
        username: AT_USERNAME,
        to: normalized,
        message,
        // from: "GILANIAI", // uncomment once shortcode is approved by AT
      }).toString(),
    });

    const data = await res.json();
    const recipient = data?.SMSMessageData?.Recipients?.[0];

    if (recipient?.status === "Success") {
      console.log(`[SMS] Sent to ${normalized}: ${recipient.messageId}`);
      return true;
    }

    console.error("[SMS] Africa's Talking error:", JSON.stringify(data));
    return false;
  } catch (err) {
    console.error("[SMS] Failed to send SMS:", err);
    return false;
  }
}
