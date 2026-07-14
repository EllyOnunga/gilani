import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

// Vercel Hobby's serverless functions have a hard, non-configurable 10s
// execution limit. There's no background job/queue infrastructure in this
// app, so the notes pipeline is split into several small client-orchestrated
// steps (create -> per-chunk process -> finalize) that each comfortably fit
// inside that ceiling, rather than one long synchronous request.
const MAX_RAW_TEXT_LENGTH = 16_000;

async function getAuthedUserId(request: Request): Promise<string> {
  try {
    const authResult = await authenticateRequest(request);
    return authResult.userId;
  } catch (err) {
    throw new Error(err instanceof Response ? (await err.json()).error : "Unauthorized");
  }
}

async function assertOwnsNote(noteId: string, userId: string): Promise<void> {
  const { data: note } = await supabaseAdmin
    .from("notes")
    .select("id, user_id")
    .eq("id", noteId)
    .maybeSingle();
  if (!note || note.user_id !== userId) {
    throw new Error("Note not found");
  }
}

/**
 * Step 1: creates the note row and returns the pre-split chunks for the
 * client to process one at a time. Fast — no AI calls here.
 */
export const createNote = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().trim().min(1).max(200),
      rawText: z.string().trim().min(1).max(MAX_RAW_TEXT_LENGTH),
      fileName: z.string().max(255).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/server/supabase");
    const { authenticateRequest } = await import("@/server/api-auth.server");
    const { checkPlanRateLimit } = await import("@/server/rate-limit.server");
    const { chunkText } = await import("@/server/notes/chunk-text");
    const { embedChunk } = await import("@/server/notes/embed-chunk.server");
    const { summarizeChunk } = await import("@/server/notes/summarize-chunk.server");
    const { finalizeSummary } = await import("@/server/notes/finalize-summary.server");
    const request = getRequest();
    const userId = await getAuthedUserId(request);

    const rateLimit = await checkPlanRateLimit(userId, "notes");
    if (!rateLimit.allowed) {
      const secs = Math.ceil(rateLimit.retryAfterMs / 1000);
      throw new Error(
        rateLimit.isDaily
          ? `Daily notes limit reached for your plan. Resets in ${secs}s.`
          : `Please slow down — try again in ${secs}s.`,
      );
    }

    const { title, rawText, fileName } = data;
    const chunks = chunkText(rawText);
    if (chunks.length === 0) {
      throw new Error("No usable text found to process");
    }

    const { data: noteRow, error: insertError } = await supabaseAdmin
      .from("notes")
      .insert({
        user_id: userId,
        title,
        raw_text: rawText,
        file_name: fileName ?? null,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertError || !noteRow) {
      throw new Error(insertError?.message || "Failed to create note");
    }

    return { noteId: noteRow.id as string, chunks };
  });

/**
 * Step 2 (called once per chunk, in sequence, by the client): embeds and
 * stores one chunk for RAG, and produces a partial summary for it. Each
 * call is independent and fast enough to fit the 10s ceiling on its own.
 */
