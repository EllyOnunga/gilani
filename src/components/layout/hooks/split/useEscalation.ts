import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createEscalationFn,
  createEscalationNotification,
  lookupTeacherByEmail,
} from "@/lib/tutor.server-fns";
import { toast } from "sonner";
import type { Thread } from "@/lib/hooks/useThreadsQuery";

export type EscalationStatus = "open" | "in_review" | "resolved" | null;

export function useEscalation(userId: string | null | undefined, threads: Thread[]) {
  const [escalationStatuses, setEscalationStatuses] = useState<Record<string, EscalationStatus>>(
    {},
  );
  const [escalateSheetThreadId, setEscalateSheetThreadId] = useState<string | null>(null);
  const [escalateEmail, setEscalateEmail] = useState("");
  const [escalating, setEscalating] = useState(false);
  const [escalateError, setEscalateError] = useState("");

  const threadIdsKey = threads.map((t) => t.id).join(",");

  useEffect(() => {
    if (!userId || threads.length === 0) {
      setEscalationStatuses({});
      return;
    }
    let active = true;
    (async () => {
      const ids = threads.map((t) => t.id);
      const { data, error } = await supabase
        .from("escalations")
        .select("conversation_id, status, created_at")
        .in("conversation_id", ids)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!active || error || !data) return;
      const latest: Record<string, EscalationStatus> = {};
      for (const row of data as any[]) {
        if (!(row.conversation_id in latest)) latest[row.conversation_id] = row.status;
      }
      setEscalationStatuses(latest);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, threadIdsKey]);

  const handleEscalateThread = async (threadId: string, email?: string) => {
    if (!email || !email.trim()) {
      setEscalateError("Please enter your teacher's email address.");
      return;
    }
    setEscalating(true);
    try {
      if (!userId) throw new Error("Not logged in");
      let reviewerId: string;
      try {
        reviewerId = await lookupTeacherByEmail({ data: email.trim().toLowerCase() });
      } catch (err: any) {
        setEscalateError(err.message || "No teacher found with that email address.");
        setEscalating(false);
        return;
      }
      const result = await createEscalationFn({
        data: {
          conversationId: threadId,
          reason: "student_request",
          detail: "Student manually requested teacher review.",
          reviewerId: reviewerId ?? null,
        },
      });
      if (result.alreadyOpen) {
        toast.info("This conversation already has an open escalation.");
        setEscalating(false);
        return;
      }
      await createEscalationNotification({
        data: { conversationId: threadId, reviewerId: reviewerId ?? null },
      });
      setEscalationStatuses((prev) => ({ ...prev, [threadId]: "open" }));
      setEscalateError("");
      setEscalateSheetThreadId(null);
      setEscalateEmail("");
      toast.success("Conversation escalated to your teacher! They will be notified by email.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to escalate conversation.");
    } finally {
      setEscalating(false);
    }
  };

  return {
    escalationStatuses,
    escalateSheetThreadId,
    setEscalateSheetThreadId,
    escalateEmail,
    setEscalateEmail,
    escalating,
    escalateError,
    setEscalateError,
    handleEscalateThread,
  };
}
