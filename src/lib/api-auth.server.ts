import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function authenticateRequest(request: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  // Accept both server-style and Vite-style env names to avoid deploy mismatches.
  const SUPABASE_PUBLISHABLE_KEY =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY)"] : []),
    ];
    throw new Response(
      JSON.stringify({ error: `Missing Supabase environment variable(s): ${missing.join(", ")}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Unauthorized: No valid Bearer token provided" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new Response(JSON.stringify({ error: "Unauthorized: Token is empty" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Use the already-initialized admin client — avoids creating a new TCP connection
  // per request which was causing ETIMEDOUT under load.
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    console.error(
      "[API Auth Error] Token verification failed:",
      error?.message || "No user returned",
    );
    throw new Response(
      JSON.stringify({ error: `Unauthorized: ${error?.message || "Invalid token claims"}` }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  return {
    supabase: supabaseAdmin,
    userId: data.user.id,
    user: data.user,
  };
}

export async function requireRole(userId: string, role: "teacher" | "admin"): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .single();
  return !error && !!data;
}
