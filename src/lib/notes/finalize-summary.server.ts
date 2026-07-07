import { z } from "zod";
import { withTimeout } from "@/lib/async";
import { createGoogleAiProvider } from "@/lib/ai-gateway.server";

const FinalSummarySchema = z.object({
  summary: z
    .string()
    .describe(
      "A single cohesive markdown summary merging all the segment summaries below into one " +
        "well-organized document. Preserve everything — do not drop content for brevity. " +
        "Remove only literal duplication between segments; reorganize with clear headings.",
    ),
  key_concepts: z
    .array(z.string())
    .describe(
      "The deduplicated, complete list of every keyword/concept across all segments.",
    ),
});

/**
 * Merges per-chunk summaries into one cohesive final document. This is fast
 * because the input is already-condensed partial summaries, not the raw
 * source text — keeping it well within the 10s Hobby-tier function limit.
 */
export async function finalizeSummary(
  partialSummaries: string[],
  allKeyConcepts: string[],
): Promise<{ summary: string; keyConcepts: string[] }> {
  const gateway = createGoogleAiProvider();
  const { generateObject } = await import("ai");

  const prompt = [
    "Merge the following segment summaries (from one document, in order) into a single " +
      "cohesive, well-organized markdown summary. Do not drop any content — every segment's " +
      "material must be represented in the final result.",
    "--- SEGMENT SUMMARIES ---",
    partialSummaries.map((s, i) => `## Segment ${i + 1}\n${s}`).join("\n\n"),
    "--- ALL KEY CONCEPTS COLLECTED SO FAR ---",
    allKeyConcepts.join(", "),
  ].join("\n\n");

  const result = await withTimeout(
    generateObject({
      model: gateway.chatModel() as any,
      schema: FinalSummarySchema,
      prompt,
    } as any),
    30000,
    "Summary finalization timed out",
  );

  const obj = (result as any).object as z.infer<typeof FinalSummarySchema>;
  return { summary: obj.summary, keyConcepts: obj.key_concepts };
}
