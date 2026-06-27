import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { initiateSTKPush } from "@/lib/mpesa.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLANS, TOPUP_MIN_KES } from "@/lib/plans";
import { z } from "zod";

// CS-INJ-001: Validates Kenyan phone numbers: 07xx, 01xx, +2547xx, +2541xx, 2547xx
const KENYAN_PHONE_RE = /^(?:\+?254|0)[17]\d{8}$/;

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
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const { userId } = authResult;
          const body = await request.json().catch(() => ({}));
          const {
            phone,
            plan,
            amount: rawAmount,
          } = body as { phone?: string; plan?: string; amount?: number };

          if (!phone || !plan) {
            return new Response(JSON.stringify({ error: "phone and plan are required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // CS-INJ-001: Validate phone number format before sending to Safaricom
          if (!KENYAN_PHONE_RE.test(phone)) {
            return new Response(
              JSON.stringify({
                error: "Invalid phone number. Use format: 07XXXXXXXX or +2547XXXXXXXX",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Pay-as-you-go top-up
          const isTopup = plan === "topup";
          let amount: number;

          if (isTopup) {
            const parsed = Math.floor(Number(rawAmount));
            if (!parsed || parsed < TOPUP_MIN_KES) {
              return new Response(
                JSON.stringify({ error: `Minimum top-up is KES ${TOPUP_MIN_KES}` }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }
            amount = parsed;
          } else {
            if (!PLANS[plan as keyof typeof PLANS] || plan === "free") {
              return new Response(JSON.stringify({ error: "Invalid plan selected" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }
            amount = PLANS[plan as keyof typeof PLANS].price;
          }
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
            JSON.stringify({
              success: true,
              checkoutRequestId,
              message: "Check your phone for the M-Pesa prompt!",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (err: any) {
          console.error("[M-Pesa Initiate]", err?.message);
          return new Response(
            JSON.stringify({ error: err?.message ?? "Payment initiation failed" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
