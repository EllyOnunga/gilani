import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { z } from "zod";
import { sendTransactionalEmail, emailTemplate, passwordResetConfirmationEmail } from "@/lib/email.server";

export const assignUserRole = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      role: z.enum(["student", "teacher", "admin"]),
      // userId removed — extracted from server session
    }),
  )
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;
    const { role } = data;

    try {

      // Delete existing role to allow role changes (e.g. student -> teacher)
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (insertError) throw insertError;

      // Also ensure profile exists for OAuth users
      await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            display_name: authResult.user.user_metadata?.full_name ?? null,
            email: authResult.user.email ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      // Send welcome email
      const userEmail = authResult.user.email;
      const userName = authResult.user.user_metadata?.full_name || "there";
      const dashboard =
        role === "teacher" ? "/teacher/escalations"
        : role === "admin" ? "/admin/users"
        : "/dashboard";
      if (userEmail) {
        sendTransactionalEmail({
          to: userEmail,
          subject: `Welcome to GilaniAI 🎉`,
          html: emailTemplate({
            heading: `Welcome, ${userName}!`,
            body: `Your account has been created successfully as a <strong>${role}</strong>. You're all set to start using GilaniAI — your curriculum-aligned AI study assistant for KCSE & CBC.`,
            buttonText: "Go to Dashboard",
            buttonUrl: `${process.env.APP_URL || "https://gilaniai.vercel.app"}${dashboard}`,
            footerNote: "You're receiving this because you just registered on GilaniAI.",
          }),
        }).catch((err) => console.error("[Welcome Email] Failed:", err));
      }

      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Failed to assign user role.");
    }
  });

/**
 * Server action to check if an email already exists in Supabase Auth.
 */
export const checkEmailExists = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
    }),
  )
  .handler(async ({ data }) => {
    const { email } = data;
    try {
      // Use profiles table lookup instead of listing all auth users (avoids O(n) scan + data exposure)
      const { data: profile, error } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (error) {
        // Log generic message only — do not surface Supabase internals
        console.error("[checkEmailExists] Profile lookup failed");
        return { exists: false };
      }

      return { exists: !!profile };
    } catch {
      console.error("[checkEmailExists] Server function failed");
      return { exists: false };
    }
  });

/**
 * Called client-side after supabase.auth.updateUser({ password }) succeeds.
 * Sends a "your password was reset — was this you?" confirmation email.
 */
export const sendPasswordResetConfirmationFn = createServerFn({ method: "POST" })
  .handler(async () => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch {
      throw new Error("Unauthorized");
    }

    const userEmail = authResult.user.email;
    const userName = authResult.user.user_metadata?.full_name || undefined;

    if (!userEmail) return { sent: false };

    const sent = await sendTransactionalEmail({
      to: userEmail,
      subject: "Your GilaniAI Password Was Changed",
      html: passwordResetConfirmationEmail(userName),
      text: `Hi ${userName || "there"},\n\nYour GilaniAI password was successfully changed.\n\nIf you did NOT make this change, reset your password immediately at: ${process.env.APP_URL || "https://gilaniai.vercel.app"}/forgot-password\n\nBest regards,\nThe GilaniAI Team`,
    });

    return { sent };
  });
