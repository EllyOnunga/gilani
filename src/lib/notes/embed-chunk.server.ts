import { withTimeout } from "@/lib/async";
import { createGoogleAiProvider } from "@/lib/ai-gateway.server";

/**
 * Embeds a single chunk. Kept as one-chunk-per-call (rather than batching)
 * to fit each pipeline step inside Vercel Hobby's fixed 10s function limit.
 */
export async function embedChunk(text: string): Promise<number[]> {
  const gateway = createGoogleAiProvider();
  const { embed } = await import("ai");
  const model = gateway.textEmbeddingModel();

  const result = await withTimeout(
    embed({
      model: model as any,
      value: text,
      maxRetries: 1,
      providerOptions: { google: { outputDimensionality: 768 } },
    } as any),
    60000,
    "Embedding generation timed out",
  );

  return (result as any).embedding as number[];
}
