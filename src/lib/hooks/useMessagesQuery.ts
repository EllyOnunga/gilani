import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/async";

export function useMessagesQuery(threadId?: string | null, userId?: string | null) {
  const queryClient = useQueryClient();
  const enabled = !!threadId;

  const messagesQuery = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      try {
        const [messagesRes, escalationRes, feedbackRes] = await Promise.all([
          withTimeout(
            Promise.resolve(
              supabase
                .from("messages")
                .select("*")
                .eq("conversation_id", threadId as string)
                .order("created_at", { ascending: true }),
            ),
            20000,
            "Database connection timed out",
          ) as Promise<any>,
          (async () => {
            try {
              return await supabase
                .from("escalations")
                .select("status")
                .eq("conversation_id", threadId as string)
                .eq("user_id", userId ?? "")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            } catch {
              return { data: null, error: null };
            }
          })(),
          userId
            ? supabase.from("message_feedback").select("message_id, vote").eq("user_id", userId)
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (messagesRes.error) {
          throw new Error(`Database error: ${messagesRes.error.message}`);
        }

        let mappedMessages = [];
        if (messagesRes.data && messagesRes.data.length > 0) {
          mappedMessages = messagesRes.data.map((m: any) => {
            let resolvedParts: any[] | null = null;
            if (Array.isArray(m.parts) && m.parts.length > 0) {
              resolvedParts = m.parts as any[];
            } else if (typeof m.parts === "string" && m.parts.trim().startsWith("[")) {
              try {
                const parsed = JSON.parse(m.parts);
                if (Array.isArray(parsed) && parsed.length > 0) resolvedParts = parsed;
              } catch {}
            }
            return {
              id: m.id ?? crypto.randomUUID(),
              role: m.role as "user" | "assistant",
              content: m.content || "",
              parts: resolvedParts ?? [{ type: "text", text: m.content || "" }],
              createdAt: m.created_at ? new Date(m.created_at) : new Date(),
            };
          });

          import("@/lib/db/local").then(({ localDb }) => {
            const dbMessages = mappedMessages.map((m: any) => ({
              id: m.id,
              conversation_id: threadId as string,
              role: m.role,
              content: m.content,
              parts: m.parts,
              created_at: m.createdAt,
              sync_status: "synced" as const,
            }));
            localDb.messages.bulkPut(dbMessages).catch(console.error);
          });
        }

        const escalationStatus = (escalationRes.data?.status as string) || null;

        let userVotes: Record<string, 1 | -1> = {};
        if (feedbackRes.data && feedbackRes.data.length > 0) {
          for (const row of feedbackRes.data as any[]) {
            if (row.message_id && row.vote != null) {
              userVotes[row.message_id] = row.vote as 1 | -1;
            }
          }
        }

        return {
          messages: mappedMessages,
          escalationStatus,
          userVotes,
        };
      } catch (err) {
        // Fallback to local Dexie cache
        try {
          const { localDb } = await import("@/lib/db/local");
          const cached = await localDb.messages
            .where("conversation_id")
            .equals(threadId as string)
            .sortBy("created_at");

          if (cached.length > 0) {
            const mappedMessages = cached.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              parts: m.parts,
              createdAt: m.created_at,
            }));

            return {
              messages: mappedMessages,
              escalationStatus: null,
              userVotes: {},
            };
          }
        } catch (dexieErr) {
          console.error("Failed to read messages from local DB", dexieErr);
        }
        throw err;
      }
    },
    enabled,
    staleTime: 0,
  });

  const invalidateMessages = () => {
    queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
  };

  const setMessagesData = (updater: any) => {
    queryClient.setQueryData(["messages", threadId], updater);
  };

  return {
    data: messagesQuery.data,
    isLoading: messagesQuery.isPending && !!threadId,
    error: messagesQuery.error,
    invalidateMessages,
    setMessagesData,
    refetch: messagesQuery.refetch,
  };
}
