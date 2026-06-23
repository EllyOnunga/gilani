import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { checkPlanRateLimit } from "@/lib/rate-limit.server";
import { buildQuizPrompt } from "@/lib/quiz-prompt";
import { sanitizeUntrustedInput } from "@/lib/tutor-prompt";
import { backoffDelay } from "@/lib/provider-backoff";
import { generateObject } from "ai";

// Suppress noisy AI SDK warnings (e.g. Groq's lack of strict JSON schema support)
if (typeof globalThis !== "undefined") {
    (globalThis as any).AI_SDK_LOG_WARNINGS = false;
}

// ─── Types & Constants ───────────────────────────────────────────────────────
export type CurriculumType = "KCSE" | "CBC" | "IGCSE";

export type MCQ = {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
    subtopic: string;
    curriculum: CurriculumType;
};

export const TOPICS = [
    "Mathematics — Algebra",
    "Mathematics — Geometry",
    "Mathematics — Calculus",
    "Biology — Photosynthesis",
    "Biology — Cell Division",
    "Biology — Genetics",
    "Chemistry — Periodic Table",
    "Chemistry — Acids & Bases",
    "Chemistry — Organic Chemistry",
    "Physics — Mechanics",
    "Physics — Electricity",
    "Physics — Waves",
    "History & Government",
    "Geography — Physical Features",
    "Geography — Human Geography",
    "English — Grammar",
    "English — Comprehension",
    "Kiswahili — Fasihi",
    "Kiswahili — Sarufi",
    "Computer Studies",
    "Business Studies",
    "Agriculture",
    "Home Science",
    "Religious Education (CRE/IRE)",
];

// ─── Server Functions ────────────────────────────────────────────────────────
export const generateQuiz = createServerFn({ method: "POST" })
    .inputValidator(
        z.object({
            topic: z.string(),
            count: z.number(),
            curriculum: z.enum(["KCSE", "CBC", "IGCSE"]),
        }),
    )
    .handler(async ({ data }) => {
        const request = getRequest();
        let authResult;
        try {
            authResult = await authenticateRequest(request);
        } catch (err) {
            throw new Error(
                err instanceof Response ? (await err.json()).error : "Unauthorized",
            );
        }
        const userId = authResult.userId;

        const rlQuiz = await checkPlanRateLimit(userId, "quiz");
        if (!rlQuiz.allowed) {
            const s = Math.ceil(rlQuiz.retryAfterMs / 1000);
            throw new Error(
                rlQuiz.isDaily
                    ? `Daily quiz limit reached for your ${rlQuiz.plan} plan. Resets in ${s}s.`
                    : `Rate limit exceeded. Please try again in ${s}s.`,
            );
        }

        const topic = sanitizeUntrustedInput(data.topic || "");
        const { count, curriculum } = data;
        if (!topic.trim()) throw new Error("Topic is required");
        if (count < 1 || count > 50)
            throw new Error("Question count must be between 1 and 50");

        const gateway = createLovableAiGatewayProvider();
        const models = gateway.getAllChatModels();

        let object: any = null;
        let lastError: any = null;

        for (let i = 0; i < models.length; i++) {
            const { model } = models[i];
            try {
                if (i > 0) await backoffDelay(i);
                console.log(
                    `[Quiz Generation] Attempting with model: ${model.provider}/${model.modelId}`,
                );
                const result = await generateObject({
                    model,
                    maxRetries: 1,
                    schema: z.object({
                        questions: z.array(
                            z.object({
                                question: z.string(),
                                options: z.array(z.string()).min(4).max(4),
                                correct: z.union([z.number(), z.string()]).optional(),
                                answer: z.union([z.number(), z.string()]).optional(),
                                explanation: z.string().optional().default(""),
                                difficulty: z
                                    .enum(["easy", "medium", "hard"])
                                    .optional()
                                    .default("medium"),
                                subtopic: z.string().optional().default(""),
                                curriculum: z.string().optional().default(""),
                            }),
                        ),
                    }),
                    prompt: buildQuizPrompt({ topic, count, curriculum }),
                    temperature: 0.15,
                });
                object = result.object;
                if (object && Array.isArray(object.questions) && object.questions.length > 0) {
                    console.log(
                        `[Quiz Generation] Success with model: ${model.provider}/${model.modelId}`,
                    );
                    break;
                }
            } catch (err) {
                console.warn(
                    `[Quiz Generation] Model ${model.provider}/${model.modelId} failed:`,
                    err,
                );
                lastError = err;
            }
        }

        if (!object) {
            console.error("[Quiz Generation] All models failed:", lastError);
            throw new Error("Failed to generate quiz. Please try again later.");
        }

        const resolveCorrectIndex = (raw: any): number => {
            if (typeof raw === "number" && raw >= 0 && raw <= 3) return raw;
            if (typeof raw === "string") {
                const map: Record<string, number> = {
                    A: 0,
                    B: 1,
                    C: 2,
                    D: 3,
                    "0": 0,
                    "1": 1,
                    "2": 2,
                    "3": 3,
                };
                const result = map[raw.trim().toUpperCase()];
                if (result !== undefined) return result;
            }
            console.warn(
                `[Quiz] Could not resolve correct index from:`,
                raw,
                "— defaulting to 0",
            );
            return 0;
        };

        const questions: MCQ[] = (object.questions || []).map((q: any) => {
            const rawCorrect = q.correct ?? q.answer;
            return {
                question: q.question,
                options: q.options,
                correct: resolveCorrectIndex(rawCorrect),
                explanation: q.explanation ?? "",
                difficulty: (q.difficulty ?? "medium") as "easy" | "medium" | "hard",
                subtopic: q.subtopic || topic,
                curriculum: (q.curriculum || curriculum) as CurriculumType,
            };
        });

        if (questions.length === 0) {
            throw new Error("No questions were generated by the AI agent.");
        }

        // Server-side answer integrity check
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const correctOption = q.options[q.correct] ?? "";
            const expl = q.explanation ?? "";
            const plainOption = correctOption
                .replace(/\$[^$]*\$/g, "")
                .replace(/\s+/g, " ")
                .trim();
            if (plainOption.length > 2 && expl && !expl.includes(plainOption)) {
                console.warn(
                    `[Quiz QA] Q${i + 1}: explanation may not match correct option.`,
                );
            }
        }

        const { data: quiz, error } = await supabaseAdmin
            .from("quizzes")
            .insert({
                topic: `${topic} (${curriculum})`,
                questions: questions as any,
                difficulty: "medium",
                user_id: userId,
            })
            .select()
            .single();

        if (error) {
            console.error("Failed to persist generated quiz:", error);
            throw new Error("Failed to save generated quiz: " + error.message);
        }

        return { quizId: quiz.id, questions };
    });

export const saveAttempt = createServerFn({ method: "POST" })
    .inputValidator(
        z.object({
            quizId: z.string(),
            score: z.number(),
            answers: z.any(),
            weakTopics: z.array(z.string()),
        }),
    )
    .handler(async ({ data }) => {
        const request = getRequest();
        let authResult;
        try {
            authResult = await authenticateRequest(request);
        } catch (err) {
            throw new Error(
                err instanceof Response ? (await err.json()).error : "Unauthorized",
            );
        }
        const userId = authResult.userId;
        const { quizId, score, answers, weakTopics } = data;
        const { error } = await supabaseAdmin.from("quiz_attempts").insert({
            user_id: userId,
            quiz_id: quizId,
            score,
            answers: answers as any,
            weak_topics: weakTopics as any,
        });
        if (error) {
            console.error("Failed to save quiz attempt:", error);
            throw new Error(error.message);
        }
    });