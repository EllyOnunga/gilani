import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const createLovableAiGatewayProvider = (lovableApiKey?: string) => {
  const apiKey = process.env.GEMINI_API_KEY || lovableApiKey || process.env.LOVABLE_API_KEY;
  
  const google = createGoogleGenerativeAI({
    apiKey: apiKey || "",
  });

  return {
    chatModel: (_modelId?: string) => google("gemini-1.5-flash"),
    textEmbeddingModel: (_modelId?: string) => google.textEmbeddingModel("text-embedding-004"),
  };
};

