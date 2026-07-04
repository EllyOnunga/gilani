import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPlanLimits, getPlanMinuteLimit } from "@/lib/plans";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { z } from "zod";

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

// ── Circuit breaker ────────────────────────────────────────────────────────────
// Tracks consecutive DB failures. After 3 failures within 30 s, the rate
// limiter fails CLOSED (denies all requests) rather than open. This prevents
// a DB outage from disabling rate limiting entirely.
const _circuitBreaker = {
  failures: 0,
  lastFailureAt: 0,
};
const CB_THRESHOLD = 3;
const CB_WINDOW_MS = 30_000;
const CB_DENY_WINDOW_MS = 60_000; // deny for 60 s after tripping

function circuitOpen(): boolean {
  const now = Date.now();
  // Reset failure count if window has passed
  if (now - _circuitBreaker.lastFailureAt > CB_WINDOW_MS) {
    _circuitBreaker.failures = 0;
  }
  return (
    _circuitBreaker.failures >= CB_THRESHOLD &&
    now - _circuitBreaker.lastFailureAt < CB_DENY_WINDOW_MS
  );
}

function recordCircuitFailure() {
  const now = Date.now();
  if (now - _circuitBreaker.lastFailureAt > CB_WINDOW_MS) {
    _circuitBreaker.failures = 0;
  }
  _circuitBreaker.failures += 1;
  _circuitBreaker.lastFailureAt = now;
  console.error(
    `[RateLimit] Circuit breaker: ${_circuitBreaker.failures}/${CB_THRESHOLD} failures`,
  );
}

/**
 * Supabase-backed atomic rate limiter.
 * Returns { allowed, retryAfterMs } so callers can tell users when to retry.
 * Fails CLOSED (denies requests) when the DB is repeatedly unreachable.
 */
export async function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  // If the circuit is tripped, deny all requests until the DB recovers
  if (circuitOpen()) {
    console.error("[RateLimit] Circuit breaker OPEN — denying request for key:", key);
    return { allowed: false, retryAfterMs: 30_000 };
  }

  const now = new Date();
  const resetAt = new Date(now.getTime() + opts.windowMs).toISOString();

  const { data, error } = await supabaseAdmin.rpc("upsert_rate_limit", {
    p_key: key,
    p_max: opts.max,
    p_reset_at: resetAt,
  });

  if (error) {
    recordCircuitFailure();
    console.error("[RateLimit] DB error — failing CLOSED to protect the system:", error.message);
    // Fail closed: deny the request rather than allowing unlimited access
    return { allowed: false, retryAfterMs: 30_000 };
  }

  // Reset circuit breaker on success
  _circuitBreaker.failures = 0;

  if (data === true) return { allowed: true, retryAfterMs: 0 };

  // Fetch reset time so we can tell the user how long to wait
  const { data: row } = await supabaseAdmin
    .from("rate_limits")
    .select("reset_at")
    .eq("key", key)
    .maybeSingle();

  const resetTime = row?.reset_at
    ? new Date(row.reset_at).getTime()
    : now.getTime() + opts.windowMs;
  const retryAfterMs = Math.max(0, resetTime - now.getTime());
  return { allowed: false, retryAfterMs };
}

/**
 * Decrement rate limit counter — call when a request fails after being counted.
 * Prevents retries from consuming quota unnecessarily.
 */
export async function decrementRateLimit(key: string): Promise<void> {
  await (supabaseAdmin.rpc as any)("decrement_rate_limit", { p_key: key });
}

// ─── Per-action rate limits ──────────────────────────────────────────────────

/** Chat: 20 messages per minute */
export const CHAT_RATE_LIMIT: RateLimitOptions = { max: 20, windowMs: 60_000 };

/** Chat: 200 messages per day */
export const CHAT_DAILY_LIMIT: RateLimitOptions = { max: 200, windowMs: 86_400_000 };

