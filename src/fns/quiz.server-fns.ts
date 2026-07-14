import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { withTimeout } from "@/shared/utils/async";
import { sanitizeCurriculum, sanitizeUntrustedInput } from "@/shared/utils/tutor-prompt";

import { getPlanLimits } from "@/shared/plans";

// Memory cache for deduplicating identical requests (5-min TTL)
const quizCache = new Map<string, { result: any; expiresAt: number }>();

// ─── Schema ──────────────────────────────────────────────────────────────
export const QuizQuestionSchema = z.object({
  question: z.string().min(5).max(500),
  options: z.array(z.string().min(1).max(200)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(10).max(800),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topic: z.string().min(1).max(100),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema> & { id: string };

const QuizGenerationSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(3).max(15),
});

function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  const err = error as any;
  const msg = String(err?.message || err?.error?.message || JSON.stringify(err) || "");
  return (
    err?.statusCode === 429 ||
    msg.includes("rate_limit") ||
    msg.includes("Rate limit") ||
    msg.includes("quota") ||
    /429/.test(msg)
  );
}

// ─── Generate a quiz ─────────────────────────────────────────────────────
export const generateQuizFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      topic: z.string().trim().min(2).max(200),
      difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
      questionCount: z.number().int().min(3).max(15).default(8),
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

    // Enforces both per-minute and plan-based daily quota (getPlanLimits().dailyQuizzes)
    const rateLimit = await checkPlanRateLimit(userId, "quiz");
    if (!rateLimit.allowed) {
      throw new Error(
        rateLimit.isDaily
          ? "You've reached your daily quiz generation limit. Upgrade your plan or try again tomorrow."
          : "You're generating quizzes too fast. Please wait a moment and try again.",
      );
    }

    const { topic } = data;
    const limits = getPlanLimits(rateLimit.plan);
    const allowedDifficulties = limits.quizDifficulties.length
      ? limits.quizDifficulties
      : ["easy", "medium", "hard", "mixed"];
    const difficulty = allowedDifficulties.includes(data.difficulty)
      ? data.difficulty
      : (allowedDifficulties[allowedDifficulties.length - 1] as typeof data.difficulty);
    const questionCount = Math.min(data.questionCount, limits.maxQuizQuestions);

    const cacheKey = `${userId}:${topic.toLowerCase().trim()}:${difficulty}:${questionCount}`;
    const cached = quizCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("curriculum")
      .eq("id", userId)
      .maybeSingle();
    const curriculum = sanitizeCurriculum(profile?.curriculum);

    // ─── RAG: ground the quiz in the student's notes + curriculum library ───
    // Mirrors the retrieval pattern in src/routes/api/chat.ts.
    let notesContext = "";
    try {
      const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
      if (geminiKey) {
        const { embed } = await import("ai");
        const embModel = createGoogleAiProvider().textEmbeddingModel();
        const { embedding } = await withTimeout(
          embed({
            model: embModel,
            value: topic,
            maxRetries: 0,
            providerOptions: { google: { outputDimensionality: 768 } },
          }),
          15000,
          "Embedding generation timed out",
        );
        const embeddingStr = `[${(embedding as number[]).join(",")}]`;

        const [personalResult, globalResult] = await Promise.allSettled([
          supabaseAdmin.rpc("match_note_chunks", {
            query_embedding: embeddingStr,
            match_user_id: userId,
            match_count: 6,
          }),
          supabaseAdmin.rpc("match_global_note_chunks", {
            query_embedding: embeddingStr,
            match_count: 6,
          }),
        ]);

        const personalChunks: string[] =
          personalResult.status === "fulfilled" && personalResult.value.data?.length
            ? personalResult.value.data.map((c: any) => c.content)
            : [];
        const globalChunks: string[] =
          globalResult.status === "fulfilled" && globalResult.value.data?.length
            ? globalResult.value.data.map((c: any) => c.content)
            : [];

        const allChunks: string[] = [];
        if (personalChunks.length) allChunks.push("--- Student's Notes ---", ...personalChunks);
        if (globalChunks.length) allChunks.push("--- Curriculum Library ---", ...globalChunks);
        if (allChunks.length) notesContext = sanitizeUntrustedInput(allChunks.join("\n---\n"));
      } else {
        console.log("[Quiz RAG] No embedding provider available, skipping RAG");
      }
    } catch (err) {
      if (isRateLimitError(err)) {
        console.log("[Quiz RAG] Embeddings rate limited, generating from general knowledge");
      } else {
        console.error("[Quiz RAG] Failed:", err instanceof Error ? err.message : String(err));
      }
    }

    // ─── Build generation prompt ─────────────────────────────────────
    const difficultyInstruction =
      difficulty === "mixed"
        ? "Vary difficulty naturally across the quiz — start with 2–3 easier questions to build confidence, build to medium-difficulty in the middle, and finish with 2–3 hard, exam-like challenge questions. Tag each question's 'difficulty' field accurately."
        : `All questions should be ${difficulty} difficulty. Ensure the question style, mark-worthy precision, and answer choices reflect that difficulty level exactly.`;

    const prompt = [
      `You are an elite ${curriculum || "general"} curriculum examiner crafting a diagnostic quiz for a Kenyan student.`,
      `Your task: Generate exactly ${questionCount} multiple-choice questions on the topic: "${topic}".`,

      `--- DIFFICULTY ---`,
      difficultyInstruction,

      `--- QUESTION QUALITY RULES ---`,
      `1. Every question MUST test a specific, clearly identifiable learning objective. Do NOT write vague or trivially obvious questions.`,
      `2. The question stem must be precise and unambiguous. No trick wording. If a calculation is needed, state all given values clearly.`,
      `3. Each question has exactly 4 options (A–D). Only ONE option is correct. The other 3 must be plausible — use common misconceptions, correct but irrelevant facts, or off-by-one errors as distractors (NOT random garbage).`,
      `4. Options must be parallel in length and style (avoid "all of the above", "none of the above").`,

      `--- MATH & SCIENCE FORMATTING RULES (CRITICAL) ---`,
      `ALL mathematical expressions, formulas, units, and chemical formulas in the question and ALL option strings MUST be written in LaTeX, wrapped in dollar signs. Examples:`,
      `  - Forces: Write "$F = ma$" not "F=ma"`,
      `  - Units: Write "$10 \\text{ m/s}$" not "10m/s"`,
      `  - Chemistry: Write "$\\ce{H2SO4}$" not "H2SO4"`,
      `  - Equations: Write "$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$" not "x = (-b +/- sqrt(b^2-4ac)) / 2a"`,
      `  - Fractions: Use "$\\frac{numerator}{denominator}$" always`,
      `NEVER write raw math in plain text. This is mandatory.`,

      `--- EXPLANATION QUALITY RULES ---`,
      `Every question MUST include a detailed explanation (3–5 sentences) that:`,
      `  1. States WHY the correct answer is correct, citing the relevant rule, law, or formula.`,
      `  2. Identifies the most common wrong option and explains specifically why it is incorrect.`,
      `  3. For calculation questions, shows the key steps of the working in the explanation — with LaTeX.`,
      `  4. Ends with a single exam tip or pattern-recognition insight relevant to this type of question.`,

      `--- TOPIC TAGGING ---`,
      `Tag each question's 'topic' field with a short, specific sub-topic name (e.g., "Newton's Third Law", "Quadratic Formula", "Oxidation Numbers") — this is used to detect weak areas in the student's performance. Be precise, not broad.`,

      notesContext
        ? `--- REFERENCE MATERIAL ---\nGround your questions in the following curriculum-aligned reference material where relevant:\n\n${notesContext}`
        : `--- REFERENCE ---\nNo personal notes were found. Draw on accurate, curriculum-appropriate knowledge for "${topic}".`,
    ].join("\n\n");

    const { generateObject } = await import("ai");
    const gateway = createGoogleAiProvider();

    let result;
    try {
      result = await withTimeout(
        generateObject({
          model: gateway.chatModel() as any,
          schema: QuizGenerationSchema,
          prompt,
        } as any),
        120000,
        "Quiz generation timed out",
      );
    } catch (err) {
      console.error("[Quiz Gen] Failed:", err instanceof Error ? err.message : String(err));
      throw new Error("Failed to generate quiz. Please try again in a moment.");
    }

    const questionsWithIds: QuizQuestion[] = (result as any).object.questions.map((q: any) => ({
      ...q,
      id: crypto.randomUUID(),
    }));

    if (!questionsWithIds || questionsWithIds.length === 0) {
      throw new Error("The AI returned an empty quiz. Please try a different topic.");
    }

    const { data: quiz, error } = await supabaseAdmin
      .from("quizzes")
      .insert({
        user_id: userId,
        topic,
        difficulty,
        questions: questionsWithIds as any,
      })
      .select("id")
      .single();

    if (error) throw error;

    const finalResult = { quizId: quiz.id, questions: questionsWithIds };
    quizCache.set(cacheKey, { result: finalResult, expiresAt: Date.now() + 5 * 60_000 });

    return finalResult;
  });

