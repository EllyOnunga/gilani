import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { withTimeout } from "@/lib/async";
import { sanitizeCurriculum } from "@/lib/tutor-prompt";
import { checkPlanRateLimit, getPlanRateLimitStatus } from "@/lib/rate-limit.server";
import { createGoogleAiProvider } from "@/lib/ai-gateway.server";

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
      examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      subjects: z.string().trim().min(2).max(500),
      hoursPerDay: z.number().min(0.5).max(8).default(2),
    }),
  )
  .handler(async ({ data }) => {
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
      `You are an expert ${curriculum} curriculum study coach creating a day-by-day study schedule for a Kenyan student.`,
      `Exam / goal: "${examName}".`,
      dateInstruction,
      `Subjects and topics to cover: ${subjects}.`,
      `The student can realistically study about ${hoursPerDay} hour(s) per day — keep each day's total durationMinutes roughly within that budget (allow some days lighter, e.g. rest days, but do not wildly exceed the budget on any single day).`,
      "Spread topics across days using spaced repetition rather than cramming one subject per day block after block. Revisit important topics more than once if the timeframe allows.",
      "Each item's 'task' field must be a specific, actionable instruction (e.g. 'Practice past-paper questions on quadratic equations, focusing on completing the square' — not just 'Study algebra').",
      weakTopicsContext || "No prior quiz history is available for this student yet.",
      "Every item must include a realistic date (YYYY-MM-DD) within the plan's span, a subject, a specific topic, a task, a duration in minutes, and a priority (low/medium/high) reflecting how critical that topic is to the exam.",
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
      .sort((a: StudyPlanItem, b: StudyPlanItem) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const { data: plan, error } = await supabaseAdmin
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
    return { planId: plan.id, items: itemsWithIds };
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
