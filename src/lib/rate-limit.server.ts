import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/**
 * Supabase-backed rate limiter.
 * Survives restarts, works across multiple worker processes/instances.
 *
 * Uses an upsert on the rate_limits table:
 *   - If no row exists or it has expired → insert fresh bucket (count = 1)
 *   - If row exists and is live → increment count, reject if over max
 *
 * Key format convention: "<userId>:<action>"  e.g. "abc-123:generateQuiz"
 */
export async function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<boolean> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + opts.windowMs).toISOString();

  // Atomic upsert:
  // - INSERT a fresh row (count=1) if key doesn't exist or has expired
  // - UPDATE by incrementing count if the row is still live
  // Returns the resulting row so we can check the count.
  const { data, error } = await supabaseAdmin.rpc("upsert_rate_limit", {
    p_key: key,
    p_max: opts.max,
    p_reset_at: resetAt,
  });

  if (error) {
    // Fail open: if the DB is unavailable, don't block the user
    console.error("[RateLimit] DB error, failing open:", error.message);
    return true;
  }

  // The function returns TRUE if the request is allowed, FALSE if over limit
  return data === true;
}

/** 30 AI calls per user per minute for heavy server functions */
export const AI_RATE_LIMIT: RateLimitOptions = { max: 30, windowMs: 60_000 };
