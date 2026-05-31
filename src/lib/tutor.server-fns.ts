import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const deleteThreadFn = createServerFn({ method: "POST" })
  .inputValidator(z.string())
  .handler(async ({ data: threadId }) => {
    const { error } = await supabaseAdmin
      .from("conversations")
      .delete()
      .eq("id", threadId);
    if (error) throw error;
    return true;
  });

export const generateThreadTitleFn = createServerFn({ method: "POST" })
  .inputValidator(z.string())
  .handler(async ({ data: firstMessage }) => {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 20,
        messages: [{
          role: "user",
          content: `Generate a short 4-6 word title for a study session that starts with this question: "${firstMessage}". Reply with only the title, no punctuation.`,
        }],
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || firstMessage.slice(0, 29);
  });