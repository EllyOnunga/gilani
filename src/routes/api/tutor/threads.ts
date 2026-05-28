import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth";

function validateEnvVars() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    return { error: `Missing Supabase server env vars: ${missing.join(", ")}` };
  }
  return null;
}

export const Route = createFileRoute("/api/tutor/threads")({
  server: {
    handlers: {
      POST: async () => {
        const envError = validateEnvVars();
        if (envError) {
          return new Response(JSON.stringify({ error: envError.error }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const request = getRequest();
          let authResult;
          try {
            authResult = await authenticateRequest(request);
          } catch (err) {
            if (err instanceof Response) return err;
            return new Response(
              JSON.stringify({ error: err instanceof Error ? err.message : "Unauthorized" }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }

          const { userId } = authResult;
          const body = await request.json().catch(() => ({}));
          const title = (body.title as string) || "New tutor session";

          const { data, error } = await supabaseAdmin
            .from("conversations")
            .insert({ title, user_id: userId })
            .select("*")
            .limit(1)
            .single();

          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({ thread: data }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Failed to create thread",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async () => {
        const envError = validateEnvVars();
        if (envError) {
          return new Response(JSON.stringify({ error: envError.error }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const request = getRequest();
          let authResult;
          try {
            authResult = await authenticateRequest(request);
          } catch (err) {
            if (err instanceof Response) return err;
            return new Response(
              JSON.stringify({ error: err instanceof Error ? err.message : "Unauthorized" }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }

          const { userId } = authResult;
          const url = new URL(request.url);
          const limit = Number(url.searchParams.get("limit") || "50");

          const { data, error } = await supabaseAdmin
            .from("conversations")
            .select("*")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(limit);

          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({ threads: data }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Failed to fetch threads",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