export const processNoteChunk = createServerFn({ method: "POST" })
  .validator(
    z.object({
      noteId: z.string().uuid(),
      content: z.string().min(1),
      chunkIndex: z.number().int().min(0),
      totalChunks: z.number().int().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/server/supabase");
    const { authenticateRequest } = await import("@/server/api-auth.server");
    const { checkPlanRateLimit } = await import("@/server/rate-limit.server");
    const { chunkText } = await import("@/server/notes/chunk-text");
    const { embedChunk } = await import("@/server/notes/embed-chunk.server");
    const { summarizeChunk } = await import("@/server/notes/summarize-chunk.server");
    const { finalizeSummary } = await import("@/server/notes/finalize-summary.server");
    const request = getRequest();
    const userId = await getAuthedUserId(request);
    await assertOwnsNote(data.noteId, userId);

    const { content, chunkIndex, totalChunks, noteId } = data;

    const [embedding, chunkSummary] = await Promise.all([
      embedChunk(content).catch((err) => {
        console.error(`[Notes] Embedding failed for chunk ${chunkIndex} of note ${noteId}:`, err);
        return null;
      }),
      summarizeChunk(content, chunkIndex, totalChunks),
    ]);

    if (embedding) {
      const { error: chunkError } = await supabaseAdmin.from("note_chunks").insert({
        note_id: noteId,
        user_id: userId,
        content,
        embedding: `[${embedding.join(",")}]`,
      });
      if (chunkError) {
        // Non-fatal — the note can still show its summary even if RAG
        // retrieval for this particular chunk is degraded.
        console.error(`[Notes] Failed to store chunk ${chunkIndex}:`, chunkError.message);
      }
    }

    return { summary: chunkSummary.summary, keyConcepts: chunkSummary.keyConcepts };
  });

/**
 * Step 3: merges all partial summaries (collected client-side across the
 * processNoteChunk calls) into one cohesive final summary, and marks the
 * note ready.
 */
export const finalizeNote = createServerFn({ method: "POST" })
  .validator(
    z.object({
      noteId: z.string().uuid(),
      partialSummaries: z.array(z.string()).min(1),
      allKeyConcepts: z.array(z.string()),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/server/supabase");
    const { authenticateRequest } = await import("@/server/api-auth.server");
    const { checkPlanRateLimit } = await import("@/server/rate-limit.server");
    const { chunkText } = await import("@/server/notes/chunk-text");
    const { embedChunk } = await import("@/server/notes/embed-chunk.server");
    const { summarizeChunk } = await import("@/server/notes/summarize-chunk.server");
    const { finalizeSummary } = await import("@/server/notes/finalize-summary.server");
    const request = getRequest();
    const userId = await getAuthedUserId(request);
    await assertOwnsNote(data.noteId, userId);

    try {
      const { summary, keyConcepts } = await finalizeSummary(
        data.partialSummaries,
        data.allKeyConcepts,
      );

      await supabaseAdmin
        .from("notes")
        .update({ summary, key_concepts: keyConcepts as any, status: "ready" })
        .eq("id", data.noteId);

      return { status: "ready" as const, summary, keyConcepts };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Finalization failed";
      await supabaseAdmin
        .from("notes")
        .update({ status: "failed", error_message: message })
        .eq("id", data.noteId);
      throw new Error(message);
    }
  });

/**
 * Called by the client if processing is abandoned (e.g. repeated chunk
 * failures) so the note doesn't linger stuck in "processing" forever.
 */
export const markNoteFailed = createServerFn({ method: "POST" })
  .validator(z.object({ noteId: z.string().uuid(), errorMessage: z.string().max(500) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/server/supabase");
    const { authenticateRequest } = await import("@/server/api-auth.server");
    const { checkPlanRateLimit } = await import("@/server/rate-limit.server");
    const { chunkText } = await import("@/server/notes/chunk-text");
    const { embedChunk } = await import("@/server/notes/embed-chunk.server");
    const { summarizeChunk } = await import("@/server/notes/summarize-chunk.server");
    const { finalizeSummary } = await import("@/server/notes/finalize-summary.server");
    const request = getRequest();
    const userId = await getAuthedUserId(request);
    await assertOwnsNote(data.noteId, userId);

    await supabaseAdmin
      .from("notes")
      .update({ status: "failed", error_message: data.errorMessage })
      .eq("id", data.noteId);

    return { success: true };
  });

export const deleteNote = createServerFn({ method: "POST" })
  .validator(z.object({ noteId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/server/supabase");
    const { authenticateRequest } = await import("@/server/api-auth.server");
    const { checkPlanRateLimit } = await import("@/server/rate-limit.server");
    const { chunkText } = await import("@/server/notes/chunk-text");
    const { embedChunk } = await import("@/server/notes/embed-chunk.server");
    const { summarizeChunk } = await import("@/server/notes/summarize-chunk.server");
    const { finalizeSummary } = await import("@/server/notes/finalize-summary.server");
    const request = getRequest();
    const userId = await getAuthedUserId(request);
    await assertOwnsNote(data.noteId, userId);

    await supabaseAdmin.from("note_chunks").delete().eq("note_id", data.noteId);
    await supabaseAdmin.from("notes").delete().eq("id", data.noteId);

    return { success: true };
  });

/**
 * Restarts processing for a failed note using its already-stored raw_text —
 * no re-upload needed. Clears any partial chunks from the failed attempt
 * first to avoid duplicates, then returns fresh chunks for the client to
 * drive through processNoteChunk/finalizeNote again.
 */
export const retryNote = createServerFn({ method: "POST" })
  .validator(z.object({ noteId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/server/supabase");
    const { authenticateRequest } = await import("@/server/api-auth.server");
    const { checkPlanRateLimit } = await import("@/server/rate-limit.server");
    const { chunkText } = await import("@/server/notes/chunk-text");
    const { embedChunk } = await import("@/server/notes/embed-chunk.server");
    const { summarizeChunk } = await import("@/server/notes/summarize-chunk.server");
    const { finalizeSummary } = await import("@/server/notes/finalize-summary.server");
    const request = getRequest();
    const userId = await getAuthedUserId(request);

    const { data: note } = await supabaseAdmin
      .from("notes")
      .select("id, user_id, raw_text")
      .eq("id", data.noteId)
      .maybeSingle();

    if (!note || note.user_id !== userId) {
      throw new Error("Note not found");
    }
    if (!note.raw_text) {
      throw new Error("This note has no stored text to retry from — please delete and re-upload.");
    }

    const chunks = chunkText(note.raw_text);
    if (chunks.length === 0) {
      throw new Error("No usable text found to process");
    }

    await supabaseAdmin.from("note_chunks").delete().eq("note_id", data.noteId);
    await supabaseAdmin
      .from("notes")
      .update({ status: "processing", error_message: null })
      .eq("id", data.noteId);

    return { noteId: data.noteId, chunks };
  });
