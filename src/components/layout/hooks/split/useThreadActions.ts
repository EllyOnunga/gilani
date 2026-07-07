import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { deleteThreadFn, renameThreadFn } from "@/lib/tutor.server-fns";
import { toast } from "sonner";
import { useThreadsQuery, type Thread } from "@/lib/hooks/useThreadsQuery";

export interface GroupedThreads {
  today: Thread[];
  yesterday: Thread[];
  last7Days: Thread[];
  older: Thread[];
}

export function groupThreadsByDate(threads: Thread[]): GroupedThreads {
  const today: Thread[] = [];
  const yesterday: Thread[] = [];
  const last7Days: Thread[] = [];
  const older: Thread[] = [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfLast7Days = new Date(startOfToday);
  startOfLast7Days.setDate(startOfLast7Days.getDate() - 7);

  threads.forEach((t) => {
    if (!t.updated_at) {
      older.push(t);
      return;
    }
    const updatedDate = new Date(t.updated_at);
    if (isNaN(updatedDate.getTime())) {
      older.push(t);
      return;
    }

    if (updatedDate >= startOfToday) today.push(t);
    else if (updatedDate >= startOfYesterday) yesterday.push(t);
    else if (updatedDate >= startOfLast7Days) last7Days.push(t);
    else older.push(t);
  });
  return { today, yesterday, last7Days, older };
}

export function useThreadActions(
  userId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const navigate = useNavigate();
  const { threads, threadsLoading, threadsLoadError, invalidateThreads } = useThreadsQuery(
    userId,
    options,
  );
  const groupedThreads = groupThreadsByDate(threads);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [revealedThreadId, setRevealedThreadId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const createNewThread = async () => {
    navigate({ to: "/tutor", search: { new: "1" } } as any);
  };

  const handleDeleteThread = async (id: string, opts?: { onDeletedActiveThread?: () => void }) => {
    const toastId = toast.loading("Deleting session...");
    try {
      await deleteThreadFn({ data: { threadId: id } });
      invalidateThreads();
      toast.success("Session deleted successfully!", { id: toastId });
      opts?.onDeletedActiveThread?.();
    } catch (err: any) {
      console.error("Failed to delete thread:", err);
      toast.error("Failed to delete session.", { id: toastId });
    }
  };

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle || "");
    requestAnimationFrame(() => renameInputRef.current?.select());
  };

  const commitRename = async (id: string) => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed) return;
    try {
      await renameThreadFn({ data: { threadId: id, title: trimmed } });
      invalidateThreads();
    } catch (err) {
      console.error("Failed to rename thread:", err);
      toast.error("Failed to rename chat.");
    }
  };

  const handleThreadTouchStart = (id: string) => {
    longPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setRevealedThreadId(id);
    }, 450);
  };

  const handleThreadTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setTimeout(() => {
      longPressTriggeredRef.current = false;
    }, 50);
  };

  return {
    threads,
    threadsLoading,
    threadsLoadError,
    groupedThreads,
    invalidateThreads,
    deleteConfirmId,
    setDeleteConfirmId,
    renamingId,
    setRenamingId,
    renameValue,
    setRenameValue,
    renameInputRef,
    startRename,
    commitRename,
    revealedThreadId,
    setRevealedThreadId,
    handleThreadTouchStart,
    handleThreadTouchEnd,
    longPressTriggeredRef,
    createNewThread,
    handleDeleteThread,
  };
}
