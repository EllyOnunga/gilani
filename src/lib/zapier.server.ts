import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Triggers a Zapier workflow via a secure server-side webhook POST request.
 * Fetches relevant student, conversation, and message details before posting.
 */
export async function triggerZapierEscalation({
  escalationId,
  userId,
  threadId,
  reason,
  detail,
}: {
  escalationId?: string;
  userId: string;
  threadId: string;
  reason: string;
  detail?: string | null;
}) {
  const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      "[Zapier Integration] ZAPIER_WEBHOOK_URL is not configured. Skipping webhook invocation.",
    );
    return;
  }

  try {
    console.log(
      `[Zapier Integration] Triggering workflow for escalation: ${escalationId || "new"}`,
    );

    // 1. Fetch user email from auth
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUser(userId);
    if (userErr) {
      console.warn("[Zapier Integration] Fetching user email failed:", userErr.message);
    }
    const email = userData?.user?.email || "unknown@student.com";

    // 2. Fetch user profile display name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const studentName = profile?.display_name || "Student";

    // 3. Fetch conversation title
    const { data: convo } = await supabaseAdmin
      .from("conversations")
      .select("title")
      .eq("id", threadId)
      .maybeSingle();
    const threadTitle = convo?.title || "Untitled Study Session";

    // 4. Resolve escalated message text if detail is a message ID (UUID)
    let escalatedMessage = detail || "No message text provided.";
    if (
      detail &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(detail)
    ) {
      const { data: msg } = await supabaseAdmin
        .from("messages")
        .select("content")
        .eq("id", detail)
        .maybeSingle();
      if (msg?.content) {
        escalatedMessage = msg.content;
      }
    }

    const payload = {
      escalation_id: escalationId || "ephemeral",
      student_id: userId,
      student_name: studentName,
      student_email: email,
      thread_id: threadId,
      thread_title: threadTitle,
      reason,
      escalated_message: escalatedMessage,
      created_at: new Date().toISOString(),
      portal_link: `${process.env.APP_URL || "http://localhost:8000"}/teacher/escalations`,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    console.log("[Zapier Integration] Webhook successfully triggered.");
  } catch (err) {
    console.error("[Zapier Integration] Failed to trigger webhook:", err);
  }
}
