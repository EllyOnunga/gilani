import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Creates an AI provider dynamically selecting available providers from env keys.
 * Priority: Gemini > Groq > OpenAI > Mistral
 */
export const createGoogleAiProvider = (apiKey?: string) => {
  const stripQuotes = (str: string): string => {
    let s = str.trim();
    if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
    else if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1);
    return s;
  };

  const geminiKey = stripQuotes(apiKey || process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY || "");
  const groqKey = stripQuotes(process.env.GROQ_API_KEY || "");
  const openaiKey = stripQuotes(process.env.OPENAI_API_KEY || "");
  const mistralKey = stripQuotes(process.env.MISTRAL_API_KEY || "");

  const isValidGeminiKey = geminiKey && geminiKey.trim() !== "";

  const activeProviders: ("openai" | "groq" | "google" | "mistral")[] = [];
  if (isValidGeminiKey) activeProviders.push("google");
  if (groqKey) activeProviders.push("groq");
  if (openaiKey) activeProviders.push("openai");
  if (mistralKey) activeProviders.push("mistral");

  if (activeProviders.length === 0) {
    throw new Error(
      "[AI Gateway] No AI provider API key configured. " +
      "Set at least one of: GEMINI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY, MISTRAL_API_KEY."
    );
  }

  const instantiatedProviders = activeProviders.map((providerName) => {
    if (providerName === "google") {
      const googleInstance = createGoogleGenerativeAI({ apiKey: geminiKey });
      return {
        name: "google" as const,
        chatModel: (modelId?: string) => {
          const cleanModelId = modelId && modelId.includes("gemini")
            ? modelId.replace(/^google\//, "")
            : "gemini-2.5-flash-lite";
          return googleInstance(cleanModelId);
        },
      };
    }
    if (providerName === "groq") {
      const groq = createOpenAICompatible({
        name: "groq",
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: groqKey,
      });
      return {
        name: "groq" as const,
        chatModel: (modelId?: string) => {
          const cleanModelId =
            modelId && !modelId.includes("gemini") && !modelId.includes("google")
              ? modelId.replace(/^groq\//, "")
              : "llama-3.3-70b-versatile";
          return groq.chatModel(cleanModelId);
        },
      };
    }
    if (providerName === "openai") {
      const openai = createOpenAICompatible({
        name: "openai",
        baseURL: "https://api.openai.com/v1",
        apiKey: openaiKey,
      });
      return {
        name: "openai" as const,
        chatModel: (modelId?: string) => {
          const cleanModelId =
            modelId && !modelId.includes("gemini") && !modelId.includes("google")
              ? modelId.replace(/^openai\//, "")
              : "gpt-4o-mini";
          return openai.chatModel(cleanModelId);
        },
      };
    }
    // mistral
    const mistral = createOpenAICompatible({
      name: "mistral",
      baseURL: "https://api.mistral.ai/v1",
      apiKey: mistralKey,
    });
    return {
      name: "mistral" as const,
      chatModel: (modelId?: string) => {
        const cleanModelId =
          modelId && !modelId.includes("gemini") && !modelId.includes("google")
            ? modelId.replace(/^mistral\//, "")
            : "mistral-large-latest";
        return mistral.chatModel(cleanModelId);
      },
    };
  });

  return {
    chatModel: (modelId?: string) => instantiatedProviders[0].chatModel(modelId),
    getAllChatModels: (modelId?: string) => instantiatedProviders.map((p) => ({ model: p.chatModel(modelId), name: p.name })),
    textEmbeddingModel: (_modelId?: string) => {
      if (isValidGeminiKey) {
        const googleInstance = createGoogleGenerativeAI({ apiKey: geminiKey });
        return (googleInstance as any).textEmbeddingModel("gemini-embedding-2", { outputDimensionality: 768 });
      }
      if (openaiKey) {
        const openai = createOpenAICompatible({
          name: "openai",
          baseURL: "https://api.openai.com/v1",
          apiKey: openaiKey,
        });
        return openai.textEmbeddingModel("text-embedding-3-small");
      }
      if (mistralKey) {
        const mistral = createOpenAICompatible({
          name: "mistral",
          baseURL: "https://api.mistral.ai/v1",
          apiKey: mistralKey,
        });
        return mistral.textEmbeddingModel("mistral-embed");
      }
      throw new Error("[AI Gateway] No embedding-capable provider configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or MISTRAL_API_KEY.");
    },
  };
};

/**
 * @deprecated Use createGoogleAiProvider instead.
 */
export const createLovableAiGatewayProvider = createGoogleAiProvider;
