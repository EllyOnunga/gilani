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

          if (!threadId) {
            return new Response(JSON.stringify({ error: "threadId required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const LOVABLE_API_KEY = process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) {
            return new Response(
              JSON.stringify({
                error: "Missing GEMINI_API_KEY or LOVABLE_API_KEY environment variable",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

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
          if (lastMessage && lastMessage.role === "user") {
            await supabaseAdmin.from("messages").insert({
              conversation_id: threadId,
              role: "user",
              content: lastMessage.content || null,
              parts: JSON.stringify([{ type: "text", text: lastMessage.content || "" }]),
              user_id: userId,
            });
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("curriculum")
            .eq("id", userId)
            .maybeSingle();

          const curriculum = profile?.curriculum || "KCSE";

          const latestMessageContent = lastMessage?.content || "";
          let notesContext = "";

          if (latestMessageContent) {
            try {
              const embeddingModel = createLovableAiGatewayProvider(LOVABLE_API_KEY).textEmbeddingModel(
                "google/text-embedding-004",
              );
              const { embedding } = await withTimeout(
                embed({
                  model: embeddingModel,
                  value: latestMessageContent,
                  providerOptions: {
                    google: { taskType: "RETRIEVAL_QUERY" as const },
                  },
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

Engage in a friendly, encouraging Swahili-English (Sheng-infused if appropriate) or clear formal language.`;

          const model = createLovableAiGatewayProvider(LOVABLE_API_KEY).chatModel(
            "gemini-2.5-flash",
          );

          const aiMessages = [
            { role: "system" as const, content: systemPrompt },
            ...(messages?.map((m: any) => ({
              role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
              content: [
                {
                  type: "text" as const,
                  text: m.content || "",
                  // Critical for Gemini 3: Preserve thought signatures at the part level
                  providerOptions: (m.thoughtSignature || m.thought_signature) 
                    ? { google: { thoughtSignature: m.thoughtSignature || m.thought_signature } } 
                    : undefined
                }
              ],
            })) || []),
          ];

          const streamResult = streamText({
            model,
            messages: aiMessages,
            timeout: 120000,
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

          // Note: If you upgrade the 'ai' package to 3.1+, 
          // switch to .toDataStreamResponse() to enable reasoning/thought 
          // visualization on the frontend and prevent protocol-related hangs 
          // in newer versions of the useChat hook.
          return streamResult.toTextStreamResponse({
            headers: {
              "cache-control": "no-cache",
            },
          });
        } catch (error) {
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Failed to process chat request",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});