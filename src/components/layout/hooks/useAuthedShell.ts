import { useRef } from "react";
import { useRouterState, useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type Thread } from "@/lib/hooks/useThreadsQuery";

import { useSidebarUI } from "./split/useSidebarUI";
import { useThreadActions, groupThreadsByDate, type GroupedThreads } from "./split/useThreadActions";
import { useEscalation } from "./split/useEscalation";
import { useThreadExport } from "./split/useThreadExport";
import { useProfile } from "./split/useProfile";
import { useAppChrome } from "./split/useAppChrome";
import { useIdleLogout } from "./split/useIdleLogout";
import { useRoleRedirect } from "./split/useRoleRedirect";

export type { Thread, GroupedThreads };
export { groupThreadsByDate };

export function useAuthedShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { roles, user, loading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const signingOutRef = useRef(false);

  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("teacher") && !roles.includes("admin");
  const isStudent = !isAdmin && !isTeacher;

  const sidebar = useSidebarUI();

  const threadActions = useThreadActions(user?.id, { enabled: isStudent });

  const escalation = useEscalation(user?.id, threadActions.threads);

  const threadExport = useThreadExport(threadActions.threads);

  const profile = useProfile(user?.id);

  const appChrome = useAppChrome();

  const signOut = async () => {
    signingOutRef.current = true;
    try {
      sessionStorage.removeItem("__gilani_role");
      await supabase.auth.signOut();
      toast.success("Signed out");
    } catch {
      sessionStorage.removeItem("__gilani_role");
    } finally {
      window.location.href = "/";
    }
  };

  useIdleLogout(signOut);

  useRoleRedirect({
    loading,
    user,
    roles,
    path,
    isAdmin,
    isTeacher,
    isStudent,
    signingOutRef,
    navigate,
    router,
  });

  const createNewThread = async () => {
    await threadActions.createNewThread();
    sidebar.setSidebarOpen(false);
  };

  const handleDeleteThread = async (id: string) => {
    await threadActions.handleDeleteThread(id, {
      onDeletedActiveThread: () => {
        if (path.includes(`/tutor/${id}`)) navigate({ to: "/tutor" as any });
      },
    });
  };

  return {
    path,
    roles,
    user,
    loading,
    isAdmin,
    isTeacher,
    isStudent,

    sidebarOpen: sidebar.sidebarOpen,
    setSidebarOpen: sidebar.setSidebarOpen,
    collapsed: sidebar.collapsed,
    toggleCollapsed: sidebar.toggleCollapsed,
    userMenuOpen: sidebar.userMenuOpen,
    setUserMenuOpen: sidebar.setUserMenuOpen,
    userMenuRef: sidebar.userMenuRef,

    threads: threadActions.threads,
    threadsLoading: threadActions.threadsLoading,
    groupedThreads: threadActions.groupedThreads,
    deleteConfirmId: threadActions.deleteConfirmId,
    setDeleteConfirmId: threadActions.setDeleteConfirmId,
    renamingId: threadActions.renamingId,
    setRenamingId: threadActions.setRenamingId,
    renameValue: threadActions.renameValue,
    setRenameValue: threadActions.setRenameValue,
    renameInputRef: threadActions.renameInputRef,
    startRename: threadActions.startRename,
    commitRename: threadActions.commitRename,
    revealedThreadId: threadActions.revealedThreadId,
    setRevealedThreadId: threadActions.setRevealedThreadId,
    handleThreadTouchStart: threadActions.handleThreadTouchStart,
    handleThreadTouchEnd: threadActions.handleThreadTouchEnd,
    longPressTriggeredRef: threadActions.longPressTriggeredRef,
    createNewThread,
    handleDeleteThread,

    escalationStatuses: escalation.escalationStatuses,
    escalateSheetThreadId: escalation.escalateSheetThreadId,
    setEscalateSheetThreadId: escalation.setEscalateSheetThreadId,
    escalateEmail: escalation.escalateEmail,
    setEscalateEmail: escalation.setEscalateEmail,
    escalating: escalation.escalating,
    escalateError: escalation.escalateError,
    setEscalateError: escalation.setEscalateError,
    handleEscalateThread: escalation.handleEscalateThread,

    exportingThreadId: threadExport.exportingThreadId,
    handleExportThreadPDF: threadExport.handleExportThreadPDF,

    profileName: profile.profileName,
    avatarUrl: profile.avatarUrl,
    currentPlan: profile.currentPlan,

    isDark: appChrome.isDark,
    pwaInstallable: appChrome.pwaInstallable,
    setPwaInstallable: appChrome.setPwaInstallable,
    showPlans: appChrome.showPlans,
    setShowPlans: appChrome.setShowPlans,

    signOut,
  };
}
