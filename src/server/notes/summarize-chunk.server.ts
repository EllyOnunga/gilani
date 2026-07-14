import { z } from "zod";
import { withTimeout } from "@/shared/utils/async";
import { createGoogleAiProvider } from "@/server/ai-gateway.server";

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
    `You are an expert educational content analyst processing segment ${chunkIndex + 1} of ${totalChunks} from a student's notes or textbook.`,
    `Your goal: produce an exhaustive, well-structured markdown reorganization of ONLY this segment. Another pass will merge all segments — focus purely on this one.`,

    `--- CONTENT RULES ---`,
    `1. PRESERVE EVERYTHING: Every keyword, definition, formula, equation, law, reaction, diagram description, example, and worked solution must appear in your output. This is lossless restructuring, not compression.`,
    `2. IMPROVE STRUCTURE: Reorganize the content into clear markdown sections with ## headings and ### sub-headings. Use bullet points for lists, numbered lists for steps.`,
    `3. MATH & SCIENCE FORMATTING: All formulas, equations, units, and chemical formulas MUST be formatted in LaTeX with dollar signs. Examples:`,
    `   - Write "$F = ma$" not "F=ma"`,
    `   - Write "$v = u + at$" not "v=u+at"`,
    `   - Write "$\\ce{H2SO4}$" not "H2SO4"`,
    `   - Write "$\\frac{m}{M_r}$" for fractions`,
    `   - Write "$\\Delta H = H_{products} - H_{reactants}$" for thermodynamics`,
    `4. DEFINITIONS: Format key term definitions as: **Term**: definition text.`,
    `5. DIAGRAMS & FIGURES: If the text describes a diagram, chart, table, or figure, reproduce its structure in markdown. Use a markdown table if it's tabular data. Describe labeled parts or flows clearly.`,
    `6. EXAMPLES & WORKED SOLUTIONS: Preserve every worked example with full steps. Keep all given values, working, and answers.`,
    `7. DO NOT EDITORIALIZE: Do not add opinions, external content not in this segment, or anything not present in the original text. Stick to the source material.`,

    `--- SEGMENT TEXT ---`,
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
