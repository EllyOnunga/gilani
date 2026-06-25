import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { checkPlanRateLimit } from "@/lib/rate-limit.server";
import { buildNotesPrompt } from "@/lib/notes-prompt";
import { sanitizeUntrustedInput } from "@/lib/tutor-prompt";
import { z } from "zod";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Note = {
  id: string;
  title: string;
  summary?: string | null;
  key_concepts?: string[] | null;
  created_at?: string | null;
};

interface StudyMaterialResponse {
  title: string;
  type: "study_notes" | "question_paper";
  subject: string;
  topic: string;
  form_level: string;
  comprehensive_summary: string;
  summary?: string;
  key_concepts: Array<{ concept: string; definition: string; importance: string }>;
  formulas_and_equations: Array<{ name: string; expression: string; explanation: string }>;
  solutions?: Array<{
    question_number: number;
    question_text: string;
    solution: string;
    marks_breakdown: string;
    common_mistakes: string;
    alternative_approach?: string;
  }>;
  study_tips: string[];
  common_exam_questions: string[];
  related_topics: string[];
  recommended_resources: Array<{
    name: string;
    type: string;
    description: string;
    link?: string;
  }>;
  quick_review_cards: Array<{ front: string; back: string }>;
  safety_warning?: string | null;
}

// ─── JSON Repair Helper ───────────────────────────────────────────────────────

function repairAndParseJson(raw: string): any {
  let s = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  s = s.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }

  s = s.split("\n").map((line) => {
    const quoteMatch = line.match(/^(\s*"daily_quote"\s*:\s*")(.*)"\s*[—–-]\s*([^",]+)(\s*,?\s*)$/);
    if (quoteMatch) {
      const prefix = quoteMatch[1];
      const quoteText = quoteMatch[2];
      const author = quoteMatch[3].trim();
      const suffix = quoteMatch[4];
      return `${prefix}${quoteText} — ${author}"${suffix}`;
    }
    return line;
  }).join("\n");

  s = s.split("\n").map((line) => {
    const match = line.match(/^(\s*"[a-zA-Z_0-9]+"\s*:\s*")(.*)("\s*,?\s*)$/);
    if (match) {
      const prefix = match[1];
      const val = match[2];
      const suffix = match[3];
      const escapedVal = val.replace(/(?<!\\)"/g, '\\"');
      return prefix + escapedVal + suffix;
    }
    return line;
  }).join("\n");

  s = s.replace(/,\s*([}\]])/g, "$1");
  s = s.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
    return match.replace(/\\(\\|"|n|r|t|u[0-9a-fA-F]{4})|\\/g, (m, g1) => {
      if (g1) return m;
      return "\\\\";
    });
  });

  s = s.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
    return match.replace(/\r\n/g, "\\n").replace(/\r/g, "\\n").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  });

  try {
    return JSON.parse(s);
  } catch (err: any) {
    const cleaned = s.replace(/[^\x20-\x7E\n\r\t]/g, (ch) => {
      const code = ch.charCodeAt(0);
      return code > 127 ? ch : "";
    });
    try {
      return JSON.parse(cleaned);
    } catch (finalErr: any) {
      console.error("[JSON Repair] Failed to parse repaired JSON string!");
      console.error("[JSON Repair] Error message:", finalErr.message);
      return {
        title: "Document Summary",
        type: "study_notes" as const,
        subject: "",
        topic: "",
        form_level: "",
        comprehensive_summary: "We encountered a formatting issue while processing your document. Please try uploading again.",
        key_concepts: [],
        formulas_and_equations: [],
        solutions: [],
        study_tips: ["Try re-uploading the document if this summary appears incomplete."],
        common_exam_questions: [],
        related_topics: [],
        recommended_resources: [],
        quick_review_cards: [],
        safety_warning: null,
      };
    }
  }
}

// ─── Server Functions ──────────────────────────────────────────────────────────

export const listNotes = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  let authResult;
  try {
    authResult = await authenticateRequest(request);
  } catch (err) {
    throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
  }
  const userId = authResult.userId;

  const { data: notes, error } = await supabaseAdmin
    .from("notes")
    .select("id, title, summary, key_concepts, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return notes ?? [];
});

