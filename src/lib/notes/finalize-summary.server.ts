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
    .describe("The deduplicated, complete list of every keyword/concept across all segments."),
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
    `You are an expert educational editor. Your job is to merge ${partialSummaries.length} segment summaries (from one document, in order) into a single, polished, complete study guide in markdown format.`,

    `--- MERGE RULES ---`,
    `1. COMPLETE COVERAGE: Every piece of content from every segment must be present in the final output. Do NOT drop anything for brevity. This is a study document — completeness is essential.`,
    `2. ELIMINATE DUPLICATION: If the same concept, definition, or formula appears in multiple segments, include it only once in the most logical place.`,
    `3. LOGICAL STRUCTURE: Organise the final document with clear ## headings and ### sub-headings that group related content together, regardless of what segment it came from.`,
    `4. PRESERVE ALL MATH & SCIENCE: Every formula, equation, unit, and chemical formula MUST remain in LaTeX ($...$). Do NOT convert any LaTeX back to plain text.`,
    `5. PRESERVE ALL TABLES: If any segment contains a markdown table, keep it intact and properly formatted.`,
    `6. DEFINITIONS FIRST: In each section, lead with the key definitions before explanations and examples.`,
    `7. WORKED EXAMPLES LAST: Collect all worked examples and practice questions at the end of each section or in a dedicated "## Worked Examples" section.`,
    `8. ADD A GLOSSARY: At the very end, append a "## Key Concepts Glossary" section — a clean alphabetically-sorted list of all key concepts with one-line definitions.`,
    `9. DO NOT ADD EXTERNAL CONTENT: Only use material from the segment summaries and key concepts listed below. Do not invent or add anything not in the source.`,

    `--- SEGMENT SUMMARIES ---`,
    partialSummaries.map((s, i) => `### Segment ${i + 1}\n${s}`).join("\n\n"),

    `--- ALL KEY CONCEPTS COLLECTED ---`,
    allKeyConcepts.join(", "),
  ].join("\n\n");

  const result = await withTimeout(
    generateObject({
      model: gateway.chatModel() as any,
      schema: FinalSummarySchema,
      prompt,
    } as any),
    300000,
    "Summary finalization timed out",
  );

  const obj = (result as any).object as z.infer<typeof FinalSummarySchema>;
  return { summary: obj.summary, keyConcepts: obj.key_concepts };
}
