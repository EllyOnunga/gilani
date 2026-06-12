import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPlanLimits } from "@/lib/plans";

const MPESA_BASE = process.env.MPESA_ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

export async function getMpesaToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const res = await fetch(`${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get M-Pesa token");
  return data.access_token;
}

export async function initiateSTKPush(
  phone: string,
  amount: number,
  userId: string,
  plan: string,
): Promise<{ checkoutRequestId: string }> {
  const token = await getMpesaToken();

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);

  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString("base64");

  // Normalize phone: 0712345678 → 254712345678
  const normalized = phone.startsWith("0")
    ? `254${phone.slice(1)}`
    : phone.startsWith("+")
    ? phone.slice(1)
    : phone;

  const body = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: normalized,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: normalized,
    CallBackURL: `${process.env.APP_URL}/api/mpesa/callback`,
    AccountReference: `GILANI_${plan.toUpperCase()}_${userId.slice(0, 8)}`,
    TransactionDesc: `Gilani AI ${plan} Plan`,
  };

  const res = await fetch(`${MPESA_BASE}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.ResponseCode !== "0") {
    throw new Error(data.errorMessage || data.ResponseDescription || "STK push failed");
  }

  return { checkoutRequestId: data.CheckoutRequestID };
}

export async function upgradePlan(userId: string, plan: string, receipt: string): Promise<void> {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      plan,
      plan_expiry: expiry.toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", userId);

  if (error) throw new Error(`Failed to upgrade plan: ${error.message}`);

  console.log(`[M-Pesa] User ${userId} upgraded to ${plan} via receipt ${receipt}`);
}
