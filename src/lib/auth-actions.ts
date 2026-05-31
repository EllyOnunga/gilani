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
    })
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
      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .insert({
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
