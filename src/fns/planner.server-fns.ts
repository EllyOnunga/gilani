import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { withTimeout } from "@/shared/utils/async";
import { sanitizeCurriculum } from "@/shared/utils/tutor-prompt";

// Memory cache for deduplicating identical requests (5-min TTL)
const plannerCache = new Map<string, { result: any; expiresAt: number }>();

// ─── Schema ──────────────────────────────────────────────────────────────
export const StudyPlanItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  subject: z.string().min(1).max(100),
  topic: z.string().min(1).max(150),
  task: z.string().min(5).max(400),
  durationMinutes: z.number().int().min(15).max(240),
  priority: z.enum(["low", "medium", "high"]),
});
export type StudyPlanItem = z.infer<typeof StudyPlanItemSchema> & {
  id: string;
  completed: boolean;
};

const StudyPlanGenerationSchema = z.object({
  items: z.array(StudyPlanItemSchema).min(3).max(120),
});

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00Z").getTime();
  const to = new Date(toISO + "T00:00:00Z").getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

// ─── Generate a study plan ────────────────────────────────────────────────
export const generateStudyPlanFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      examName: z.string().trim().min(2).max(200),
      examDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      subjects: z.string().trim().min(2).max(500),
      hoursPerDay: z.number().min(0.5).max(8).default(2),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/server/supabase");
    const { authenticateRequest } = await import("@/server/api-auth.server");
    const { checkPlanRateLimit, getPlanRateLimitStatus } =
      await import("@/server/rate-limit.server");
    const { createGoogleAiProvider } = await import("@/server/ai-gateway.server");
    const request = getRequest();
    let authResult: Awaited<ReturnType<typeof authenticateRequest>>;
    try {
      authResult = await authenticateRequest(request);
    } catch {
      throw new Error("Unauthorized");
    }
    const userId = authResult.userId;

    // Enforces both per-minute and plan-based daily quota (getPlanLimits().dailyPlanners)
    const rateLimit = await checkPlanRateLimit(userId, "planner");
    if (!rateLimit.allowed) {
      throw new Error(
        rateLimit.isDaily
          ? "You've reached your daily study plan generation limit. Upgrade your plan or try again tomorrow."
          : "You're generating plans too fast. Please wait a moment and try again.",
      );
    }

    const { examName, examDate, subjects, hoursPerDay } = data;

    const cacheKey = `${userId}:${examName.toLowerCase().trim()}:${examDate || "none"}:${subjects.toLowerCase().trim()}:${hoursPerDay}`;
    const cached = plannerCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("curriculum")
      .eq("id", userId)
      .maybeSingle();
    const curriculum = sanitizeCurriculum(profile?.curriculum);

    // ─── Pull recent weak topics from quiz history to prioritize ─────────
    let weakTopicsContext = "";
    try {
      const { data: attempts } = await supabaseAdmin
        .from("quiz_attempts")
        .select("weak_topics")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      const weakTopics = Array.from(
        new Set(
          (attempts ?? [])
            .flatMap((a: any) => (Array.isArray(a.weak_topics) ? a.weak_topics : []))
            .filter(Boolean),
        ),
      ).slice(0, 15);
      if (weakTopics.length) {
        weakTopicsContext = `The student has recently struggled with these specific sub-topics in quizzes — prioritize extra time on these where they overlap with the subjects below: ${weakTopics.join(", ")}.`;
      }
    } catch (err) {
      console.error("[Planner] Failed to fetch weak topics:", err);
    }

    // ─── Compute plan span ─────────────────────────────────────────────
    const start = todayISO();
    let spanDays: number;
    let dateInstruction: string;
    if (examDate) {
      const rawSpan = daysBetween(start, examDate);
      if (rawSpan < 1) {
        throw new Error("Exam date must be in the future.");
      }
      spanDays = Math.min(rawSpan, 60);
      dateInstruction = `The plan must run from ${start} up to and including ${examDate} (${spanDays} day span). Build intensity so coverage is roughly complete a day or two before the exam, leaving the final day or two for light review only.`;
    } else {
      spanDays = 14;
      dateInstruction = `No fixed exam date was given — build a general 14-day plan starting ${start}.`;
    }

    // ─── Build the generation prompt ──────────────────────────────────
    const prompt = [
      `You are an elite ${curriculum || "general"} curriculum study coach creating a personalised day-by-day study schedule for a Kenyan student.`,

      `--- GOAL ---`,
      `Exam / goal: "${examName}".`,
      dateInstruction,

      `--- SUBJECTS & TOPICS ---`,
      `Subjects and topics to cover: ${subjects}.`,

      `--- TIME BUDGET ---`,
      `The student can realistically study about ${hoursPerDay} hour(s) per day. Keep each day's total durationMinutes within that budget (${Math.round(hoursPerDay * 60)} minutes/day). Some days may be lighter (rest, review), but NEVER exceed 1.5× the daily budget in total on any single day.`,

      `--- TASK QUALITY RULES ---`,
      `Each item's 'task' field MUST be a specific, concrete, actionable study instruction. Bad examples: "Study algebra", "Review chemistry". Good examples:`,
      `  - "Complete 10 past-paper questions on factorising quadratics. Focus on the difference of two squares pattern."`,
      `  - "Make a summary table of all 20 standard amino acids: name, abbreviation, and functional group. Then test yourself without looking."`,
      `  - "Derive Newton's second law from first principles, then solve 5 F=ma problems with varying unknowns."`,
      `Be this specific. Every task should be completable and measurable within the stated duration.`,

      `--- SPACED REPETITION & PROGRESSION ---`,
      `1. Spread topics across days — do NOT block all of one subject together. Interleave subjects.`,
      `2. Revisit high-priority topics at least twice: once for initial learning, once for review/practice 3–5 days later.`,
      `3. As the exam approaches, shift from new-content sessions to exam-practice, past-paper, and timed-test sessions.`,
      `4. Leave the final 1–2 days before the exam for light review only — no new content. Mark these as priority: "low".`,

      `--- PRIORITY SYSTEM ---`,
      `Set priority based on a combination of: (1) how much the topic is likely to be tested, (2) how difficult it is, and (3) how little time is left.`,
      `  - high: critical exam topics, topics the student has struggled with, topics appearing in final weeks`,
      `  - medium: important but not the highest-weight topics, mid-plan sessions`,
      `  - low: revision sessions, rest/catch-up days, final review days`,

      weakTopicsContext ||
        "No prior quiz history is available — prioritize based on typical exam weightings for the subject.",

      `--- OUTPUT FORMAT ---`,
      `Every item MUST have: date (YYYY-MM-DD within the plan span), subject (short name), topic (specific sub-topic), task (detailed actionable instruction as above), durationMinutes (integer, 15–240), priority (low/medium/high).`,
      `Sort items by date ascending. Cover all stated subjects proportionally across the full plan.`,
    ].join("\n\n");

    const { generateObject } = await import("ai");
    const gateway = createGoogleAiProvider();

    let result;
    try {
      result = await withTimeout(
        generateObject({
          model: gateway.chatModel() as any,
          schema: StudyPlanGenerationSchema,
          prompt,
        } as any),
        120000,
        "Study plan generation timed out",
      );
    } catch (err) {
      console.error("[Planner Gen] Failed:", err instanceof Error ? err.message : String(err));
      throw new Error("Failed to generate study plan. Please try again in a moment.");
    }

    const itemsWithIds: StudyPlanItem[] = (result as any).object.items
      .map((it: any) => ({ ...it, id: crypto.randomUUID(), completed: false }))
      .sort((a: StudyPlanItem, b: StudyPlanItem) =>
        a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
      );

    const { data: insertedPlan, error } = await supabaseAdmin
      .from("study_plans")
      .insert({
        user_id: userId,
        exam_name: examName,
        exam_date: examDate ?? null,
        items: itemsWithIds as any,
      })
      .select("id")
      .single();

    if (error) throw error;
    if (!itemsWithIds || itemsWithIds.length === 0) {
      throw new Error("The AI returned an empty study plan. Please provide more details.");
    }

    const res = { planId: insertedPlan.id, items: itemsWithIds };
    plannerCache.set(cacheKey, { result: res, expiresAt: Date.now() + 5 * 60_000 });

    return res;
  });

