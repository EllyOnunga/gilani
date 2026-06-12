import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { initiateSTKPush } from "@/lib/mpesa.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLANS } from "@/lib/plans";

export const Route = createFileRoute("/api/mpesa/initiate")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const request = getRequest();
          let authResult;
          try {
            authResult = await authenticateRequest(request);
          } catch {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401, headers: { "Content-Type": "application/json" },
            });
          }

          const { userId } = authResult;
          const body = await request.json().catch(() => ({}));
          const { phone, plan } = body as { phone?: string; plan?: string };

          if (!phone || !plan) {
            return new Response(JSON.stringify({ error: "phone and plan are required" }), {
              status: 400, headers: { "Content-Type": "application/json" },
            });
          }

          if (!PLANS[plan as keyof typeof PLANS] || plan === "free") {
            return new Response(JSON.stringify({ error: "Invalid plan selected" }), {
              status: 400, headers: { "Content-Type": "application/json" },
            });
          }

          const amount = PLANS[plan as keyof typeof PLANS].price;
          const { checkoutRequestId } = await initiateSTKPush(phone, amount, userId, plan);

          await supabaseAdmin.from("payments").insert({
            user_id: userId,
            phone_number: phone,
            amount,
            plan,
            checkout_request_id: checkoutRequestId,
            status: "pending",
          });

          return new Response(
            JSON.stringify({ success: true, checkoutRequestId, message: "Check your phone for the M-Pesa prompt!" }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err: any) {
          console.error("[M-Pesa Initiate]", err?.message);
          return new Response(JSON.stringify({ error: err?.message ?? "Payment initiation failed" }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
