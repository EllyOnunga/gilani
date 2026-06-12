import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { z } from "zod";

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

/**
 * Supabase-backed atomic rate limiter.
 * Returns { allowed, retryAfterMs } so callers can tell users when to retry.
 */
export async function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + opts.windowMs).toISOString();

  const { data, error } = await supabaseAdmin.rpc("upsert_rate_limit", {
    p_key: key,
    p_max: opts.max,
    p_reset_at: resetAt,
  });

  if (error) {
    console.error("[RateLimit] DB error, failing open:", error.message);
    return { allowed: true, retryAfterMs: 0 };
  }

  if (data === true) return { allowed: true, retryAfterMs: 0 };

  // Fetch reset time so we can tell the user how long to wait
  const { data: row } = await supabaseAdmin
    .from("rate_limits")
    .select("reset_at")
    .eq("key", key)
    .maybeSingle();

  const resetTime = row?.reset_at ? new Date(row.reset_at).getTime() : now.getTime() + opts.windowMs;
  const retryAfterMs = Math.max(0, resetTime - now.getTime());
  return { allowed: false, retryAfterMs };
}

// ─── Per-action rate limits ──────────────────────────────────────────────────

/** Chat: 20 messages per minute */
export const CHAT_RATE_LIMIT: RateLimitOptions      = { max: 20,  windowMs: 60_000 };

/** Chat: 200 messages per day */
export const CHAT_DAILY_LIMIT: RateLimitOptions     = { max: 200, windowMs: 86_400_000 };

/** Quiz generation: 10 per minute, 50 per day */
export const QUIZ_RATE_LIMIT: RateLimitOptions      = { max: 10,  windowMs: 60_000 };
export const QUIZ_DAILY_LIMIT: RateLimitOptions     = { max: 50,  windowMs: 86_400_000 };

/** Planner: 10 per minute, 30 per day */
export const PLANNER_RATE_LIMIT: RateLimitOptions   = { max: 10,  windowMs: 60_000 };
export const PLANNER_DAILY_LIMIT: RateLimitOptions  = { max: 30,  windowMs: 86_400_000 };

/** Notes ingest: 10 per minute, 50 per day */
export const NOTES_RATE_LIMIT: RateLimitOptions     = { max: 10,  windowMs: 60_000 };
export const NOTES_DAILY_LIMIT: RateLimitOptions    = { max: 50,  windowMs: 86_400_000 };

/** Legacy alias used by old imports */
export const AI_RATE_LIMIT: RateLimitOptions        = CHAT_RATE_LIMIT;

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
  if (!daily.allowed)  return { ...daily,  isDaily: true  };
  return { allowed: true, retryAfterMs: 0, isDaily: false };
}

// ─── Plan-aware daily limit ───────────────────────────────────────────────────

import { getPlanLimits } from "@/lib/plans";

export type RateLimitAction = "chat" | "quiz" | "planner" | "notes";

/**
 * Fetch the user's current plan from profiles, then check
 * both per-minute and daily limits against their plan allowance for the given action.
 */
export async function checkPlanRateLimit(
  userId: string,
  action: RateLimitAction = "chat",
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
      minuteMax = plan === "free" ? 5 : plan === "basic" ? 10 : 20;
      dailyMax = limits.dailyMessages;
      break;
    case "quiz":
      minuteMax = plan === "free" ? 2 : plan === "basic" ? 5 : 10;
      dailyMax = limits.dailyQuizzes;
      break;
    case "planner":
      minuteMax = plan === "free" ? 2 : plan === "basic" ? 5 : 10;
      dailyMax = limits.dailyPlanners;
      break;
    case "notes":
      minuteMax = plan === "free" ? 2 : plan === "basic" ? 5 : 10;
      dailyMax = limits.dailyNotes;
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
  const dailyLimit: RateLimitOptions  = { max: dailyMax, windowMs: msUntilMidnight };

  const result = await checkDualRateLimit(userId, action, minuteLimit, dailyLimit);
  return { ...result, plan };
}

/**
 * Read-only status checker to check if user is rate limited without incrementing the counters.
 */
export async function getPlanRateLimitStatus(
  userId: string,
  action: RateLimitAction = "chat",
): Promise<{ isRateLimited: boolean; retryAfterMs: number; isDaily: boolean }> {
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
  let minuteMax = 20;
  let dailyMax = 10;

  switch (action) {
    case "chat":
      minuteMax = plan === "free" ? 5 : plan === "basic" ? 10 : 20;
      dailyMax = limits.dailyMessages;
      break;
    case "quiz":
      minuteMax = plan === "free" ? 2 : plan === "basic" ? 5 : 10;
      dailyMax = limits.dailyQuizzes;
      break;
    case "planner":
      minuteMax = plan === "free" ? 2 : plan === "basic" ? 5 : 10;
      dailyMax = limits.dailyPlanners;
      break;
    case "notes":
      minuteMax = plan === "free" ? 2 : plan === "basic" ? 5 : 10;
      dailyMax = limits.dailyNotes;
      break;
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
    };
  }

  return { isRateLimited: false, retryAfterMs: 0, isDaily: false };
}

export const getRateLimitStatus = createServerFn({ method: "POST" })
  .inputValidator(z.string())
  .handler(async ({ data }) => {
    const action = data as RateLimitAction;
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch {
      return { isRateLimited: false, retryAfterMs: 0, isDaily: false };
    }
    return getPlanRateLimitStatus(authResult.userId, action);
  });
