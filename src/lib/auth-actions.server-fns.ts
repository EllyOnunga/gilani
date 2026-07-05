import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { z } from "zod";
import {
  sendTransactionalEmail,
  emailTemplate,
  welcomeEmail,
  verifyEmailTemplate,
} from "@/lib/email.server";

export const assignUserRole = createServerFn({ method: "POST" })
  .validator(
    z.object({
      role: z.enum(["student", "teacher", "admin"]),
      displayName: z.string().optional(),
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
    const { role, displayName } = data;

    // SECURITY: Prevent privilege escalation -- only existing admins may
    // (re)assign themselves the "admin" role via this self-service endpoint.
    if (role === "admin") {
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (existingRole?.role !== "admin") {
        throw new Error("Unauthorized: insufficient privileges to assign admin role");
      }
    }

    try {
      // Delete existing role to allow role changes (e.g. student -> teacher)
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (insertError) throw insertError;

      // Also ensure profile exists for OAuth users
      const resolvedDisplayName =
        displayName || authResult.user.user_metadata?.full_name || null;

      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          display_name: resolvedDisplayName,
          email: authResult.user.email ?? null,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      // Cosmetic only: syncs the name into auth.users' metadata so it shows
      // up in the Supabase Auth dashboard's user list. The app itself always
      // reads display_name from the profiles table above, never from here.
      if (resolvedDisplayName) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { display_name: resolvedDisplayName },
        }).catch((err) => console.error("[assignUserRole] Failed to sync auth metadata:", err));
      }

      // Send welcome email
      const userEmail = authResult.user.email;
      const userName = displayName || authResult.user.user_metadata?.full_name || "there";
      const dashboard =
        role === "teacher"
          ? "/teacher/escalations"
          : role === "admin"
            ? "/admin/users"
            : "/tutor";
      if (userEmail) {
        sendTransactionalEmail({
          to: userEmail,
          subject: `Welcome to GilaniAI 🎉`,
          html: welcomeEmail({
            userName,
            role,
            dashboardUrl: `${process.env.APP_URL || "https://gilaniai.site"}/login?signout=true&redirect=${dashboard}`,
          }),
        }).catch((err) => console.error("[Welcome Email] Failed:", err));
      }

      return { success: true };
    } catch (err: any) {
      throw new Error(err.message || "Failed to assign user role.");
    }
  });

/**
 * Passwordless instant login: creates or resolves a user by email, mints a
 * real Supabase session server-side with zero user-visible steps (no OTP
 * screen, no magic link click), and — for brand new signups only — fires a
 * non-blocking verification email. Verification is informational only and
 * never gates access.
 */
export const instantLogin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
    }),
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, onboarding_completed")
      .eq("email", email)
      .maybeSingle();
    // Used only to decide whether to send the one-time verification email —
    // a stub profile can exist (e.g. an abandoned earlier sign-up) without a
    // role ever having been assigned.
    const isBrandNewProfile = !existingProfile;

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (linkError || !linkData?.properties?.hashed_token) {
      throw new Error(linkError?.message || "Failed to create session");
    }

    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_ANON_KEY =
      process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!SUPABASE_ANON_KEY) {
      throw new Error("Missing SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) environment variable");
    }
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "email",
    });
    if (verifyError || !verifyData.session || !verifyData.user) {
      throw new Error(verifyError?.message || "Failed to verify session");
    }

    const userId = verifyData.user.id;

    // Whether this user still needs the name/role setup step — based on
    // whether a role has ever been assigned, not on profile row existence.
    // A profile row can exist from an abandoned earlier sign-up attempt
    // (e.g. verification email sent, but the name form was never submitted)
    // without a role ever having been set — that user must still see the
    // setup form, mirroring callback.tsx's OAuth-path logic.
    const needsProfileSetup = !existingProfile?.onboarding_completed;

    // Role, profile display_name, and welcome email are handled later by
    // assignUserRole once the user picks a display name (see NameCaptureForm).
    // Here we only track email-ownership verification, which isn't tied to role.
    if (isBrandNewProfile) {
      const verifyToken = randomUUID();
      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          email,
          email_verified: false,
          email_verify_token: verifyToken,
          email_verify_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      const appUrl = process.env.APP_URL || "https://gilaniai.site";
      const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;

      sendTransactionalEmail({
        to: email,
        subject: "Verify your email — GilaniAI",
        html: verifyEmailTemplate({ userName: email.split("@")[0], verifyUrl }),
      }).catch((err) => console.error("[Verify Email] Failed:", err));
    }

    return {
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
      needsProfileSetup,
    };
  });

