import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const createLovableAiGatewayProvider = (lovableApiKey?: string) => {
  const apiKey = process.env.GEMINI_API_KEY || lovableApiKey || process.env.LOVABLE_API_KEY;
  
  const google = createGoogleGenerativeAI({
    apiKey: apiKey || "",
  });

  const originalEmbeddingModel = google.textEmbeddingModel("gemini-embedding-001");

  const wrappedEmbeddingModel = {
    ...originalEmbeddingModel,
    doEmbed: async (params: any) => {
      const result = await originalEmbeddingModel.doEmbed(params);
      return {
        ...result,
        embeddings: result.embeddings.map((emb: number[]) => emb.slice(0, 768)),
      };
    },
  };

  return {
    chatModel: (modelId?: string) => google(modelId || "gemini-2.5-flash"),
    textEmbeddingModel: (modelId?: string) => wrappedEmbeddingModel as any,
  };
};

