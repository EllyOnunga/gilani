import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/async";

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
      return (data ?? []) as Thread[];
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
