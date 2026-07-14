import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/client/supabase";
import { withTimeout } from "@/shared/utils/async";

export interface Thread {
  id: string;
  title?: string | null;
  updated_at?: string | null;
}

export function useThreadsQuery(
  userId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const queryClient = useQueryClient();
  const enabled = (options?.enabled ?? true) && !!userId;

  const threadsQuery = useQuery({
    queryKey: ["threads", userId],
    queryFn: async () => {
      try {
        const { data, error } = (await withTimeout(
          Promise.resolve(
            supabase
              .from("conversations")
              .select("id,title,updated_at")
              .eq("user_id", userId as string)
              .order("updated_at", { ascending: false }),
          ),
          8000,
          "Database connection timed out",
        )) as any;
        if (error) throw new Error(`Failed to load sessions: ${error.message}`);

        const threads = (data ?? []) as Thread[];
        if (threads.length > 0) {
          import("@/client/db/local").then(({ localDb }) => {
            localDb.threads.bulkPut(threads).catch(console.error);
          });
        }
        return threads;
      } catch (err) {
        // Fallback to Dexie
        try {
          const { localDb } = await import("@/client/db/local");
          const cached = await localDb.threads.toArray();
          if (cached.length > 0) {
            return cached.sort((a, b) => {
              const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
              const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
              return dateB - dateA;
            });
          }
        } catch (dexieErr) {
          console.error("Failed to read from local DB", dexieErr);
        }
        throw err;
      }
    },
    enabled,
    staleTime: 0,
  });

  const threads = threadsQuery.data ?? [];
  const threadsLoading = !!userId && threadsQuery.isPending;
  const threadsLoadError = threadsQuery.error ? (threadsQuery.error as Error).message : null;

  const setThreads = (updater: Thread[] | ((prev: Thread[]) => Thread[])) => {
    queryClient.setQueryData(["threads", userId], (prev: Thread[] = []) =>
      typeof updater === "function" ? updater(prev) : updater,
    );
  };

  const invalidateThreads = () => {
    queryClient.invalidateQueries({ queryKey: ["threads", userId] });
  };

  return { threads, threadsLoading, threadsLoadError, setThreads, invalidateThreads };
}
