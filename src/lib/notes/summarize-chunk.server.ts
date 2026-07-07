import { z } from "zod";
import { withTimeout } from "@/lib/async";
import { createGoogleAiProvider } from "@/lib/ai-gateway.server";

const ChunkSummarySchema = z.object({
  summary: z
    .string()
    .describe(
      "A complete markdown restructuring of this text segment. Preserve every keyword, " +
        "definition, formula, and explanation — this is lossless reorganization for studying, " +
        "not compression. If the segment describes a diagram, chart, or figure, describe its " +
        "structure and labels in words.",
    ),
  key_concepts: z
    .array(z.string())
    .describe("Every important keyword or concept in this segment, as short standalone phrases."),
});

export interface ChunkSummaryResult {
  summary: string;
  keyConcepts: string[];
}

/**
 * Summarizes a single ~2000-char chunk. Kept deliberately small and fast
 * (single chunk, not the whole document) because this runs inside a Vercel
 * Hobby-tier serverless function with a hard 10-second ceiling — there's no
 * way to raise that limit, so each step in the pipeline must individually
 * fit comfortably within it.
 */
export async function summarizeChunk(
  chunkText: string,
  chunkIndex: number,
  totalChunks: number,
): Promise<ChunkSummaryResult> {
  const gateway = createGoogleAiProvider();
  const { generateObject } = await import("ai");

  const prompt = [
    `This is segment ${chunkIndex + 1} of ${totalChunks} from a larger document. Produce an ` +
      "exhaustive summary of just this segment — don't worry about the rest of the document, " +
      "another pass will merge all segments together afterward.",
    "Do not omit any keyword, explanation, formula, or described diagram from this segment.",
    "--- SEGMENT TEXT ---",
    chunkText,
  ].join("\n\n");

  const result = await withTimeout(
    generateObject({
      model: gateway.chatModel() as any,
      schema: ChunkSummarySchema,
      prompt,
    } as any),
    120000,
    "Chunk summarization timed out",
  );

  const obj = (result as any).object as z.infer<typeof ChunkSummarySchema>;
  return { summary: obj.summary, keyConcepts: obj.key_concepts };
}
