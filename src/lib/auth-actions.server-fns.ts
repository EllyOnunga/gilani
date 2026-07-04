import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { z } from "zod";
import {
  sendTransactionalEmail,
  emailTemplate,
  welcomeEmail,
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
      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          display_name: displayName || authResult.user.user_metadata?.full_name || null,
          email: authResult.user.email ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

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
 * Server action to check if an email already exists in Supabase Auth.
 */
export const checkEmailExists = createServerFn({ method: "POST" })
  .validator(
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
