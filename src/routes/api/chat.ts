import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { streamText } from "ai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateRequest } from "@/lib/api-auth";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const DISTRESS_KEYWORDS = ["suicide", "self-harm", "abuse", "hurt myself", "kill myself"];

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

          const userParts = messages?.filter((m: any) => m.role === "user") || [];
          for (const m of userParts) {
            await supabaseAdmin.from("messages").insert({
              conversation_id: threadId,
              role: "user",
              content: m.content || null,
              parts: JSON.stringify([{ type: "text", text: m.content || "" }]),
              user_id: userId,
            });
          }

          // 1. Retrieve the user's profile to inspect their selected curriculum (KCSE or CBC)
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("curriculum")
            .eq("id", userId)
            .maybeSingle();

          const curriculum = profile?.curriculum || "KCSE";

          // 2. Retrieve curriculum-specific study notes chunks uploaded by this user
          const latestMessageContent = userParts[userParts.length - 1]?.content || "";
          let notesContext = "";

          if (latestMessageContent) {
            try {
              const { embed } = await import("ai");
              const embeddingModel = createLovableAiGatewayProvider(
                LOVABLE_API_KEY,
              ).textEmbeddingModel("google/text-embedding-004");
              const { embedding } = await embed({
                model: embeddingModel,
                value: latestMessageContent,
              });

              const { data: chunks, error: rpcErr } = await supabaseAdmin.rpc("match_note_chunks", {
                query_embedding: JSON.stringify(embedding),
                match_user_id: userId,
                match_count: 5,
              });

              if (rpcErr) throw rpcErr;

              if (chunks && chunks.length > 0) {
                notesContext = chunks.map((c: any) => c.content).join("\n---\n");
              }
            } catch (err) {
              console.error("Vector RAG search failed, falling back to keyword search:", err);
              // Fall back to keyword search
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
                  .filter((c) => words.some((w: string) => c.content.toLowerCase().includes(w)))
                  .slice(0, 3);

                const selectedChunks = matched.length > 0 ? matched : chunks.slice(0, 2);
                notesContext = selectedChunks.map((c) => c.content).join("\n---\n");
              }
            }
          }

          // 3. System prompt dynamically customized to curriculum format and ethics
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
            ...(userParts.length
              ? userParts.map((message: any) => ({
                  role: "user" as const,
                  content: message.content || "",
                }))
              : [{ role: "user" as const, content: "Habari! What can you help me with today?" }]),
          ];

          const encoder = new TextEncoder();
          let assistantText = "";

          const responseStream = new ReadableStream({
            async start(controller) {
              try {
                const streamResult = streamText({
                  model,
                  messages: aiMessages,
                });

                for await (const delta of streamResult.textStream) {
                  if (delta) {
                    assistantText += delta;
                    controller.enqueue(encoder.encode(delta));
                  }
                }

                controller.close();
              } catch (error) {
                console.error("Chat stream error:", error);
                // If nothing was sent yet, enqueue a user-visible error message
                if (assistantText.length === 0) {
                  const errMsg =
                    error instanceof Error ? error.message : "An unexpected error occurred";
                  controller.enqueue(encoder.encode(`[Error: ${errMsg}]`));
                }
                controller.close();
              } finally {
                if (assistantText.trim().length > 0) {
                  try {
                    const assistantParts = [{ type: "text", text: assistantText }];
                    await supabaseAdmin.from("messages").insert({
                      conversation_id: threadId,
                      role: "assistant",
                      content: assistantText,
                      parts: JSON.stringify(assistantParts),
                      confidence: 0.9,
                      user_id: userId,
                    });
                    await supabaseAdmin.from("audit_logs").insert({
                      action: "tutor.message",
                      payload: { threadId, confidence: 0.9 },
                    });

                    const lowered = assistantText.toLowerCase();
                    if (DISTRESS_KEYWORDS.some((k) => lowered.includes(k))) {
                      await supabaseAdmin.from("escalations").insert({
                        conversation_id: threadId,
                        reason: "distress_keyword",
                        user_id: userId,
                      });
                    }
                  } catch (persistError) {
                    console.error("Failed to persist assistant message after stream", persistError);
                  }
                }
              }
            },
          });

          return new Response(responseStream, {
            headers: {
              "content-type": "text/plain; charset=utf-8",
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
