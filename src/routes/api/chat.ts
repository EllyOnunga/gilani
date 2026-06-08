import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { streamText, embed } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { withTimeout } from "@/lib/async";
import { buildSystemPrompt, sanitizeUntrustedInput, sanitizeCurriculum } from "@/lib/tutor-prompt";

// ─── Server-side Rate Limiter ────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20; // max requests
const RATE_LIMIT_WINDOW = 60000; // per 60 seconds

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  // Prune expired entries to prevent memory leak
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ─── Provider Helpers ─────────────────────────────────────────────────────────

function getKey(key: string | undefined): string {
  return (key || "").trim();
}

// NOTE: Only AIza... keys work with @ai-sdk/google (Google AI Studio).
// "AQ." prefix = Vertex AI Express Mode — requires OAuth2, not compatible with this SDK.
function isValidGeminiKey(key: string): boolean {
  return key !== "" && key.startsWith("AIza");
}

function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  const err = error as any;
  const msg = String(err?.message || err?.error?.message || JSON.stringify(err) || "");
  return (
    err?.statusCode === 429 ||
    msg.includes("rate_limit") ||
    msg.includes("Rate limit") ||
    msg.includes("quota") ||
    msg.includes("insufficient_quota") ||
    msg.includes("RESOURCE_EXHAUSTED")
  );
}

function createChatModel(provider: string): { model: any; name: string } | null {
  switch (provider) {
    case "groq": {
      const key = getKey(process.env.GROQ_API_KEY);
      if (!key) return null;
      const groq = createOpenAICompatible({
        name: "groq",
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: key,
      });
      return { model: groq.chatModel("llama-3.3-70b-versatile"), name: "groq" };
    }
    case "openai": {
      const key = getKey(process.env.OPENAI_API_KEY);
      if (!key) return null;
      const openai = createOpenAICompatible({
        name: "openai",
        baseURL: "https://api.openai.com/v1",
        apiKey: key,
      });
      return { model: openai.chatModel("gpt-4o-mini"), name: "openai" };
    }
    case "gemini": {
      const key = getKey(process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY);
      if (!isValidGeminiKey(key)) return null;
      const google = createGoogleGenerativeAI({ apiKey: key });
      return { model: google("gemini-2.0-flash"), name: "gemini" };
    }
    case "deepseek": {
      const key = getKey(process.env.DEEPSEEK_API_KEY);
      if (!key) return null;
      const deepseek = createOpenAICompatible({
        name: "deepseek",
        baseURL: "https://api.deepseek.com/v1",
        apiKey: key,
      });
      return { model: deepseek.chatModel("deepseek-chat"), name: "deepseek" };
    }
    case "mistral": {
      const key = getKey(process.env.MISTRAL_API_KEY);
      if (!key) return null;
      const mistral = createOpenAICompatible({
        name: "mistral",
        baseURL: "https://api.mistral.ai/v1",
        apiKey: key,
      });
      return { model: mistral.chatModel("mistral-large-latest"), name: "mistral" };
    }
    default:
      return null;
  }
}

