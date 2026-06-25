import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { checkPlanRateLimit } from "@/lib/rate-limit.server";
import { buildPlannerPrompt } from "@/lib/planner-prompt";
import { sanitizeUntrustedInput } from "@/lib/tutor-prompt";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CurriculumType = "KCSE" | "CBC" | "IGCSE" | "MIXED";

export interface PlanTask {
    id: string;
    date: string;
    subject: string;
    topic: string;
    curriculum: CurriculumType | "BOTH";
    task: string;
    duration: string;
    priority: "high" | "medium" | "low";
    type: "theory" | "practice" | "revision" | "past_paper" | "project";
    study_tip?: string;
    tags?: string[];
}

export interface PlanMetadata {
    start_date: string;
    end_date: string;
    total_tasks: number;
    curriculum: string;
    curriculum_details: {
        type: CurriculumType;
        specific_requirements: string;
    };
    focus_areas: string[];
    weekly_goal: string;
    estimated_weekly_hours: string;
}

export interface DailyPlan {
    date: string;
    day_of_week: string;
    daily_focus: string;
    curriculum_focus: CurriculumType;
    tasks: PlanTask[];
    daily_quote?: string;
}

export interface WeeklyPlanResponse {
    plan_metadata: PlanMetadata;
    daily_plans: DailyPlan[];
    flexible_tasks?: PlanTask[];
}

export interface StudyPlan {
    id: string;
    exam_name: string;
    items: PlanTask[];
    plan_metadata?: PlanMetadata;
    daily_plans?: DailyPlan[];
    created_at: string;
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function convertToStudyPlan(data: any): StudyPlan | null {
    if (!data) return null;

    let items: PlanTask[] = [];
    let planMetadata: PlanMetadata | undefined;
    let dailyPlans: DailyPlan[] | undefined;

    try {
        if (data.items) {
            const parsedItems = typeof data.items === "string" ? JSON.parse(data.items) : data.items;

            if (parsedItems && typeof parsedItems === "object" && !Array.isArray(parsedItems)) {
                if (parsedItems.items && Array.isArray(parsedItems.items)) {
                    items = parsedItems.items;
                    planMetadata = parsedItems.plan_metadata;
                    dailyPlans = parsedItems.daily_plans;
                }
            } else if (Array.isArray(parsedItems)) {
                items = parsedItems;
            }
        }
    } catch (e) {
        console.error("Error parsing study plan items:", e);
    }

    return {
        id: data.id || "",
        exam_name: data.exam_name || "",
        items: items,
        plan_metadata: planMetadata,
        daily_plans: dailyPlans,
        created_at: data.created_at || new Date().toISOString(),
    };
}

function repairAndParseJson(raw: string): any {
    let s = raw.trim();
    s = s
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    const first = s.indexOf("{");
    const last = s.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
        s = s.slice(first, last + 1);
    }

    s = s
        .split("\n")
        .map((line) => {
            const quoteMatch = line.match(
                /^(\s*"daily_quote"\s*:\s*")(.*)"\s*[—–-]\s*([^",]+)(\s*,?\s*)$/,
            );
            if (quoteMatch) {
                const prefix = quoteMatch[1];
                const quoteText = quoteMatch[2];
                const author = quoteMatch[3].trim();
                const suffix = quoteMatch[4];
                return `${prefix}${quoteText} — ${author}"${suffix}`;
            }
            return line;
        })
        .join("\n");

    s = s
        .split("\n")
        .map((line) => {
            const match = line.match(/^(\s*"[a-zA-Z_0-9]+"\s*:\s*")(.*)("\s*,?\s*)$/);
            if (match) {
                const prefix = match[1];
                const val = match[2];
                const suffix = match[3];
                const escapedVal = val.replace(/(?<!\\)"/g, '\\"');
                return prefix + escapedVal + suffix;
            }
            return line;
        })
        .join("\n");

    s = s.replace(/,\s*([}\]])/g, "$1");

    s = s.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
        return match.replace(/\\(\\|"|n|r|t|b|f|u[0-9a-fA-F]{4})|\\/g, (m, g1) => {
            if (g1) return m;
            return "\\\\";
        });
    });

    try {
        return JSON.parse(s);
    } catch (err: any) {
        const cleaned = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
        try {
            return JSON.parse(cleaned);
        } catch (finalErr: any) {
            console.error("[JSON Repair] Failed to parse repaired JSON string!");
            console.error("[JSON Repair] Error:", finalErr.message);
            throw finalErr;
        }
    }
}

// ─── Server Functions ──────────────────────────────────────────────────────────