// ─── Toggle a single item's completion ────────────────────────────────────
export const toggleStudyPlanItemFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      planId: z.string().uuid(),
      itemId: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/server/supabase");
    const { authenticateRequest } = await import("@/server/api-auth.server");
    const { checkPlanRateLimit, getPlanRateLimitStatus } =
      await import("@/server/rate-limit.server");
    const { createGoogleAiProvider } = await import("@/server/ai-gateway.server");
    const request = getRequest();
    let authResult: Awaited<ReturnType<typeof authenticateRequest>>;
    try {
      authResult = await authenticateRequest(request);
    } catch {
      throw new Error("Unauthorized");
    }
    const userId = authResult.userId;

    const { data: plan, error: fetchError } = await supabaseAdmin
      .from("study_plans")
      .select("id, user_id, items")
      .eq("id", data.planId)
      .maybeSingle();
    if (fetchError || !plan || plan.user_id !== userId) {
      throw new Error("Study plan not found");
    }

    const items: StudyPlanItem[] = Array.isArray(plan.items) ? (plan.items as any) : [];
    const updatedItems = items.map((it) =>
      it.id === data.itemId ? { ...it, completed: !it.completed } : it,
    );

    const { error } = await supabaseAdmin
      .from("study_plans")
      .update({ items: updatedItems as any, updated_at: new Date().toISOString() })
      .eq("id", data.planId);
    if (error) throw error;

    return { items: updatedItems };
  });

