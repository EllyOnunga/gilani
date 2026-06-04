import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

  // Trigger Zapier Webhook in the background (fire and forget)
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
