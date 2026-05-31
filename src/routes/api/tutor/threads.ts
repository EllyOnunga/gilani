import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth";

export const Route = createFileRoute("/api/tutor/threads")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const request = getRequest();
          const { userId } = await authenticateRequest(request);

          // Create a new scholarly conversation thread
          const { data: thread, error } = await supabaseAdmin
            .from("conversations")
            .insert({
              user_id: userId,
              title: "New Study Session",
              updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (error) throw error;

          return new Response(JSON.stringify({ thread: { id: thread.id } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("[API Tutor Threads] Error:", error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Failed to create thread",
            }),
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