export const loadPlan = createServerFn({ method: "GET" }).handler(async () => {
    const request = getRequest();
    let authResult;
    try {
        authResult = await authenticateRequest(request);
    } catch (err) {
        throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;
    const { data } = await supabaseAdmin
        .from("study_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return convertToStudyPlan(data);
});

export const generatePlan = createServerFn({ method: "POST" }).handler(async () => {
    const request = getRequest();
    let authResult;
    try {
        authResult = await authenticateRequest(request);
    } catch (err) {
        throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;

    const rlPlan = await checkPlanRateLimit(userId, "planner");
    if (!rlPlan.allowed) {
        const s = Math.ceil(rlPlan.retryAfterMs / 1000);
        throw new Error(
            rlPlan.isDaily
                ? `Daily planner limit reached for your ${rlPlan.plan} plan. Resets in ${s}s.`
                : `Rate limit exceeded. Please try again in ${s}s.`
        );
    }

    const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("curriculum")
        .eq("id", userId)
        .maybeSingle();

    const curriculum = profile?.curriculum || "KCSE";

    const { data: attempts } = await supabaseAdmin
        .from("quiz_attempts")
        .select("score, weak_topics")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

    const weakTopics: string[] = [];
    if (attempts) {
        for (const a of attempts) {
            if (Array.isArray(a.weak_topics)) {
                const sanitized = (a.weak_topics as string[]).map((t) => sanitizeUntrustedInput(t || ""));
                weakTopics.push(...sanitized);
            }
        }
    }

    const { generateText } = await import("ai");
    const models = createLovableAiGatewayProvider().getAllChatModels();
    if (models.length === 0) throw new Error("No AI providers are configured.");

    const today = new Date().toISOString().split("T")[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 6);
    const endDateStr = endDate.toISOString().split("T")[0];

    const prompt = buildPlannerPrompt({
        curriculum,
        today,
        endDate: endDateStr,
        weakTopics,
    });
    let weeklyPlan: WeeklyPlanResponse | null = null;
    let items: PlanTask[] = [];
    let lastError: unknown;

    for (let i = 0; i < models.length; i++) {
        const { model, name } = models[i];
        try {
            if (i > 0) {
                const { backoffDelay } = await import("@/lib/provider-backoff");
                await backoffDelay(i);
            }
            const result = await generateText({
                model: model as any,
                prompt: prompt,
                temperature: 0.4,
                maxTokens: 4000,
            } as any);

            const textResult = result.text.trim();
            if (textResult) {
                const parsed = repairAndParseJson(textResult);

                if (parsed.daily_plans && Array.isArray(parsed.daily_plans)) {
                    weeklyPlan = parsed as WeeklyPlanResponse;
                    items = weeklyPlan.daily_plans.flatMap((day) =>
                        day.tasks.map((task, idx) => ({
                            ...task,
                            date: task.date || day.date,
                            id:
                                task.id && task.id !== "task-1" && task.id !== "task-2"
                                    ? task.id
                                    : `${day.date}-task-${idx}-${crypto.randomUUID().slice(0, 8)}`,
                        })),
                    );
                } else if (Array.isArray(parsed)) {
                    items = parsed;
                    weeklyPlan = {
                        plan_metadata: {
                            start_date: today,
                            end_date: endDateStr,
                            total_tasks: items.length,
                            curriculum: curriculum,
                            curriculum_details: {
                                type: curriculum as CurriculumType,
                                specific_requirements: "Balanced study plan",
                            },
                            focus_areas: weakTopics.slice(0, 5),
                            weekly_goal: "Improve understanding in weak areas",
                            estimated_weekly_hours: `${Math.round(items.length * 0.75)} hours`,
                        },
                        daily_plans: [],
                    };
                } else {
                    throw new Error("Response schema does not align with valid structural patterns.");
                }

                break;
            }
        } catch (err) {
            console.warn(`[Planner] Model ${name} failed:`, err);
            lastError = err;
        }
    }

    if (!weeklyPlan || items.length === 0) {
        throw lastError || new Error("Failed to generate plan with all configured providers.");
    }

    const wrappedData = {
        items: items,
        plan_metadata: weeklyPlan.plan_metadata,
        daily_plans: weeklyPlan.daily_plans,
    };

    const { data: plan, error } = await supabaseAdmin
        .from("study_plans")
        .insert({
            user_id: userId,
            exam_name: weeklyPlan.plan_metadata.weekly_goal || "Weekly Personal Study Plan",
            items: wrappedData as any,
        })
        .select()
        .single();

    if (error) {
        console.error("Database error:", error);
        throw new Error(error.message);
    }

    return convertToStudyPlan(plan);
});