/** Quiz generation: 10 per minute, 50 per day */
export const QUIZ_RATE_LIMIT: RateLimitOptions = { max: 10, windowMs: 60_000 };
export const QUIZ_DAILY_LIMIT: RateLimitOptions = { max: 50, windowMs: 86_400_000 };

/** Planner: 10 per minute, 30 per day */
export const PLANNER_RATE_LIMIT: RateLimitOptions = { max: 10, windowMs: 60_000 };
export const PLANNER_DAILY_LIMIT: RateLimitOptions = { max: 30, windowMs: 86_400_000 };

/** Notes ingest: 10 per minute, 50 per day */
export const NOTES_RATE_LIMIT: RateLimitOptions = { max: 10, windowMs: 60_000 };
export const NOTES_DAILY_LIMIT: RateLimitOptions = { max: 50, windowMs: 86_400_000 };

/** Legacy alias used by old imports */
export const AI_RATE_LIMIT: RateLimitOptions = CHAT_RATE_LIMIT;

/**
 * Check both per-minute and daily limits.
 * Returns the more restrictive result.
 */
export async function checkDualRateLimit(
  userId: string,
  action: string,
  minuteLimit: RateLimitOptions,
  dailyLimit: RateLimitOptions,
): Promise<{ allowed: boolean; retryAfterMs: number; isDaily: boolean }> {
  const [minute, daily] = await Promise.all([
    checkRateLimit(`${userId}:${action}:min`, minuteLimit),
    checkRateLimit(`${userId}:${action}:day`, dailyLimit),
  ]);

  if (!minute.allowed) return { ...minute, isDaily: false };
  if (!daily.allowed) return { ...daily, isDaily: true };
  return { allowed: true, retryAfterMs: 0, isDaily: false };
}

// ─── Plan-aware daily limit ───────────────────────────────────────────────────

export type RateLimitAction = "chat" | "quiz" | "planner" | "notes";

/**
 * Fetch the user's current plan from profiles, then check
 * both per-minute and daily limits against their plan allowance for the given action.
 */
export async function checkPlanRateLimit(
  userId: string,
  action: RateLimitAction = "chat",
  skipIncrement: boolean = false,
): Promise<{ allowed: boolean; retryAfterMs: number; isDaily: boolean; plan: string }> {
  // Get user plan from profiles
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan, plan_expiry")
    .eq("id", userId)
    .maybeSingle();

  // Fall back to free if no plan or plan expired
  let plan = profile?.plan ?? "free";
  if (profile?.plan_expiry) {
    const expiry = new Date(profile.plan_expiry);
    if (expiry < new Date()) plan = "free";
  }

  const limits = getPlanLimits(plan);

  let minuteMax = 20;
  let dailyMax = 10;

  switch (action) {
    case "chat":
      minuteMax = plan === "free" ? 5 : 20;
      dailyMax = limits.dailyMessages;
      break;
    case "quiz":
      minuteMax = plan === "free" ? 0 : 10;
      dailyMax = plan === "free" ? 0 : limits.dailyQuizzes;
      break;
    case "planner":
      minuteMax = plan === "free" ? 0 : 10;
      dailyMax = plan === "free" ? 0 : limits.dailyPlanners;
      break;
    case "notes":
      minuteMax = plan === "free" ? 0 : 10;
      dailyMax = plan === "free" ? 0 : limits.dailyNotes;
      break;
  }

  const now = new Date();

  // Convert now to EAT (UTC+3)
  const eatOffsetMs = 3 * 60 * 60 * 1000;
  const nowEat = new Date(now.getTime() + eatOffsetMs);

  // Find next midnight in EAT
  const nextMidnightEat = new Date(nowEat);
  nextMidnightEat.setUTCHours(24, 0, 0, 0);

  // The difference in MS is identical regardless of timezone base
  const msUntilMidnight = nextMidnightEat.getTime() - nowEat.getTime();

  const minuteLimit: RateLimitOptions = { max: minuteMax, windowMs: 60_000 };
  const dailyLimit: RateLimitOptions = { max: dailyMax, windowMs: msUntilMidnight };

  const result = await checkDualRateLimit(userId, action, minuteLimit, dailyLimit);
  return { ...result, plan };
}

