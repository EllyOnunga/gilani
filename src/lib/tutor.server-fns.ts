import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { sendTransactionalEmail, emailTemplate } from "./email.server";

export const deleteThreadFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ threadId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const request = (await import("@tanstack/react-start/server")).getRequest();
    const { authenticateRequest } = await import("@/lib/api-auth.server");
    let authResult: Awaited<ReturnType<typeof authenticateRequest>>;
    try {
      authResult = await authenticateRequest(request);
    } catch {
      throw new Error("Unauthorized");
    }
    // Only delete the thread if it belongs to the authenticated user
    const { error } = await supabaseAdmin
      .from("conversations")
      .delete()
      .eq("id", data.threadId)
      .eq("user_id", authResult.userId);
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
            content: `Generate a short 3-5 word title for a study session that starts with this question: "${firstMessage.slice(0, 200)}". Reply with only the title itself. Do not wrap in quotes. Do not include prefixes like "Title:". No punctuation.`,
          },
        ],
      }),
    });
    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() || "";
    // Clean quotes or conversational prefix/suffix
    title = title.replace(/^["'“”‘“]|["'“”’]$/g, "").trim();
    title = title.replace(/^(title|session|study session):\s*/i, "").trim();
    return title || firstMessage.slice(0, 29);
  });

export const lookupTeacherByEmail = createServerFn({ method: "POST" })
  .inputValidator(z.string().email())
  .handler(async ({ data: email }) => {
    // Look up user by email using admin API
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();
    if (error || !profile) throw new Error("No teacher found with that email address.");
    const user = { id: profile.id };

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
      conversationId: z.string().uuid(),
      reviewerId: z.string().uuid().nullable(),
      studentId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const { conversationId, reviewerId, studentId } = data;

    // Fetch student profile details for context
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", studentId)
      .maybeSingle();
    const studentName = profile?.display_name || "A student";
    const appUrl = process.env.APP_URL || "https://gilaniai.vercel.app";

    if (reviewerId) {
      // Notify specific teacher in DB
      await (supabaseAdmin as any).from("notifications").insert({
        user_id: reviewerId,
        title: "New Escalation Assigned",
        message: "A student has requested your review on a study session.",
        type: "escalation",
        link: "/teacher/escalations",
      } as any);

      // Email the specific teacher
      const { data: reviewerUser } = await supabaseAdmin.auth.admin.getUserById(reviewerId);
      if (reviewerUser?.user?.email) {
        await sendTransactionalEmail({
          to: reviewerUser.user.email,
          subject: `[GilaniAI] Escalation Assigned: Review Requested`,
          html: emailTemplate({
            heading: "New Escalation Assigned",
            body: `<strong>${studentName}</strong> has requested your review on their study session. Please check your escalations dashboard to respond.`,
            buttonText: "Open Escalations Dashboard",
            buttonUrl: `${appUrl}/teacher/escalations`,
            footerNote:
              "You are receiving this because you are registered as a teacher on GilaniAI.",
          }),
          text: `Hello Teacher,\n\n${studentName} has requested your review on their study session. You can view and reply to this escalation by visiting your dashboard:\n\n${appUrl}/teacher/escalations\n\nBest regards,\nThe GilaniAI Team`,
        });
      }
    } else {
      // Notify all teachers and admins in DB
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

        // Email all teachers/admins in parallel
        const emails = await Promise.all(
          teachers.map(async (t) => {
            const { data: u } = await supabaseAdmin.auth.admin.getUserById(t.user_id);
            return u?.user?.email;
          }),
        );
        const validEmails = emails.filter((email): email is string => !!email);
        if (validEmails.length > 0) {
          await sendTransactionalEmail({
            to: validEmails,
            subject: `[GilaniAI] New Escalation Request Available`,
            html: emailTemplate({
              heading: "New Escalation Request Available",
              body: `<strong>${studentName}</strong> has requested a teacher review on their study session. Since this request is unassigned, any teacher can claim and review it.`,
              buttonText: "View Escalations",
              buttonUrl: `${appUrl}/teacher/escalations`,
              footerNote:
                "You are receiving this because you are registered as a teacher or admin on GilaniAI.",
            }),
            text: `Hello Teacher/Admin,\n\n${studentName} has requested a teacher review on their study session. Since this request is unassigned, any teacher can claim and review it:\n\n${appUrl}/teacher/escalations\n\nBest regards,\nThe GilaniAI Team`,
          });
        }
      }
    }
  });

export const createResolutionNotification = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      studentId: z.string().uuid(),
      conversationId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const { studentId, conversationId } = data;

    // Insert database notification
    await (supabaseAdmin as any).from("notifications").insert({
      user_id: studentId,
      title: "Teacher Responded!",
      message: "Your teacher has reviewed your study session and left a response.",
      type: "success",
      link: `/tutor/${conversationId}`,
    } as any);

    // Email student
    const { data: studentUser } = await supabaseAdmin.auth.admin.getUserById(studentId);
    if (studentUser?.user?.email) {
      const appUrl = process.env.APP_URL || "https://gilaniai.vercel.app";
      await sendTransactionalEmail({
        to: studentUser.user.email,
        subject: `[GilaniAI] Teacher Responded to your Study Session!`,
        html: emailTemplate({
          heading: "Your teacher has responded! 🎉",
          body: "Great news — your teacher has reviewed your study session and left a response. Click below to view their feedback and continue learning.",
          buttonText: "View Teacher's Response",
          buttonUrl: `${appUrl}/tutor/${conversationId}`,
          footerNote:
            "You are receiving this because you submitted an escalation request on GilaniAI.",
        }),
        text: `Hello student,\n\nYour teacher has reviewed your study session and left a response! Click the link below to view their response and continue learning:\n\n${appUrl}/tutor/${conversationId}\n\nBest regards,\nThe GilaniAI Team`,
      });
    }
  });

// ---------------------------------------------------------------------------
// Plain async helpers (migrated from tutor.functions.ts)
// ---------------------------------------------------------------------------

export async function createThread({ title, userId }: { title?: string; userId: string }) {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .insert({ title: title || "New tutor session", user_id: userId })
    .select("*")
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

export async function listThreads({ limit = 50 } = {}) {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getThreadMessages(threadId: string) {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("conversation_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function deleteThread(threadId: string) {
  const { error } = await supabaseAdmin.from("conversations").delete().eq("id", threadId);
  if (error) throw error;
  return true;
}

export async function escalateMessage(
  threadId: string,
  userId: string,
  messageId?: string,
  reason?: string,
) {
  const { data, error } = await supabaseAdmin
    .from("escalations")
    .insert({
      conversation_id: threadId,
      detail: messageId || null,
      reason: reason || "manual",
      user_id: userId,
    })
    .select("id")
    .single();
  if (error) throw error;

  import("@/lib/zapier.server")
    .then(({ triggerZapierEscalation }) => {
      triggerZapierEscalation({
        escalationId: data?.id,
        userId,
        threadId,
        reason: reason || "student_request",
        detail: messageId || null,
      });
    })
    .catch((err) => {
      console.error("[Zapier] Failed to load trigger function:", err);
    });

  return true;
}
