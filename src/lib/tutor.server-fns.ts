import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const deleteThreadFn = createServerFn({ method: "POST" })
  .inputValidator(z.string())
  .handler(async ({ data: threadId }) => {
    const { error } = await supabaseAdmin
      .from("conversations")
      .delete()
      .eq("id", threadId);
    if (error) throw error;
    return true;
  });
  