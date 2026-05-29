import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Lovable AI Gateway provider (OpenAI-compatible). Reads LOVABLE_API_KEY from env.
 * Usage:
 *   const gateway = createLovableAiGatewayProvider();
 *   const model = gateway.chatModel("google/gemini-2.5-flash");
 *   const embed = gateway.textEmbeddingModel("google/text-embedding-004");
 */
export const createLovableAiGatewayProvider = (lovableApiKey?: string) => {
  const apiKey = lovableApiKey || process.env.LOVABLE_API_KEY || "";

  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

  return {
    chatModel: (modelId?: string) => provider(modelId || "google/gemini-2.5-flash"),
    textEmbeddingModel: (modelId?: string) =>
      provider.textEmbeddingModel(modelId || "google/text-embedding-004"),
  };
};
