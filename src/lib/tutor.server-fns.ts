import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { sendTransactionalEmail, emailTemplate } from "./email.server";

export const createEscalationFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      conversationId: z.string().uuid(),
      reason: z.string().default("student_request"),
      detail: z.string().default("Student manually requested teacher review."),
      reviewerId: z.string().uuid().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const request = (await import("@tanstack/react-start/server")).getRequest();
    const { authenticateRequest } = await import("@/lib/api-auth.server");
    let authResult: Awaited<ReturnType<typeof authenticateRequest>>;
    try {
      authResult = await authenticateRequest(request);
    } catch {
      throw new Error("Unauthorized");
    }
    // Check for existing open escalation
    const { data: existing } = await supabaseAdmin
      .from("escalations")
      .select("id")
      .eq("conversation_id", data.conversationId)
      .eq("status", "open")
      .maybeSingle();
    if (existing) return { alreadyOpen: true };

    const { error } = await supabaseAdmin.from("escalations").insert({
      conversation_id: data.conversationId,
      user_id: authResult.userId,
      reason: data.reason,
      status: "open",
      detail: data.detail,
      reviewer_id: data.reviewerId,
    });
    if (error) throw error;
    return { alreadyOpen: false };
  });

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
  .inputValidator(z.string().max(500))
  .handler(async ({ data: firstMessage }) => {
    const request = (await import("@tanstack/react-start/server")).getRequest();
    const { authenticateRequest } = await import("@/lib/api-auth.server");
    try {
      await authenticateRequest(request);
    } catch {
      throw new Error("Unauthorized");
    }

    const { createGoogleAiProvider } = await import("@/lib/ai-gateway.server");
    const { generateText } = await import("ai");

    const gateway = createGoogleAiProvider();
    const models = gateway.getAllChatModels();

    let title = "";
    let lastError: unknown;

    for (let i = 0; i < models.length; i++) {
      const { model, name } = models[i];
      try {
        if (i > 0) {
          const { backoffDelay } = await import("@/lib/provider-backoff");
          await backoffDelay(i);
        }
        console.log(`[Title Gen] Attempting with provider: ${name}`);
        const result = await generateText({
          model: model as any, // from gateway
          maxTokens: 20,
          prompt: `Generate a short 3-5 word title for a study session that starts with this question: "${firstMessage.slice(0, 200)}". Reply with only the title itself. Do not wrap in quotes. Do not include prefixes like "Title:". No punctuation.`,
        } as any);

        if (result.text) {
          title = result.text.trim();
          console.log(`[Title Gen] Successfully generated title.`);
          break;
        }
      } catch (err) {
        console.warn(`[Title Gen] Attempt failed:`, err);
        lastError = err;
      }
    }

    if (!title && lastError) {
      throw lastError;
    }

    // Clean quotes or conversational prefix/suffix
    title = title.replace(/^["'“”‘“]|["'“”’]$/g, "").trim();
    title = title.replace(/^(title|session|study session):\s*/i, "").trim();
    return title || firstMessage.slice(0, 29);
  });

export const lookupTeacherByEmail = createServerFn({ method: "POST" })
  .inputValidator(z.string().email())
  .handler(async ({ data: email }) => {
    const request = (await import("@tanstack/react-start/server")).getRequest();
    const { authenticateRequest } = await import("@/lib/api-auth.server");
    try {
      await authenticateRequest(request);
    } catch {
      throw new Error("Unauthorized");
    }
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
    }),
  )
  .handler(async ({ data }) => {
    const request = (await import("@tanstack/react-start/server")).getRequest();
    const { authenticateRequest } = await import("@/lib/api-auth.server");
    let authResult: any;
    try {
      authResult = await authenticateRequest(request);
    } catch {
      throw new Error("Unauthorized");
    }
    const studentId = authResult.userId;
    const { conversationId, reviewerId } = data;

    // Fetch student profile details for context
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", studentId)
      .maybeSingle();
    const studentName = profile?.display_name || "A student";
    const appUrl = process.env.APP_URL || "https://gilaniai.site";

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
      // CS-LOG-001: Log reviewer ID only — never log email addresses to prevent PII leakage in server logs
      console.log("[Escalation] Sending email to teacher ID:", reviewerId);
      const { data: reviewerUser } = await supabaseAdmin.auth.admin.getUserById(reviewerId);
      if (reviewerUser?.user?.email) {
        const emailResult = await sendTransactionalEmail({
          to: reviewerUser.user.email,
          subject: `[GilaniAI] Escalation Assigned: Review Requested`,
          fromEmail: "info@gilaniai.site",
          fromName: "GilaniAI",
          html: emailTemplate({
            heading: "New Escalation Assigned",
            body: `<strong>${studentName}</strong> has requested your review on their study session. Please check your escalations dashboard to respond.`,
            buttonText: "Open Escalations Dashboard",
            buttonUrl: `${appUrl}/login?signout=true&redirect=/teacher/escalations`,
            footerNote:
              "You are receiving this because you are registered as a teacher on GilaniAI.",
          }),
          text: `Hello Teacher,\n\n${studentName} has requested your review on their study session. You can view and reply to this escalation by visiting your dashboard:\n\n${appUrl}/teacher/escalations\n\nBest regards,\nThe GilaniAI Team`,
        });
        console.log("[Escalation] Email send result:", emailResult);
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
            fromEmail: "info@gilaniai.site",
            fromName: "GilaniAI",
            html: emailTemplate({
              heading: "New Escalation Request Available",
              body: `<strong>${studentName}</strong> has requested a teacher review on their study session. Since this request is unassigned, any teacher can claim and review it.`,
              buttonText: "View Escalations",
              buttonUrl: `${appUrl}/login?signout=true&redirect=/teacher/escalations`,
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
    const request = (await import("@tanstack/react-start/server")).getRequest();
    const { authenticateRequest } = await import("@/lib/api-auth.server");
    let authResult: any;
    try {
      authResult = await authenticateRequest(request);
    } catch {
      throw new Error("Unauthorized");
    }
    // Verify caller is a teacher/admin
    const { requireRole } = await import("@/lib/api-auth.server");
    const isTeacher = await requireRole(authResult.userId, "teacher");
    const isAdmin = await requireRole(authResult.userId, "admin");
    if (!isTeacher && !isAdmin) throw new Error("Forbidden: Teacher access required");
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
      const appUrl = process.env.APP_URL || "https://gilaniai.site";
      await sendTransactionalEmail({
        to: studentUser.user.email,
        subject: `[GilaniAI] Teacher Responded to your Study Session!`,
        fromEmail: "info@gilaniai.site",
        fromName: "GilaniAI",
        html: emailTemplate({
          heading: "Your teacher has responded! 🎉",
          body: "Great news — your teacher has reviewed your study session and left a response. Click below to view their feedback and continue learning.",
          buttonText: "View Teacher's Response",
          buttonUrl: `${appUrl}/login?signout=true&redirect=/tutor/${conversationId}`,
          footerNote:
            "You are receiving this because you submitted an escalation request on GilaniAI.",
        }),
        text: `Hello student,\n\nYour teacher has reviewed your study session and left a response! Click the link below to view their response and continue learning:\n\n${appUrl}/tutor/${conversationId}\n\nBest regards,\nThe GilaniAI Team`,
      });
    }
  });

export const renameThreadFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ threadId: z.string().uuid(), title: z.string().trim().min(1).max(120) }),
  )
  .handler(async ({ data }) => {
    const request = (await import("@tanstack/react-start/server")).getRequest();
    const { authenticateRequest } = await import("@/lib/api-auth.server");
    let authResult: Awaited<ReturnType<typeof authenticateRequest>>;
    try {
      authResult = await authenticateRequest(request);
    } catch {
      throw new Error("Unauthorized");
    }
    // Only rename the thread if it belongs to the authenticated user
    const { error } = await supabaseAdmin
      .from("conversations")
      .update({ title: data.title })
      .eq("id", data.threadId)
      .eq("user_id", authResult.userId);
    if (error) throw error;
    return { success: true };
  });
