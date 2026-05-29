import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Creates a Google Generative AI provider using GEMINI_API_KEY.
 * Drop-in replacement for the old Lovable AI Gateway provider.
 *
 * Usage:
 *   const gateway = createGoogleAiProvider();
 *   const model = gateway.chatModel("gemini-1.5-flash");
 *   const embed = gateway.textEmbeddingModel();
 */
export const createGoogleAiProvider = (apiKey?: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY || "";
  const google = createGoogleGenerativeAI({ apiKey: key });

  return {
    chatModel: (modelId?: string) => {
      let cleanModelId = modelId ? modelId.replace(/^google\//, "") : "gemini-2.0-flash";
      // Remap deprecated / unavailable models to current stable Gemini 2.0 Flash
      if (
        cleanModelId === "gemini-1.5-flash" ||
        cleanModelId === "gemini-1.5-flash-latest" ||
        cleanModelId.includes("2.5-flash")
      ) {
        cleanModelId = "gemini-2.0-flash";
      }
      return google(cleanModelId);
    },
    textEmbeddingModel: (modelId?: string) => {
      const cleanModelId = modelId ? modelId.replace(/^google\//, "") : "text-embedding-004";
      return google.textEmbeddingModel(cleanModelId);
    },
  };
};

/**
 * @deprecated Use createGoogleAiProvider instead.
 * Kept for backward compatibility — delegates to createGoogleAiProvider.
 */
export const createLovableAiGatewayProvider = createGoogleAiProvider;
