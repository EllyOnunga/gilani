import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const deleteThreadFn = createServerFn({ method: "POST" })
  .inputValidator(z.string())
  .handler(async ({ data: threadId }) => {
    const { error } = await supabaseAdmin.from("conversations").delete().eq("id", threadId);
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
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 20,
        messages: [
          {
            role: "user",
            content: `Generate a short 4-6 word title for a study session that starts with this question: "${firstMessage}". Reply with only the title, no punctuation.`,
          },
        ],
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || firstMessage.slice(0, 29);
  });

export const lookupTeacherByEmail = createServerFn({ method: "POST" })
  .inputValidator(z.string().email())
  .handler(async ({ data: email }) => {
    // Look up user by email using admin API
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw new Error("Failed to look up teacher");

    const user = data.users.find((u) => u.email === email);
    if (!user) throw new Error("No teacher found with that email address.");

    // Verify they are a teacher or admin
    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["teacher", "admin"])
      .single();

    if (!roleCheck) throw new Error("That email does not belong to a registered teacher.");

    return user.id;
  });

export async function createNotification({
  userId,
  title,
  message,
  type,
  link,
}: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}) {
  await (supabaseAdmin as any).from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    link: link ?? null,
  } as any);
}

export const createEscalationNotification = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      conversationId: z.string(),
      reviewerId: z.string().nullable(),
      studentId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const { conversationId, reviewerId, studentId } = data;

    if (reviewerId) {
      // Notify specific teacher
      await (supabaseAdmin as any).from("notifications").insert({
        user_id: reviewerId,
        title: "New Escalation Assigned",
        message: "A student has requested your review on a study session.",
        type: "escalation",
        link: "/teacher/escalations",
      } as any);
    } else {
      // Notify all teachers and admins
      const { data: teachers } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["teacher", "admin"]);

      if (teachers && teachers.length > 0) {
        await (supabaseAdmin as any).from("notifications").insert(
          teachers.map(
            (t) =>
              ({
                user_id: t.user_id,
                title: "New Escalation Request",
                message: "A student has requested a teacher review on a study session.",
                type: "escalation",
                link: "/teacher/escalations",
              }) as any,
          ),
        );
      }
    }
  });

export const createResolutionNotification = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      studentId: z.string(),
      conversationId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const { studentId, conversationId } = data;
    await (supabaseAdmin as any).from("notifications").insert({
      user_id: studentId,
      title: "Teacher Responded!",
      message: "Your teacher has reviewed your study session and left a response.",
      type: "success",
      link: `/tutor/${conversationId}`,
    } as any);
  });
