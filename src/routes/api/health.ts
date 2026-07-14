import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/server/supabase";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const start = Date.now();
        try {
          const { error } = await supabaseAdmin.from("profiles").select("id").limit(1);
          if (error) throw error;
          const latency = Date.now() - start;

          return new Response(
            JSON.stringify({
              status: "ok",
              dbLatencyMs: latency,
              timestamp: new Date().toISOString(),
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err: unknown) {
          console.error(
            "[API Health] Database check failed:",
            JSON.stringify({ error: String(err) }),
          );
          return new Response(
            JSON.stringify({
              status: "error",
              message: "Database connection failed",
              timestamp: new Date().toISOString(),
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
