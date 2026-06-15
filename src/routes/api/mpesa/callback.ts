import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { upgradePlan } from "@/lib/mpesa.server";

export const Route = createFileRoute("/api/mpesa/callback")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const request = getRequest();

          // CS-AUTHZ-001: Verify the shared callback secret embedded in the URL
          // MPESA_CALLBACK_SECRET must be set in environment variables.
          // The secret is appended to CallBackURL in mpesa.server.ts, so only
          // Safaricom (who received it) can produce a valid callback.
          const url = new URL(request.url);
          const providedToken = url.searchParams.get("token");
          const expectedToken = process.env.MPESA_CALLBACK_SECRET;
          if (!expectedToken || providedToken !== expectedToken) {
            console.error("[M-Pesa Callback] Rejected request with invalid or missing token");
            return new Response(JSON.stringify({ ResultCode: 0 }), { status: 200 });
          }

          const body = await request.json().catch(() => ({}));
          const callback = body?.Body?.stkCallback;

          if (!callback) {
            return new Response(JSON.stringify({ ResultCode: 0 }), { status: 200 });
          }

          const checkoutRequestId = callback.CheckoutRequestID;
          const resultCode = callback.ResultCode;

          // Find pending payment
          const { data: payment } = await supabaseAdmin
            .from("payments")
            .select("*")
            .eq("checkout_request_id", checkoutRequestId)
            .maybeSingle();

          if (!payment) {
            return new Response(JSON.stringify({ ResultCode: 0 }), { status: 200 });
          }

          // Payment failed
          if (resultCode !== 0) {
            await supabaseAdmin
              .from("payments")
              .update({ status: "failed" })
              .eq("checkout_request_id", checkoutRequestId);
            return new Response(JSON.stringify({ ResultCode: 0 }), { status: 200 });
          }

          // Get M-Pesa receipt number
          const items: any[] = callback.CallbackMetadata?.Item ?? [];
          const receipt = items.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value ?? "UNKNOWN";

          // Mark payment complete
          await supabaseAdmin
            .from("payments")
            .update({ status: "completed", mpesa_receipt: receipt })
            .eq("checkout_request_id", checkoutRequestId);

          // Upgrade user plan
          await upgradePlan(payment.user_id, payment.plan, receipt);

          console.log(`[M-Pesa Callback] ✅ ${payment.user_id} → ${payment.plan} (${receipt})`);
          return new Response(JSON.stringify({ ResultCode: 0 }), { status: 200 });

        } catch (err: any) {
          console.error("[M-Pesa Callback Error]", err?.message);
          // Always return 200 to Safaricom or they will retry
          return new Response(JSON.stringify({ ResultCode: 0 }), { status: 200 });
        }
      },
    },
  },
});