export const ingestNote = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    title: z.string(),
    heading: z.string(),
    subheading: z.string(),
    content: z.string(),
  }))
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;

    const rlNotes = await checkPlanRateLimit(userId, "notes");
    if (!rlNotes.allowed) {
      const s = Math.ceil(rlNotes.retryAfterMs / 1000);
      throw new Error(
        rlNotes.isDaily
          ? `Daily notes ingest limit reached for your ${rlNotes.plan} plan. Resets in ${s}s.`
          : `Rate limit exceeded. Please try again in ${s}s.`
      );
    }

    const title = sanitizeUntrustedInput(data.title || "");
    const heading = data.heading ? sanitizeUntrustedInput(data.heading) : "";
    const subheading = data.subheading ? sanitizeUntrustedInput(data.subheading) : "";
    const content = sanitizeUntrustedInput(data.content || "");
    if (!title.trim() || !content.trim()) {
      throw new Error("Title and content are required");
    }

    const { generateText } = await import("ai");
    const models = createLovableAiGatewayProvider().getAllChatModels("gemini-3.5-flash");
    if (models.length === 0) throw new Error("No AI providers are configured.");

    let parsed: StudyMaterialResponse | null = null;
    let lastError: unknown;

    for (let i = 0; i < models.length; i++) {
      const { model, name } = models[i];
      try {
        if (i > 0) {
          const { backoffDelay } = await import("@/lib/provider-backoff");
          await backoffDelay(i);
        }
        // Groq/OpenAI-compatible models don't reliably follow "return only
        // JSON" prompt instructions on their own — force JSON Object Mode at
        // the API level so the response is guaranteed to be valid JSON,
        // rather than relying on repairAndParseJson's text-cleanup fallback.
        const jsonModeProviderOptions =
          name === "groq" || name === "openai" || name === "mistral"
            ? { [name]: { response_format: { type: "json_object" } } }
            : undefined;

        const result = await generateText({
          model: model as any,
          maxTokens: 4000,
          prompt: buildNotesPrompt({ title, heading, subheading, content }),
          ...(jsonModeProviderOptions ? { providerOptions: jsonModeProviderOptions } : {}),
        } as any);
        const textResult = result.text.trim();
        if (textResult) {
          parsed = repairAndParseJson(textResult) as StudyMaterialResponse;
          break;
        }
      } catch (err) {
        console.warn(`[Notes] Model ${name} failed:`, err);
        lastError = err;
      }
    }

    if (!parsed) {
      throw lastError || new Error("Failed to generate and parse notes with all configured providers.");
    }

    const summary = parsed.comprehensive_summary || parsed.summary || "";
    const keyConcepts = Array.isArray(parsed.key_concepts)
      ? parsed.key_concepts.map((kc) => typeof kc === "string" ? kc : `${kc.concept}: ${kc.definition}`)
      : [];

    const { data: note, error: noteErr } = await supabaseAdmin
      .from("notes")
      .insert({ title, raw_text: content, summary, key_concepts: keyConcepts, user_id: userId })
      .select()
      .single();

    if (noteErr) throw new Error(noteErr.message);

    const chunkSize = 2000;
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      const segment = content.slice(i, i + chunkSize);
      const fullChunkText = `Note Title: ${title}${heading ? `\nHeading: ${heading}` : ""}${subheading ? `\nSubheading: ${subheading}` : ""}\n---\n${segment}`;
      chunks.push(fullChunkText);
    }

    const chunkData: any[] = [];
    const concurrencyLimit = 3;
    const INTER_BATCH_DELAY_MS = 500;
    for (let i = 0; i < chunks.length; i += concurrencyLimit) {
      const batch = chunks.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async (chunkText, batchIdx) => {
        const index = i + batchIdx;
        let embedding: number[] | null = null;
        let retries = 3;
        let delayMs = 1000;

        while (retries > 0) {
          try {
            const { embed } = await import("ai");
            const embeddingModel = createLovableAiGatewayProvider().textEmbeddingModel();
            const res = await embed({
              model: embeddingModel,
              value: chunkText,
              providerOptions: { google: { outputDimensionality: 768 } },
              maxRetries: 0,
            });
            embedding = res.embedding;
            break;
          } catch (err) {
            retries--;
            if (retries === 0) {
              console.error(`[Embedding] Failed for chunk ${index} after all retries.`);
              break;
            }
            await new Promise((res) => setTimeout(res, delayMs + Math.random() * 200));
            delayMs *= 2;
          }
        }

        return {
          note_id: (note as any).id,
          content: chunkText,
          user_id: userId,
          embedding: embedding ? JSON.stringify(embedding) : null,
        };
      });
      const batchResults = await Promise.all(batchPromises);
      chunkData.push(...batchResults);
      if (i + concurrencyLimit < chunks.length) await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
    }

    const { error: chunksErr } = await supabaseAdmin.from("note_chunks").insert(chunkData);
    if (chunksErr) {
      console.error("Failed to bulk insert note chunks:", chunksErr);
      throw new Error(`Failed to save note chunks: ${chunksErr.message}`);
    }

    return note as any;
  });

