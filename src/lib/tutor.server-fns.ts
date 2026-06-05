import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { sendTransactionalEmail } from "./email.server";

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
            content: `Generate a short 3-5 word title for a study session that starts with this question: "${firstMessage}". Reply with only the title itself. Do not wrap in quotes. Do not include prefixes like "Title:". No punctuation.`,
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
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #d9531e;">Hello Teacher,</h2>
              <p><strong>${studentName}</strong> has requested your review on their study session.</p>
              <p>You can view and reply to this escalation by visiting your dashboard:</p>
              <p style="margin: 24px 0;">
                <a href="${appUrl}/teacher/escalations" style="display: inline-block; padding: 12px 24px; background-color: #d9531e; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Open Escalations Dashboard</a>
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #666;">This is an automated notification from GilaniAI.</p>
            </div>
          `,
          text: `Hello Teacher,\n\n${studentName} has requested your review on their study session. You can view and reply to this escalation by visiting your dashboard:\n\n${appUrl}/teacher/escalations\n\nBest regards,\nThe GilaniAI Team`
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
          })
        );
        const validEmails = emails.filter((email): email is string => !!email);
        if (validEmails.length > 0) {
          await sendTransactionalEmail({
            to: validEmails,
            subject: `[GilaniAI] New Escalation Request Available`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #d9531e;">Hello Teacher/Admin,</h2>
                <p><strong>${studentName}</strong> has requested a teacher review on their study session.</p>
                <p>Since this request is unassigned, any teacher can claim and review it:</p>
                <p style="margin: 24px 0;">
                  <a href="${appUrl}/teacher/escalations" style="display: inline-block; padding: 12px 24px; background-color: #d9531e; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">View Escalations</a>
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #666;">This is an automated notification from GilaniAI.</p>
              </div>
            `,
            text: `Hello Teacher/Admin,\n\n${studentName} has requested a teacher review on their study session. Since this request is unassigned, any teacher can claim and review it:\n\n${appUrl}/teacher/escalations\n\nBest regards,\nThe GilaniAI Team`
          });
        }
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
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #4caf50;">Hello student,</h2>
            <p>Your teacher has reviewed your study session and left a response!</p>
            <p>Click the link below to view their response and continue learning:</p>
            <p style="margin: 24px 0;">
              <a href="${appUrl}/tutor/${conversationId}" style="display: inline-block; padding: 12px 24px; background-color: #4caf50; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">View Teacher's Response</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">This is an automated notification from GilaniAI.</p>
          </div>
        `,
        text: `Hello student,\n\nYour teacher has reviewed your study session and left a response! Click the link below to view their response and continue learning:\n\n${appUrl}/tutor/${conversationId}\n\nBest regards,\nThe GilaniAI Team`
      });
    }
  });
