import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

/**
 * Server action to assign a user's initial app role securely.
 * This runs with full service_role privileges bypassing RLS restrictions.
 */
export const assignUserRole = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      role: z.enum(["student", "teacher", "admin"]),
    }),
  )
  .handler(async ({ data }) => {
    const { userId, role } = data;
    try {
      console.log(`[assignUserRole] Assigning role: ${role} to user ID: ${userId}`);

      // 1. Delete default roles to prevent duplicate student assignment
      const { error: deleteError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        console.error("[assignUserRole] Delete existing roles failed:", deleteError);
        throw deleteError;
      }

      // 2. Insert selected role
      const { error: insertError } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: role,
      });

      if (insertError) {
        console.error("[assignUserRole] Role insertion failed:", insertError);
        throw insertError;
      }

      console.log(`[assignUserRole] Role ${role} successfully assigned to user ID: ${userId}`);
      return { success: true };
    } catch (err: any) {
      console.error("[assignUserRole] Server function failed:", err);
      throw new Error(err.message || "BFF failed to assign user role securely.");
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
      console.log(`[checkEmailExists] Checking if email exists: ${email}`);
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
