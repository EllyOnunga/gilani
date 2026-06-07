import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth";
import { z } from "zod";

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
      // Security: only assign if no role exists yet — prevents privilege escalation.
      const { data: existing } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();
      if (existing) throw new Error("Role already assigned. Contact an administrator to change your role.");

      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (insertError) throw insertError;

      // Also ensure profile exists for OAuth users
      await supabaseAdmin
        .from("profiles")
        .upsert(
          { id: userId, display_name: authResult.user.user_metadata?.full_name ?? null, email: authResult.user.email ?? null, updated_at: new Date().toISOString() },
          { onConflict: "id", ignoreDuplicates: true }
        );

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
      const { data: userData, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (error) {
        console.error("[checkEmailExists] Supabase Auth error:", error);
        return { exists: false };
      }

      const foundUser = userData?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );

      return { exists: !!foundUser };
    } catch (err) {
      console.error("[checkEmailExists] Server function failed:", err);
      return { exists: false };
    }
  });