// ─── Submit a completed attempt ──────────────────────────────────────────
export const submitQuizAttemptFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      quizId: z.string().uuid(),
      answers: z.array(
        z.object({
          questionId: z.string(),
          selectedIndex: z.number().int().min(0).max(3),
          correct: z.boolean(),
          topic: z.string().optional(),
        }),
      ),
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

    const { data: quiz, error: quizError } = await supabaseAdmin
      .from("quizzes")
      .select("id, user_id")
      .eq("id", data.quizId)
      .maybeSingle();
    if (quizError || !quiz || quiz.user_id !== userId) {
      throw new Error("Quiz not found");
    }

    const correctCount = data.answers.filter((a) => a.correct).length;
    const score = Math.round((correctCount / Math.max(1, data.answers.length)) * 100);
    const weakTopics = Array.from(
      new Set(data.answers.filter((a) => !a.correct && a.topic).map((a) => a.topic as string)),
    );

    const { error } = await supabaseAdmin.from("quiz_attempts").insert({
      quiz_id: data.quizId,
      user_id: userId,
      answers: data.answers as any,
      score,
      weak_topics: weakTopics as any,
    });
    if (error) throw error;

    return { score, correctCount, total: data.answers.length, weakTopics };
  });

// ─── Quiz form options (plan-derived, sourced from the user's Supabase profile) ───
export const getQuizFormOptionsFn = createServerFn({ method: "GET" }).handler(async () => {
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
    // Unauthenticated — fall back to free-tier options
  }

  let plan = "free";
  if (userId) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan, plan_expiry")
      .eq("id", userId)
      .maybeSingle();
    plan = profile?.plan ?? "free";
    if (profile?.plan_expiry && new Date(profile.plan_expiry) < new Date()) {
      plan = "free";
    }
  }

  const limits = getPlanLimits(plan);

  let quizzesUsedToday = 0;
  let quizzesMaxToday = limits.dailyQuizzes;
  if (userId) {
    const status = await getPlanRateLimitStatus(userId, "quiz");
    quizzesUsedToday = status.messagesUsed;
    quizzesMaxToday = status.messagesMax;
  }

  return {
    plan,
    maxQuestions: limits.maxQuizQuestions,
    difficulties: limits.quizDifficulties,
    quizzesUsedToday,
    quizzesMaxToday,
  };
});

export const deleteQuizFn = createServerFn({ method: "POST" })
  .validator(z.object({ quizId: z.string().uuid() }))
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

    const { data: quiz } = await supabaseAdmin
      .from("quizzes")
      .select("id, user_id")
      .eq("id", data.quizId)
      .maybeSingle();

    if (!quiz || quiz.user_id !== userId) {
      throw new Error("Quiz not found");
    }

    await supabaseAdmin.from("quiz_attempts").delete().eq("quiz_id", data.quizId);
    await supabaseAdmin.from("quizzes").delete().eq("id", data.quizId);

    return { success: true };
  });
