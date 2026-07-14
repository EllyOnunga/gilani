import { supabaseAdmin } from "@/server/supabase";

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
  // Retry once on transient network failures (DNS hiccups like EAI_AGAIN,
  // dropped connections) before treating it as a real auth failure.
  const isTransientNetworkError = (err: unknown): boolean => {
    const msg = String((err as any)?.message || err || "");
    const cause = (err as any)?.cause;
    const causeCode = cause?.code || "";
    return (
      causeCode === "EAI_AGAIN" ||
      causeCode === "ECONNRESET" ||
      causeCode === "ETIMEDOUT" ||
      /fetch failed/i.test(msg) ||
      /network/i.test(msg)
    );
  };

  let data: Awaited<ReturnType<typeof supabaseAdmin.auth.getUser>>["data"] | undefined;
  let error: Awaited<ReturnType<typeof supabaseAdmin.auth.getUser>>["error"] | undefined;
  const MAX_AUTH_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    try {
      const result = await supabaseAdmin.auth.getUser(token);
      data = result.data;
      error = result.error;
      break;
    } catch (networkErr) {
      if (attempt < MAX_AUTH_RETRIES && isTransientNetworkError(networkErr)) {
        console.warn(
          `[API Auth] Transient network error on attempt ${attempt + 1}, retrying:`,
          (networkErr as any)?.message || networkErr,
        );
        await new Promise((res) => setTimeout(res, 300 * (attempt + 1)));
        continue;
      }
      throw new Response(
        JSON.stringify({
          error:
            "Unable to reach authentication service. Please check your connection and try again.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }
  }

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
