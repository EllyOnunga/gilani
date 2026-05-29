import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Creates an AI provider dynamically selecting Google, Groq, or OpenAI
 * depending on what keys are present.
 * Drop-in replacement for the old Lovable AI Gateway provider.
 */
export const createGoogleAiProvider = (apiKey?: string) => {
  const geminiKey = apiKey || process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY || "";
  const groqKey = process.env.GROQ_API_KEY || "";
  const openaiKey = process.env.OPENAI_API_KEY || "";

  // Check if Gemini key is valid (not empty and not the expired/invalid AQ. format)
  const isValidGeminiKey = geminiKey && geminiKey.trim() !== "" && !geminiKey.startsWith("AQ.");

  let activeProvider: "google" | "groq" | "openai" = "google";

  if (groqKey) {
    activeProvider = "groq";
  } else if (openaiKey) {
    activeProvider = "openai";
  } else if (isValidGeminiKey) {
    activeProvider = "google";
  }

  console.log(`[AI Gateway] Selected active provider: ${activeProvider}`);

  if (activeProvider === "groq") {
    const groq = createOpenAICompatible({
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
    });
    return {
      chatModel: (modelId?: string) => {
        // Default to llama-3.3-70b-versatile for Groq
        const cleanModelId = modelId && !modelId.includes("gemini") && !modelId.includes("google") 
          ? modelId.replace(/^groq\//, "") 
          : "llama-3.3-70b-versatile";
        console.log(`[AI Gateway] Using Groq chat model: ${cleanModelId}`);
        return groq.chatModel(cleanModelId);
      },
      textEmbeddingModel: (modelId?: string) => {
        // Groq has no native embedding model standard in AI SDK, fallback to OpenAI or Google if keys exist
        if (openaiKey) {
          const openai = createOpenAICompatible({
            name: "openai",
            baseURL: "https://api.openai.com/v1",
            apiKey: openaiKey,
          });
          return openai.textEmbeddingModel("text-embedding-3-small");
        }
        if (isValidGeminiKey) {
          const google = createGoogleGenerativeAI({ apiKey: geminiKey });
          return google.textEmbeddingModel("text-embedding-004");
        }
        throw new Error("No embedding provider available for Groq. Please configure OPENAI_API_KEY or GEMINI_API_KEY.");
      },
    };
  }

  if (activeProvider === "openai") {
    const openai = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: openaiKey,
    });
    return {
      chatModel: (modelId?: string) => {
        const cleanModelId = modelId && !modelId.includes("gemini") && !modelId.includes("google")
          ? modelId.replace(/^openai\//, "")
          : "gpt-4o-mini";
        console.log(`[AI Gateway] Using OpenAI chat model: ${cleanModelId}`);
        return openai.chatModel(cleanModelId);
      },
      textEmbeddingModel: (modelId?: string) => {
        const cleanModelId = modelId && !modelId.includes("google")
          ? modelId.replace(/^openai\//, "")
          : "text-embedding-3-small";
        return openai.textEmbeddingModel(cleanModelId);
      },
    };
  }

  // Default to Google Generative AI
  const google = createGoogleGenerativeAI({ apiKey: geminiKey });
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
      console.log(`[AI Gateway] Using Google chat model: ${cleanModelId}`);
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
