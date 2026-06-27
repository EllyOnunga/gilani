// scripts/backfill-embeddings.ts
//
// One-off backfill: re-embeds every note_chunks row where embedding IS NULL,
// using the now-fixed pipeline (768-dim, RETRIEVAL_DOCUMENT task type).
//
// Run with:
//   npx tsx --env-file=.env scripts/backfill-embeddings.ts
//
// Safe to re-run: it only ever selects rows where embedding IS NULL, so if
// it's interrupted partway through, just run it again — it picks up where
// it left off instead of redoing already-fixed rows.

import { embed } from "ai";
import { createGoogleAiProvider } from "../src/lib/ai-gateway.server";
import { supabaseAdmin } from "../src/integrations/supabase/client.server";

const BATCH_SIZE = 50; // rows fetched per round-trip
const CONCURRENCY = 3; // simultaneous embed() calls, matches existing app code
const INTER_BATCH_DELAY_MS = 500;
const MAX_RETRIES = 3;

async function embedWithRetry(content: string, label: string): Promise<number[] | null> {
  const provider = createGoogleAiProvider();
  const model = provider.textEmbeddingModel();
  let retries = MAX_RETRIES;
  let delayMs = 1000;

  while (retries > 0) {
    try {
      const { embedding } = await embed({
        model,
        value: content,
        maxRetries: 0,
        providerOptions: {
          google: {
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: 768,
          },
        },
      });
      return embedding;
    } catch (err) {
      retries--;
      console.warn(
        `[Backfill] ${label} failed (attempt ${MAX_RETRIES - retries}/${MAX_RETRIES}):`,
        (err as Error)?.message ?? err,
      );
      if (retries === 0) return null;
      await new Promise((r) => setTimeout(r, delayMs + Math.random() * 200));
      delayMs *= 2;
    }
  }
  return null;
}

async function run() {
  let totalProcessed = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  const failedIds: string[] = [];

  const { count: totalRemaining } = await supabaseAdmin
    .from("note_chunks")
    .select("id", { count: "exact", head: true })
    .is("embedding", null);

  console.log(`[Backfill] ${totalRemaining ?? "unknown"} chunks need embeddings.\n`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: rows, error } = await supabaseAdmin
      .from("note_chunks")
      .select("id, content")
      .is("embedding", null)
      .limit(BATCH_SIZE);

    if (error) {
      console.error("[Backfill] Failed to fetch batch:", error);
      break;
    }
    if (!rows || rows.length === 0) {
      console.log("[Backfill] No more rows with null embedding. Done.");
      break;
    }

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const slice = rows.slice(i, i + CONCURRENCY);
      await Promise.all(
        slice.map(async (row) => {
          totalProcessed++;
          const label = `chunk ${row.id}`;
          const embedding = await embedWithRetry(row.content, label);

          if (!embedding) {
            totalFailed++;
            failedIds.push(row.id);
            console.error(`[Backfill] ✗ ${label} — giving up after ${MAX_RETRIES} retries.`);
            return;
          }

          const { error: updateErr } = await supabaseAdmin
            .from("note_chunks")
            .update({ embedding: JSON.stringify(embedding) })
            .eq("id", row.id);

          if (updateErr) {
            totalFailed++;
            failedIds.push(row.id);
            console.error(
              `[Backfill] ✗ ${label} — embedded but failed to save:`,
              updateErr.message,
            );
            return;
          }

          totalSucceeded++;
          console.log(`[Backfill] ✓ ${label} (${totalProcessed}/${totalRemaining ?? "?"})`);
        }),
      );
      await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
    }
  }

  console.log("\n[Backfill] ── Summary ──");
  console.log(`  Processed: ${totalProcessed}`);
  console.log(`  Succeeded: ${totalSucceeded}`);
  console.log(`  Failed:    ${totalFailed}`);
  if (failedIds.length > 0) {
    console.log(`  Failed chunk IDs (for manual review):`);
    console.log(`  ${failedIds.join(", ")}`);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[Backfill] Fatal error:", err);
    process.exit(1);
  });
