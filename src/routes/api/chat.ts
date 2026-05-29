import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { streamText, embed } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { withTimeout } from "@/lib/async";

// Helper to convert embedding array to vector string format for Supabase pgvector
function formatVectorForPgvector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

const DISTRESS_KEYWORDS = ["suicide", "self-harm", "abuse", "hurt myself", "kill myself"];
const DIGNITY_FILTER = ["bitch", "stupid", "idiot", "dumb"]; // Example boundary list

function checkDignityViolation(text: string): boolean {
  const lowered = text.toLowerCase();
  return DIGNITY_FILTER.some(word => lowered.includes(word));
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
          const { threadId, messages } = body as { threadId?: string; messages?: any[] };

          console.log("[API Chat] userId:", userId, "| threadId:", threadId, "| messages count:", messages?.length ?? 0);
          // Log the last message structure for debugging
          const _lastMsgDebug = messages?.[messages.length - 1];
          console.log("[API Chat] lastMessage role:", _lastMsgDebug?.role, "| has parts:", Array.isArray(_lastMsgDebug?.parts), "| has content:", typeof _lastMsgDebug?.content);
          if (Array.isArray(_lastMsgDebug?.parts)) {
            console.log("[API Chat] lastMessage parts:", JSON.stringify(_lastMsgDebug.parts).slice(0, 200));
          }

          if (!threadId) {
            return new Response(JSON.stringify({ error: "threadId required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const geminiKey = process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY || "";
          const hasValidGemini = geminiKey && !geminiKey.startsWith("AQ.");
          const hasGroq = !!process.env.GROQ_API_KEY;
          const hasOpenAi = !!process.env.OPENAI_API_KEY;

          if (!hasValidGemini && !hasGroq && !hasOpenAi) {
            const geminiInvalid = geminiKey && geminiKey.startsWith("AQ.");
            return new Response(
              JSON.stringify({
                error: geminiInvalid
                  ? "Your GEMINI_API_KEY is expired or invalid (starts with 'AQ.'). Please get a fresh key from https://aistudio.google.com/ or set GROQ_API_KEY / OPENAI_API_KEY as alternatives."
                  : "Missing AI provider configuration. Please configure GEMINI_API_KEY (from https://aistudio.google.com/), GROQ_API_KEY, or OPENAI_API_KEY environment variable.",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          // No explicit key needed — gateway auto-detects Groq > OpenAI > Gemini from env

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            const missing = [
              ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
              ...(!SUPABASE_SERVICE_ROLE_KEY ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
            ];
            return new Response(
              JSON.stringify({
                error: `Missing Supabase server env vars: ${missing.join(", ")}`,
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const { data: thread } = await supabaseAdmin
            .from("conversations")
            .select("*")
            .eq("id", threadId)
            .eq("user_id", userId)
            .maybeSingle();

          if (!thread) {
            return new Response(JSON.stringify({ error: "thread not found or unauthorized" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          const lastMessage = messages?.[messages.length - 1];

          // AI SDK v6: UIMessage has parts[] not .content
          // Extract text from parts array (TextStreamChatTransport sends UIMessage format)
          const extractTextFromMessage = (msg: any): string => {
            if (!msg) return "";
            // v6 UIMessage format: parts array
            if (Array.isArray(msg.parts)) {
              return msg.parts
                .filter((p: any) => p.type === "text")
                .map((p: any) => p.text || "")
                .join("")
                .trim();
            }
            // fallback: legacy .content string
            return (msg.content as string) || "";
          };

          if (lastMessage && lastMessage.role === "user") {
            const userText = extractTextFromMessage(lastMessage);
            console.log("[API Chat] extracted userText:", JSON.stringify(userText));
            await supabaseAdmin.from("messages").insert({
              conversation_id: threadId,
              role: "user",
              content: (userText || null) as any,
              parts: JSON.stringify([{ type: "text", text: userText }]),
              user_id: userId,
            });
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("curriculum")
            .eq("id", userId)
            .maybeSingle();

          const curriculum = profile?.curriculum || "KCSE";

          const latestMessageContent = extractTextFromMessage(lastMessage);
          console.log("[API Chat] latestMessageContent for RAG:", JSON.stringify(latestMessageContent));
          let notesContext = "";

          if (latestMessageContent) {
            try {
              // Use gateway's default embedding model (auto-selects by active provider)
              const embeddingModel = createLovableAiGatewayProvider().textEmbeddingModel();
              const { embedding } = await withTimeout(
                embed({
                  model: embeddingModel,
                  value: latestMessageContent,
                }),
                15000,
                "Embedding generation timed out"
              );

const { data: chunks, error } = await supabaseAdmin.rpc("match_note_chunks", {
                 query_embedding: `[${(embedding as number[]).join(",")}]`,
                 match_user_id: userId,
                 match_count: 5,
               });

               if (error) throw error;

              if (chunks && chunks.length > 0) {
                notesContext = chunks.map((c: any) => c.content).join("\n---\n");
              }
            } catch (err) {
              console.error("Vector RAG search failed, falling back to keyword search:", err);
              const { data: chunks } = await supabaseAdmin
                .from("note_chunks")
                .select("content")
                .eq("user_id", userId)
                .limit(5);

              if (chunks && chunks.length > 0) {
                const words = latestMessageContent
                  .toLowerCase()
                  .split(/\s+/)
                  .filter((w: string) => w.length > 3);
                const matched = chunks
                  .filter((c: any) => words.some((w: string) => c.content.toLowerCase().includes(w)))
                  .slice(0, 3);

                const selectedChunks = matched.length > 0 ? matched : chunks.slice(0, 2);
                notesContext = selectedChunks.map((c: any) => c.content).join("\n---\n");
              }
            }
          }

          const systemPrompt = `You are GilaniAI, a supportive, highly knowledgeable, and ethical AI study assistant for Kenyan secondary school students.
You dynamically adjust your pedagogical style based on the student's curriculum: ${curriculum}.

Curriculum Guidelines:
${
  curriculum === "KCSE"
    ? "- Focus on formal academic definitions, logical structured reasoning, and exam-readiness aligned with the Kenya National Examinations Council (KNEC) KCSE syllabus standards."
    : "- Emphasise formative feedback, competence/skill-centered learning, practical exploration, self-efficacy, and active real-world applications aligned with the Competency Based Curriculum (CBC) framework."
}

Ethical and Safety Directives:
- Maintain strict educational boundaries. Do NOT write full solutions or cheat for the student. Guide them step-by-step using scaffolding and Socratic questioning.
- If the student is struggling or expresses frustration/distress, reassure them that they can escalate the session to a human teacher by clicking the "Escalate now" sidebar card.

${
  notesContext
    ? `Use the following curriculum-grounded study notes uploaded by the student as context for your explanations:
=== STUDY NOTES CONTEXT ===
${notesContext}
==========================`
    : ""
}

Engage in a friendly, encouraging, and clear language using the following strict language priority hierarchy:
- Primary Language (English): Always use English as your primary language of instruction, formal academic definitions, and structured syllabus explanations to ensure exam-readiness.
- Secondary Language (Swahili / Sheng): Integrate Swahili or casual Sheng phrases naturally and secondary to English to build strong rapport, make learning accessible, and encourage the student when they are struggling.
- Tertiary Language (Native Kenyan Languages): You may use local native languages (such as Gikuyu, Dholuo, Luhya, Kamba, etc.) very sparingly and tertiary to Swahili, only if explicitly requested by the student or to illustrate specific cultural examples.`;

          // Use gateway without explicit key — auto-detects Groq > OpenAI > Gemini from env
          const model = createLovableAiGatewayProvider().chatModel("gemini-2.0-flash");

          // AI SDK v6: messages are UIMessage objects with parts[]
          // We need to convert them to the model message format
          const aiMessages = [
            { role: "system" as const, content: systemPrompt },
            ...(messages?.map((m: any) => {
              const textContent = extractTextFromMessage(m);
              return {
                role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
                content: [
                  {
                    type: "text" as const,
                    text: textContent,
                    // Preserve thought signatures for Gemini
                    providerOptions: (m.thoughtSignature || m.thought_signature)
                      ? { google: { thoughtSignature: m.thoughtSignature || m.thought_signature } }
                      : undefined,
                  },
                ],
              };
            }) || []),
          ];

          console.log("[API Chat] aiMessages count:", aiMessages.length, "| roles:", aiMessages.map(m => `${m.role}(${Array.isArray(m.content) ? (m.content as any[]).map((c:any)=>c.text?.slice(0,30)).join('|') : String(m.content).slice(0,30)})`).join(', '));

          const streamResult = streamText({
            model,
            messages: aiMessages,
            maxRetries: 1,
            temperature: 0.7,
            timeout: 25000,
            onError: (error) => {
              console.error("[streamText:onError]", error);
            },
            onFinish: async ({ text: assistantText, providerMetadata }) => {
              console.log("[streamText:onFinish] text length:", assistantText.length);
              const safeText =
                assistantText.trim() ||
                "Sorry, I could not generate a response right now. Please try again.";

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
                } as any); // Bypass static Database types for new column
                await supabaseAdmin.from("audit_logs").insert({
                  action: "tutor.message",
                  payload: { threadId, confidence: 0.9 },
                });

                const safety = (providerMetadata as any)?.google?.safetyRatings;
                if (Array.isArray(safety) && safety.some((s: any) => s.probability === "HIGH" || s.probability === "MEDIUM")) {
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
                console.error("Failed to persist assistant message", persistError);
              }
            },
          });

          console.log("[API Chat] Returning toTextStreamResponse");
          try {
            return streamResult.toTextStreamResponse({
              headers: {
                "cache-control": "no-cache",
              },
            });
          } catch (streamErr: any) {
            console.error("[API Chat] Stream response error:", streamErr?.message || streamErr);
            const isQuota = streamErr?.statusCode === 429 || String(streamErr?.message).includes("quota") || String(streamErr?.message).includes("RESOURCE_EXHAUSTED");
            return new Response(
              JSON.stringify({
                error: isQuota
                  ? "AI quota exceeded. The Gemini API free tier limit has been reached. Please try again later."
                  : "The AI model could not generate a response. Please try again.",
              }),
              { status: isQuota ? 429 : 500, headers: { "Content-Type": "application/json" } },
            );
          }
        } catch (error: any) {
          console.error("[API Chat] Top-level error:", error?.message || error);
          const isQuota = error?.statusCode === 429 || String(error?.message).includes("quota") || String(error?.message).includes("RESOURCE_EXHAUSTED");
          return new Response(
            JSON.stringify({
              error: isQuota
                ? "AI quota exceeded. Please try again later."
                : error instanceof Error ? error.message : "Failed to process chat request",
            }),
            {
              status: isQuota ? 429 : 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});