/**
 * Read-only status checker to check if user is rate limited without incrementing the counters.
 */
export async function getPlanRateLimitStatus(
  userId: string,
  action: RateLimitAction = "chat",
): Promise<{
  isRateLimited: boolean;
  retryAfterMs: number;
  isDaily: boolean;
  messagesUsed: number;
  messagesMax: number;
  plan: string;
}> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan, plan_expiry")
    .eq("id", userId)
    .maybeSingle();

  let plan = profile?.plan ?? "free";
  if (profile?.plan_expiry) {
    const expiry = new Date(profile.plan_expiry);
    if (expiry < new Date()) plan = "free";
  }

  const limits = getPlanLimits(plan);
  const planMinute = getPlanMinuteLimit(plan);
  let minuteMax: number;
  let dailyMax: number;
  switch (action) {
    case "chat":
      minuteMax = planMinute;
      dailyMax = limits.dailyMessages;
      break;
    case "quiz":
      minuteMax = plan === "free" ? 0 : planMinute;
      dailyMax = plan === "free" ? 0 : limits.dailyQuizzes;
      break;
    case "planner":
      minuteMax = plan === "free" ? 0 : planMinute;
      dailyMax = plan === "free" ? 0 : limits.dailyPlanners;
      break;
    case "notes":
      minuteMax = plan === "free" ? 0 : planMinute;
      dailyMax = plan === "free" ? 0 : limits.dailyNotes;
      break;
    default:
      minuteMax = planMinute;
      dailyMax = limits.dailyMessages;
  }

  const now = new Date();

  // Check daily limit key
  const dailyKey = `${userId}:${action}:day`;
  const { data: dailyRow } = await supabaseAdmin
    .from("rate_limits")
    .select("count, reset_at")
    .eq("key", dailyKey)
    .maybeSingle();

  if (dailyRow && new Date(dailyRow.reset_at) > now && dailyRow.count >= dailyMax) {
    const resetTime = new Date(dailyRow.reset_at).getTime();
    return {
      isRateLimited: true,
      retryAfterMs: Math.max(0, resetTime - now.getTime()),
      isDaily: true,
      messagesUsed: dailyRow?.count ?? 0,
      messagesMax: dailyMax,
      plan,
    };
  }

  // Check minute limit key
  const minuteKey = `${userId}:${action}:min`;
  const { data: minRow } = await supabaseAdmin
    .from("rate_limits")
    .select("count, reset_at")
    .eq("key", minuteKey)
    .maybeSingle();

  if (minRow && new Date(minRow.reset_at) > now && minRow.count >= minuteMax) {
    const resetTime = new Date(minRow.reset_at).getTime();
    return {
      isRateLimited: true,
      retryAfterMs: Math.max(0, resetTime - now.getTime()),
      isDaily: false,
      messagesUsed: minRow?.count ?? 0,
      messagesMax: minuteMax,
      plan,
    };
  }

  // If the daily row exists but its window has already expired, treat count as 0.
  // This prevents stale counts from triggering the 80% warning after a reset.
  const dailyRowExpired = dailyRow ? new Date(dailyRow.reset_at) <= now : true;
  return {
    isRateLimited: false as const,
    retryAfterMs: 0,
    isDaily: false as const,
    messagesUsed: dailyRowExpired ? 0 : (dailyRow?.count ?? 0),
    messagesMax: dailyMax,
    plan,
  };
}

export const getRateLimitStatus = createServerFn({ method: "POST" })
  .validator(z.string())
  .handler(async ({ data }) => {
    const action = data as RateLimitAction;
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch {
      const freeLimits = getPlanLimits("free");
      return {
        isRateLimited: false as const,
        retryAfterMs: 0 as const,
        isDaily: false as const,
        messagesUsed: 0,
        messagesMax: freeLimits.dailyMessages,
        plan: "free",
      };
    }
    return getPlanRateLimitStatus(authResult.userId, action);
  });
