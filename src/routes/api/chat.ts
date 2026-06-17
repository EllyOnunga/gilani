import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { streamText, embed, smoothStream } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { withTimeout } from "@/lib/async";
import { buildSystemPrompt, sanitizeUntrustedInput, sanitizeCurriculum } from "@/lib/tutor-prompt";
import { checkPlanRateLimit, decrementRateLimit } from "@/lib/rate-limit.server";
import { createGoogleAiProvider } from "@/lib/ai-gateway.server";

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
          const { threadId, messages, isRetry } = body as { threadId?: string; messages?: any[]; isRetry?: boolean };

          const rlResult = await checkPlanRateLimit(userId, "chat", !!isRetry);
          if (!rlResult.allowed) {
            const seconds = Math.ceil(rlResult.retryAfterMs / 1000);
            const msg = rlResult.isDaily
              ? `Daily message limit reached. Resets in ${seconds}s.`
              : `Rate limit exceeded. Try again in ${seconds}s.`;
            return new Response(
              JSON.stringify({ error: msg, retryAfterMs: rlResult.retryAfterMs, isDaily: rlResult.isDaily }),
              { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil(rlResult.retryAfterMs / 1000)) } },
            );
          }

          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!threadId || !uuidRegex.test(threadId)) {
            return new Response(JSON.stringify({ error: "threadId required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // ─── Use ai-gateway for all providers ────────────────────────────
          const gateway = createGoogleAiProvider();
          const configuredProviders = gateway.getAllChatModels();

          console.log(`[API Chat] Providers in order: ${configuredProviders.map(p => p.name).join(", ")}`);

          if (configuredProviders.length === 0) {
            return new Response(
              JSON.stringify({ error: "No AI provider configured." }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          // ─── Database Checks ─────────────────────────────────────────────
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

          if (lastMessage?.role === "user" && !isRetry) {
            const userText = sanitizeUntrustedInput(extractText(lastMessage));
            await supabaseAdmin.from("messages").insert({
              conversation_id: threadId,
              role: "user",
              content: (userText || null) as any,
              parts: JSON.stringify([{ type: "text", text: userText }]),
              user_id: userId,
            });
          } else if (isRetry) {
            const { data: lastMsg } = await supabaseAdmin
              .from("messages")
              .select("id, role")
              .eq("conversation_id", threadId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (lastMsg?.role === "assistant") {
              await supabaseAdmin.from("messages").delete().eq("id", lastMsg.id);
            }
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("curriculum, tutor_tone, tutor_style, tutor_depth")
            .eq("id", userId)
            .maybeSingle();
          const curriculum = sanitizeCurriculum(profile?.curriculum || "KCSE");
          const tutorTone = profile?.tutor_tone || "encouraging";
          const tutorStyle = profile?.tutor_style || "socratic";
          const tutorDepth = profile?.tutor_depth || "standard";

          // ─── RAG: Vector Search ──────────────────────────────────────────
          const latestMessageContent = extractText(lastMessage);
          let notesContext = "";

          if (latestMessageContent) {
            try {
              const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
              if (geminiKey) {
                const embModel = createGoogleAiProvider().textEmbeddingModel();
                console.log(`[RAG] Using gemini for embeddings`);
                const { embedding } = await withTimeout(
                  embed({ model: embModel, value: latestMessageContent, maxRetries: 0 }),
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
              } else {
                console.log("[RAG] No embedding provider available, skipping RAG");
              }
            } catch (err: unknown) {
              if (isRateLimitError(err)) {
                console.log(`[RAG] Embeddings rate limited, skipping RAG`);
              } else {
                console.error("[RAG] Failed:", err instanceof Error ? err.message : String(err));
              }
            }
          }

          // ─── Build Prompt ────────────────────────────────────────────────
          const systemPrompt = buildSystemPrompt({
            curriculum,
            notesContext,
            tutorTone,
            tutorStyle,
            tutorDepth,
          });

          const cappedMessages = messages?.slice(-50) ?? [];
          const aiMessages = cappedMessages.map((m: any) => {
            const textContent = extractText(m);
            const isUser = m.role !== "assistant";
            return {
              role: (isUser ? "user" : "assistant") as "user" | "assistant",
              content: isUser ? sanitizeUntrustedInput(textContent) : textContent,
            };
          });


          // ─── Stream with provider fallback ───────────────────────────────
          const streamAbort = new AbortController();
          const streamDeadline = setTimeout(() => streamAbort.abort(), 60000);

          let streamResult: any = null;
          let activeProvider = "";
          let lastError: unknown;
          let firstPart: any = null;

          for (let i = 0; i < configuredProviders.length; i++) {
            const prov = configuredProviders[i];
            try {
              if (i > 0) {
                const { backoffDelay } = await import("@/lib/provider-backoff");
                await backoffDelay(i);
              }
              console.log(`[API Chat] Attempting stream with provider: ${prov.name}`);

              const attempt = streamText({
                model: prov.model,
                system: systemPrompt,
                messages: aiMessages,
                maxRetries: 0,
                temperature: 0.7,
                experimental_transform: smoothStream({ delayInMs: 15, chunking: "word" }),
                onError: (errorObj) => {
                  const error = (errorObj as any)?.error || errorObj;
                  console.error(
                    `[API Chat] ${prov.name} onError:`,
                    typeof error === "object" ? JSON.stringify(error).slice(0, 300) : String(error),
                  );
                },
                onFinish: async ({ text: assistantText, providerMetadata }) => {
                  console.log(`[API Chat] ${prov.name} finished. Length: ${assistantText.length}`);
                  const safeText = assistantText.trim() || "Sorry, I could not generate a response right now. Please try again.";
                  try {
                    const assistantParts = [{ type: "text" as const, text: safeText }];
                    const thoughtSignature = (providerMetadata as any)?.google?.thoughtSignature || null;
                    const { data: insertedMsg } = await supabaseAdmin.from("messages").insert({
                      conversation_id: threadId,
                      role: "assistant",
                      content: safeText,
                      parts: JSON.stringify(assistantParts),
                      confidence: 0.9,
                      user_id: userId,
                      thought_signature: thoughtSignature,
                    } as any).select("id").single();
                    if (insertedMsg?.id) {
                      streamResult.experimental_sendMessageAnnotations?.([{ messageId: insertedMsg.id }]);
                    }
                    await supabaseAdmin.from("audit_logs").insert({
                      action: "tutor.message",
                      payload: { threadId, confidence: 0.9, provider: prov.name },
                    });
                    const safety = (providerMetadata as any)?.google?.safetyRatings;
                    if (Array.isArray(safety) && safety.some((s: any) => s.probability === "HIGH" || s.probability === "MEDIUM")) {
                      const { data: escData, error: escErr } = await supabaseAdmin
                        .from("escalations")
                        .insert({ conversation_id: threadId, reason: "Safety probability threshold exceeded", status: "pending", user_id: userId })
                        .select("id").single();
                      if (!escErr && escData) {
                        import("@/lib/zapier.server").then(({ triggerZapierEscalation }) => {
                          triggerZapierEscalation({ escalationId: escData.id, userId, threadId, reason: "Safety probability threshold exceeded", detail: "Automatically escalated due to model safety ratings threshold breach." });
                        }).catch((err) => console.error("[Zapier] Failed to load safety trigger:", err));
                      }
                    }
                  } catch (persistError) {
                    console.error("Failed to persist assistant message:", persistError);
                  }
                },
              });

              // Validate the provider actually works by peeking the first
              // part of fullStream before committing to it. streamText()
              // resolves immediately regardless of whether the underlying
              // API call will succeed — only fullStream/onError reveal that.
              const reader = attempt.fullStream[Symbol.asyncIterator]();
              const firstResult = await reader.next();

              if (!firstResult.done && firstResult.value?.type === "error") {
                throw firstResult.value.error;
              }

              streamResult = attempt;
              firstPart = firstResult.done ? null : firstResult.value;
              activeProvider = prov.name;
              break;
            } catch (err) {
              console.warn(`[API Chat] Provider ${prov.name} stream start failed:`, err);
              lastError = err;
            }
          }

          if (!streamResult) {
            clearTimeout(streamDeadline);
            await decrementRateLimit(`${userId}:chat:day`);
            await decrementRateLimit(`${userId}:chat:min`);
            throw lastError || new Error("Failed to stream chat response from all providers.");
          }

          console.log(`[API Chat] Returning stream response from: ${activeProvider}`);
          const textStream = streamResult.toUIMessageStreamResponse({
            headers: {
              "Cache-Control": "no-cache, no-transform",
              "Content-Type": "text/event-stream",
              "Connection": "keep-alive",
              "X-Accel-Buffering": "no",
            },
          });
          streamAbort.signal.addEventListener("abort", () => { clearTimeout(streamDeadline); }, { once: true });
          return textStream;
        } catch (error: unknown) {
          console.error("[API Chat] Error:", error instanceof Error ? error.message : String(error));
          return new Response(
            JSON.stringify({
              error: isRateLimitError(error)
                ? "AI quota exceeded. Please try again later."
                : error instanceof Error ? error.message : "Failed to process chat request",
            }),
            { status: isRateLimitError(error) ? 429 : 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