export const saveNoteOnly = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    title: z.string(),
    heading: z.string(),
    subheading: z.string(),
    content: z.string(),
  }))
  .handler(async ({ data }) => {
    const request = getRequest();
    let authResult;
    try {
      authResult = await authenticateRequest(request);
    } catch (err) {
      throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
    }
    const userId = authResult.userId;

    const rlNotes = await checkPlanRateLimit(userId, "notes");
    if (!rlNotes.allowed) {
      const s = Math.ceil(rlNotes.retryAfterMs / 1000);
      throw new Error(
        rlNotes.isDaily
          ? `Daily notes ingest limit reached for your ${rlNotes.plan} plan. Resets in ${s}s.`
          : `Rate limit exceeded. Please try again in ${s}s.`
      );
    }

    const title = sanitizeUntrustedInput(data.title || "");
    const heading = data.heading ? sanitizeUntrustedInput(data.heading) : "";
    const subheading = data.subheading ? sanitizeUntrustedInput(data.subheading) : "";
    const content = sanitizeUntrustedInput(data.content || "");
    if (!title.trim() || !content.trim()) throw new Error("Title and content are required");

    const { data: note, error: noteErr } = await supabaseAdmin
      .from("notes")
      .insert({ title, raw_text: content, summary: null, key_concepts: [], user_id: userId })
      .select()
      .single();
    if (noteErr) throw new Error(noteErr.message);

    const chunkSize = 2000;
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      const segment = content.slice(i, i + chunkSize);
      const fullChunkText = `Note Title: ${title}${heading ? `\nHeading: ${heading}` : ""}${subheading ? `\nSubheading: ${subheading}` : ""}\n---\n${segment}`;
      chunks.push(fullChunkText);
    }

    const chunkData: any[] = [];
    const concurrencyLimit = 3;
    const INTER_BATCH_DELAY_MS = 500;
    for (let i = 0; i < chunks.length; i += concurrencyLimit) {
      const batch = chunks.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async (chunkText, batchIdx) => {
        const index = i + batchIdx;
        let embedding: number[] | null = null;
        let retries = 3;
        let delayMs = 1000;
        while (retries > 0) {
          try {
            const { embed } = await import("ai");
            const embeddingModel = createLovableAiGatewayProvider().textEmbeddingModel();
            const res = await embed({ model: embeddingModel, value: chunkText, maxRetries: 0, providerOptions: { google: { outputDimensionality: 768 } } });
            embedding = res.embedding;
            break;
          } catch (err) {
            retries--;
            if (retries === 0) { console.error(`[Embedding] Failed for chunk ${index} after all retries.`, err); break; }
            await new Promise((res) => setTimeout(res, delayMs + Math.random() * 200));
            delayMs *= 2;
          }
        }
        return { note_id: (note as any).id, content: chunkText, user_id: userId, embedding: embedding ? JSON.stringify(embedding) : null };
      });
      const batchResults = await Promise.all(batchPromises);
      chunkData.push(...batchResults);
      if (i + concurrencyLimit < chunks.length) await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
    }

    const { error: chunksErr } = await supabaseAdmin.from("note_chunks").insert(chunkData);
    if (chunksErr) throw new Error(`Failed to save note chunks: ${chunksErr.message}`);

    return note as any;
  });