// ─── Delete a study plan ──────────────────────────────────────────────────
export const deleteStudyPlanFn = createServerFn({ method: "POST" })
  .validator(z.object({ planId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/server/supabase");
    const { authenticateRequest } = await import("@/server/api-auth.server");
    const { checkPlanRateLimit, getPlanRateLimitStatus } =
      await import("@/server/rate-limit.server");
    const { createGoogleAiProvider } = await import("@/server/ai-gateway.server");
    const request = getRequest();
    let authResult: Awaited<ReturnType<typeof authenticateRequest>>;
    try {
      authResult = await authenticateRequest(request);
    } catch {
      throw new Error("Unauthorized");
    }
    const { error } = await supabaseAdmin
      .from("study_plans")
      .delete()
      .eq("id", data.planId)
      .eq("user_id", authResult.userId);
    if (error) throw error;
    return { success: true };
  });

// ─── Planner form options + weak-topic preview (for display before generating) ───
export const getPlannerFormOptionsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/server/supabase");
  const { authenticateRequest } = await import("@/server/api-auth.server");
  const { checkPlanRateLimit, getPlanRateLimitStatus } = await import("@/server/rate-limit.server");
  const { createGoogleAiProvider } = await import("@/server/ai-gateway.server");
  const request = getRequest();
  let userId: string | null = null;
  try {
    const authResult = await authenticateRequest(request);
    userId = authResult.userId;
  } catch {
    // Unauthenticated — return safe defaults
  }

  let plannersUsedToday = 0;
  let plannersMaxToday = 2;
  let weakTopics: string[] = [];

  if (userId) {
    const status = await getPlanRateLimitStatus(userId, "planner");
    plannersUsedToday = status.messagesUsed;
    plannersMaxToday = status.messagesMax;

    const { data: attempts } = await supabaseAdmin
      .from("quiz_attempts")
      .select("weak_topics")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    weakTopics = Array.from(
      new Set(
        (attempts ?? [])
          .flatMap((a: any) => (Array.isArray(a.weak_topics) ? a.weak_topics : []))
          .filter(Boolean),
      ),
    ).slice(0, 15) as string[];
  }

  return { plannersUsedToday, plannersMaxToday, weakTopics };
});