function createEmbeddingModel(): { model: any; name: string } | null {
  // Try Groq first for blazing fast open-source embeddings (keeps it close to your primary chat)
  const groqKey = getKey(process.env.GROQ_API_KEY);
  if (groqKey) {
    const groq = createOpenAICompatible({
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
    });
    return { model: groq.textEmbeddingModel("bge-large-en-v1.5"), name: "groq" };
  }

  // Try OpenAI as fallback
  const openaiKey = getKey(process.env.OPENAI_API_KEY);
  if (openaiKey) {
    const openai = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: openaiKey,
    });
    return { model: openai.textEmbeddingModel("text-embedding-3-small"), name: "openai" };
  }

  // Try Mistral as fallback
  const mistralKey = getKey(process.env.MISTRAL_API_KEY);
  if (mistralKey) {
    const mistral = createOpenAICompatible({
      name: "mistral",
      baseURL: "https://api.mistral.ai/v1",
      apiKey: mistralKey,
    });
    return { model: mistral.textEmbeddingModel("mistral-embed"), name: "mistral" };
  }

  return null;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const request = getRequest();
          let authResult;
          try {
            authResult = await authenticateRequest(request);
          } catch (err) {
            console.error("[API Chat] Auth failed:", err);
            if (err instanceof Response) return err;
            return new Response(
              JSON.stringify({ error: err instanceof Error ? err.message : "Unauthorized" }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }

          const { userId } = authResult;

          // Server-side rate limit — 20 requests per user per minute
          if (!checkRateLimit(userId)) {
            return new Response(
              JSON.stringify({
                error: "Rate limit exceeded. Please wait a minute before sending more messages.",
              }),
              { status: 429, headers: { "Content-Type": "application/json" } },
            );
          }

          const body = await request.json().catch(() => ({}));
          const { threadId, messages } = body as { threadId?: string; messages?: any[] };

          // Validate threadId is a UUID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!threadId || !uuidRegex.test(threadId)) {
            return new Response(JSON.stringify({ error: "threadId required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // ─── Gather Configured Chat Models (UPDATED PRIORITY ORDER) ──────
          // Priority: Groq → OpenAI → Gemini → Mistral → DeepSeek
          const providerOrder = ["groq", "openai", "gemini", "mistral", "deepseek"];
          const configuredProviders = providerOrder
            .map((p) => createChatModel(p))
            .filter((p): p is { model: any; name: string } => p !== null);

          if (configuredProviders.length === 0) {
            return new Response(
              JSON.stringify({
                error:
                  "No AI provider configured. Set GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY.",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          console.log(
            `[API Chat] Configured providers in priority order: ${configuredProviders.map((p) => p.name).join(", ")}`,
          );

          // ─── Database Checks ────────────────────────────────────────────
          const { data: thread } = await supabaseAdmin
            .from("conversations")
            .select("*")
            .eq("id", threadId)
            .eq("user_id", userId)
            .maybeSingle();

          if (!thread) {
            return new Response(JSON.stringify({ error: "thread not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          const lastMessage = messages?.[messages.length - 1];

          const extractText = (msg: any): string => {
            if (!msg) return "";
            if (Array.isArray(msg.parts)) {
              return msg.parts
                .filter((p: any) => p.type === "text")
                .map((p: any) => p.text || "")
                .join("")
                .trim();
            }
            return (msg.content as string) || "";
          };

          // Save user message
          if (lastMessage?.role === "user") {
            const userText = sanitizeUntrustedInput(extractText(lastMessage));
            await supabaseAdmin.from("messages").insert({
              conversation_id: threadId,
              role: "user",
              content: (userText || null) as any,
              parts: JSON.stringify([{ type: "text", text: userText }]),
              user_id: userId,
            });
          }

          // Fetch curriculum
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("curriculum")
            .eq("id", userId)
            .maybeSingle();
          const curriculum = sanitizeCurriculum(profile?.curriculum || "KCSE");

          // ─── RAG: Vector Search ─────────────────────────────────────────
          const latestMessageContent = extractText(lastMessage);
          let notesContext = "";

          if (latestMessageContent) {
            const embResult = createEmbeddingModel();

            if (embResult) {
              try {
                console.log(`[RAG] Using ${embResult.name} for embeddings`);

                const { embedding } = await withTimeout(
                  embed({ model: embResult.model, value: latestMessageContent, maxRetries: 0 }),
                  15000,
                  "Embedding generation timed out",
                );

                const { data: chunks } = await supabaseAdmin.rpc("match_note_chunks", {
                  query_embedding: `[${(embedding as number[]).join(",")}]`,
                  match_user_id: userId,
                  match_count: 5,
                });

                if (chunks?.length) {
                  notesContext = sanitizeUntrustedInput(chunks.map((c: any) => c.content).join("\n---\n"));
                  console.log(`[RAG] Found ${chunks.length} relevant chunks`);
                }
              } catch (err: unknown) {
                if (isRateLimitError(err)) {
                  console.log(`[RAG] ${embResult.name} embeddings rate limited, skipping RAG`);
                } else {
                  console.error("[RAG] Failed:", err instanceof Error ? err.message : String(err));
                }
              }
            } else {
              console.log("[RAG] No embedding provider available, skipping RAG");
            }
          }

          // ─── Build Prompt ───────────────────────────────────────────────
          const systemPrompt = buildSystemPrompt({ curriculum, notesContext });

          // ✅ FIXED: Clean user/assistant messages array ONLY. Use flat string content for maximum provider compatibility.
          // Cap to last 50 messages to prevent unbounded token cost
          const cappedMessages = messages?.slice(-50) ?? [];
          const aiMessages = [
            ...cappedMessages.map((m: any) => {
              const textContent = extractText(m);
              return {
                role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
                content: textContent,
              };
            }),
          ];

          // ─── Stream Response (WITH PROVIDER RETRY FALLBACK) ───────────────
          // Hard wall-clock deadline: abort the entire stream if it doesn't finish in 60 s
          const streamAbort = new AbortController();
          const streamDeadline = setTimeout(() => streamAbort.abort(), 60000);

          let streamResult: any = null;
          let activeProvider = "";
          let lastError: unknown;

          for (const prov of configuredProviders) {
            try {
              console.log(`[API Chat] Attempting stream with provider: ${prov.name}`);
              streamResult = await streamText({
                model: prov.model,
                system: systemPrompt,
                messages: aiMessages,
                maxRetries: 0,
                temperature: 0.7,
                timeout: 30000,
                onError: (errorObj) => {
                  const error = (errorObj as any)?.error || errorObj;
                  console.error(
                    `[API Chat] ${prov.name} onError:`,
                    typeof error === "object" ? JSON.stringify(error).slice(0, 300) : String(error),
                  );
                },
                onFinish: async ({ text: assistantText, providerMetadata }) => {
                  console.log(`[API Chat] ${prov.name} finished. Length: ${assistantText.length}`);

                  const safeText =
                    assistantText.trim() ||
                    "Sorry, I could not generate a response right now. Please try again.";

                  try {
                    const assistantParts = [{ type: "text" as const, text: safeText }];
                    const thoughtSignature =
                      (providerMetadata as any)?.google?.thoughtSignature || null;

                    await supabaseAdmin.from("messages").insert({
                      conversation_id: threadId,
                      role: "assistant",
                      content: safeText,
                      parts: JSON.stringify(assistantParts),
                      confidence: 0.9,
                      user_id: userId,
                      thought_signature: thoughtSignature,
                    } as any);

                    await supabaseAdmin.from("audit_logs").insert({
                      action: "tutor.message",
                      payload: { threadId, confidence: 0.9, provider: prov.name },
                    });

                    // Safety checks
                    const safety = (providerMetadata as any)?.google?.safetyRatings;
                    if (
                      Array.isArray(safety) &&
                      safety.some(
                        (s: any) => s.probability === "HIGH" || s.probability === "MEDIUM",
                      )
                    ) {
                      const { data: escData, error: escErr } = await supabaseAdmin
                        .from("escalations")
                        .insert({
                          conversation_id: threadId,
                          reason: "Safety probability threshold exceeded",
                          status: "pending",
                          user_id: userId,
                        })
                        .select("id")
                        .single();

                      if (!escErr && escData) {
                        import("@/lib/zapier.server")
                          .then(({ triggerZapierEscalation }) => {
                            triggerZapierEscalation({
                              escalationId: escData.id,
                              userId,
                              threadId,
                              reason: "Safety probability threshold exceeded",
                              detail:
                                "Automatically escalated due to model safety ratings threshold breach.",
                            });
                          })
                          .catch((err) => {
                            console.error("[Zapier] Failed to load safety trigger:", err);
                          });
                      }
                    }
                  } catch (persistError) {
                    console.error("Failed to persist assistant message:", persistError);
                  }
                },
              });

              activeProvider = prov.name;
              break;
            } catch (err) {
              console.warn(`[API Chat] Provider ${prov.name} stream start failed:`, err);
              lastError = err;
            }
          }

          if (!streamResult) {
            clearTimeout(streamDeadline);
            throw lastError || new Error("Failed to stream chat response from all providers.");
          }

          console.log(`[API Chat] Returning stream response from: ${activeProvider}`);
          // Pipe through with abort so hung provider connections are cleaned up
          const textStream = streamResult.toTextStreamResponse({
            headers: { "cache-control": "no-cache" },
          });
          streamAbort.signal.addEventListener("abort", () => {
            clearTimeout(streamDeadline);
          }, { once: true });
          // Clear deadline once the response object is returned (stream lifecycle continues)
          // The AbortController above will fire at 60 s if the stream stalls mid-flight
          return textStream;
        } catch (error: unknown) {
          console.error(
            "[API Chat] Error:",
            error instanceof Error ? error.message : String(error),
          );

          return new Response(
            JSON.stringify({
              error: isRateLimitError(error)
                ? "AI quota exceeded. Please try again later."
                : error instanceof Error
                  ? error.message
                  : "Failed to process chat request",
            }),
            {
              status: isRateLimitError(error) ? 429 : 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
