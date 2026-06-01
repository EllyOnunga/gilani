import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { streamText, embed } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth";
import { withTimeout } from "@/lib/async";
import { buildSystemPrompt, checkDignityViolation, DISTRESS_KEYWORDS } from "@/lib/tutor-prompt";

// ─── Provider Helpers ─────────────────────────────────────────────────────────

function getKey(key: string | undefined): string {
  return (key || "").trim();
}

// ✅ FIXED: Updated validator to accept both old (AIza) and new (AQ) Google API key structures
function isValidGeminiKey(key: string): boolean {
  return key !== "" && (key.startsWith("AIza") || key.startsWith("AQ"));
}

function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  const err = error as any;
  const msg = String(err?.message || err?.error?.message || JSON.stringify(err) || "");
  return (
    err?.statusCode === 429 ||
    msg.includes("rate_limit") || msg.includes("Rate limit") ||
    msg.includes("quota") || msg.includes("insufficient_quota") ||
    msg.includes("RESOURCE_EXHAUSTED")
  );
}

function createChatModel(provider: string): { model: any; name: string } | null {
  switch (provider) {
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
    case "gemini": {
      const key = getKey(process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY);
      if (!isValidGeminiKey(key)) return null;
      const google = createGoogleGenerativeAI({ apiKey: key });
      return { model: google("gemini-2.0-flash"), name: "gemini" };
    }
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
    default:
      return null;
  }
}

function createEmbeddingModel(): { model: any; name: string } | null {
  // Try Gemini first (free, high limits)
  const geminiKey = getKey(process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY);
  if (isValidGeminiKey(geminiKey)) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return { model: google.textEmbeddingModel("text-embedding-004"), name: "gemini" };
  }
  
  // Try OpenAI
  const openaiKey = getKey(process.env.OPENAI_API_KEY);
  if (openaiKey) {
    const openai = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: openaiKey,
    });
    return { model: openai.textEmbeddingModel("text-embedding-3-small"), name: "openai" };
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
          const body = await request.json().catch(() => ({}));
          const { threadId, messages } = body as { threadId?: string; messages?: any[] };

          console.log("[API Chat] userId:", userId, "| threadId:", threadId);

          if (!threadId) {
            return new Response(JSON.stringify({ error: "threadId required" }), {
              status: 400, headers: { "Content-Type": "application/json" },
            });
          }

          // ─── Select Chat Model ──────────────────────────────────────────
          // Priority: DeepSeek → Gemini → Groq → OpenAI
          const providerOrder = ["groq", "gemini", "deepseek", "openai"];
          let model: any = null;
          let activeProvider: string = "";

          for (const provider of providerOrder) {
            const result = createChatModel(provider);
            if (result) {
              model = result.model;
              activeProvider = result.name;
              break;
            }
          }

          if (!model) {
            return new Response(
              JSON.stringify({ error: "No AI provider configured. Set DEEPSEEK_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY." }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          console.log(`[API Chat] Selected chat provider: ${activeProvider}`);
          console.log(`[API Chat] Available providers: ${providerOrder.filter(p => createChatModel(p)).join(", ")}`);

          // ─── Database Checks ────────────────────────────────────────────
          const { data: thread } = await supabaseAdmin
            .from("conversations")
            .select("*")
            .eq("id", threadId)
            .eq("user_id", userId)
            .maybeSingle();

          if (!thread) {
            return new Response(JSON.stringify({ error: "thread not found" }), {
              status: 404, headers: { "Content-Type": "application/json" },
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
            const userText = extractText(lastMessage);
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
          const curriculum = profile?.curriculum || "KCSE";

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
                  notesContext = chunks.map((c: any) => c.content).join("\n---\n");
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

          const aiMessages = [
            { role: "system" as const, content: systemPrompt },
            ...(messages?.map((m: any) => {
              const textContent = extractText(m);
              return {
                role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
                content: [{ type: "text" as const, text: textContent }],
              };
            }) || []),
          ];

          console.log(`[API Chat] System prompt length: ${systemPrompt.length} chars`);

          // ─── Stream Response ────────────────────────────────────────────
          const streamResult = streamText({
            model,
            messages: aiMessages,
            maxRetries: 0,
            temperature: 0.7,
            timeout: 30000,
            onError: (errorObj) => {
              const error = (errorObj as any)?.error || errorObj;
              console.error(`[API Chat] ${activeProvider} onError:`, 
                typeof error === "object" ? JSON.stringify(error).slice(0, 300) : String(error)
              );
            },
            onFinish: async ({ text: assistantText, providerMetadata }) => {
              console.log(`[API Chat] ${activeProvider} finished. Length: ${assistantText.length}`);
              
              const safeText = assistantText.trim() || "Sorry, I could not generate a response right now. Please try again.";

              try {
                const assistantParts = [{ type: "text" as const, text: safeText }];
                const thoughtSignature = (providerMetadata as any)?.google?.thoughtSignature || null;

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
                  payload: { threadId, confidence: 0.9, provider: activeProvider },
                });

                // Safety checks
                const safety = (providerMetadata as any)?.google?.safetyRatings;
                if (
                  Array.isArray(safety) &&
                  safety.some((s: any) => s.probability === "HIGH" || s.probability === "MEDIUM")
                ) {
                  await supabaseAdmin.from("escalations").insert({
                    conversation_id: threadId,
                    reason: "Safety probability threshold exceeded",
                    status: "pending",
                    user_id: userId,
                  });
                } else {
                  const lowered = safeText.toLowerCase();
                  if (DISTRESS_KEYWORDS.some((k) => lowered.includes(k))) {
                    await supabaseAdmin.from("escalations").insert({
                      conversation_id: threadId,
                      reason: "distress_keyword",
                      user_id: userId,
                    });
                  } else if (checkDignityViolation(safeText)) {
                    await supabaseAdmin.from("escalations").insert({
                      conversation_id: threadId,
                      reason: "dignity_violation",
                      user_id: userId,
                    });
                  }
                }
              } catch (persistError) {
                console.error("Failed to persist assistant message:", persistError);
              }
            },
          });

          console.log("[API Chat] Returning stream response");
          return streamResult.toTextStreamResponse({
            headers: { "cache-control": "no-cache" },
          });

        } catch (error: unknown) {
          console.error("[API Chat] Error:", error instanceof Error ? error.message : String(error));

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