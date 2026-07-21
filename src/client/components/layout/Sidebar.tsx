import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home,
  MessageSquare,
  FileText,
  PenTool,
  Calendar,
  Star,
  ShieldAlert,
  Users,
  X,
  PanelLeft,
  PanelLeftClose,
  Pencil,
  Trash2,
  Loader2,
  Settings,
  Mail,
  LogOut,
  Plus,
  Search,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/client/components/ui/dropdown-menu";
import { Logo } from "@/client/components/ui/logo";
import { PresetAvatarSVG } from "@/client/components/settings/PresetAvatarSVG";
import { ThreadActionSheet } from "@/client/components/layout/ThreadActionSheet";
import { EscalateModal } from "@/client/components/tutor/EscalateModal";
import { useI18n } from "@/client/i18n/I18nContext";
import type { useAuthedShell } from "@/client/components/layout/hooks/useAuthedShell";

type Props = {
  shell: ReturnType<typeof useAuthedShell>;
};

function isNavActive(path: string, to: string, exact?: boolean) {
  if (exact) return path === to || path === to + "/";
  return path.startsWith(to);
}

export function Sidebar({ shell }: Props) {
  const [threadSearch, setThreadSearch] = useState("");

  const {
    sidebarOpen,
    setSidebarOpen,
    collapsed,
    toggleCollapsed,
    isTeacher,
    isAdmin,
    path,
    threads,
    threadsLoading,
    groupedThreads,
    createNewThread,
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
    deleteConfirmId,
    setDeleteConfirmId,
    handleDeleteThread,
    profileName,
    avatarUrl,
    currentPlan,
    user,
    signOut,
    escalationStatuses,
    escalateSheetThreadId,
    setEscalateSheetThreadId,
    escalateEmail,
    setEscalateEmail,
    escalating,
    escalateError,
    setEscalateError,
    handleEscalateThread,
    exportingThreadId,
    handleExportThreadPDF,
    setShowPlans,
  } = shell;

  // Filter grouped threads by search query (student only)
  const filteredGroupedThreads = threadSearch.trim()
    ? (Object.fromEntries(
        (Object.keys(groupedThreads) as Array<keyof typeof groupedThreads>).map((key) => [
          key,
          groupedThreads[key].filter((t) =>
            t.title?.toLowerCase().includes(threadSearch.toLowerCase()),
          ),
        ]),
      ) as unknown as typeof groupedThreads)
    : groupedThreads;

  // Right panel is shown for students only when sidebar is not collapsed
  const hasPanel = !isTeacher && !isAdmin && !collapsed;

  const { t } = useI18n();

  // Student nav items — rebuilt each render so labels respond to language changes
  const STUDENT_NAV = [
    { icon: Home, label: t("nav_home"), to: "/tutor", exact: true },
    { icon: MessageSquare, label: t("nav_chats"), to: "/tutor/chats" },
    { icon: FileText, label: t("nav_notes"), to: "/tutor/documents" },
    { icon: PenTool, label: t("nav_quizzes"), to: "/tutor/quizzes" },
    { icon: Calendar, label: t("nav_planner"), to: "/tutor/planner" },
    { icon: Star, label: t("nav_saved"), to: "/tutor/saved" },
  ] as const;

  const renderUserMenu = (isCompact = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-3 transition-all cursor-pointer outline-none text-left ${
            isCompact
              ? "justify-center w-9 h-9 rounded-full overflow-hidden border border-transparent hover:border-border lg:border-border bg-transparent lg:bg-background/50 hover:bg-muted/40"
              : "w-full rounded-xl overflow-hidden border border-transparent hover:border-border bg-transparent lg:bg-background/50 hover:bg-muted/40 p-2"
          }`}
        >
          <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full overflow-hidden border border-border bg-background/50 shadow-inner">
            {avatarUrl ? (
              avatarUrl.startsWith("preset:") ? (
                <PresetAvatarSVG preset={avatarUrl.substring(7)} />
              ) : (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              )
            ) : (
              <span className="font-serif text-[11px] font-bold text-foreground">
                {(profileName || user?.email || "U").substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          {!isCompact && (
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-semibold truncate text-foreground leading-tight">
                {profileName || user?.email?.split("@")[0]}
              </p>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary mt-0.5">
                {currentPlan} PLAN
              </p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={isCompact ? "right" : "top"}
        align={isCompact ? "end" : "start"}
        className="w-64 p-2 shadow-lg rounded-xl"
      >
        <DropdownMenuLabel className="px-4 py-2">
          <p className="text-sm font-semibold truncate">
            {profileName || user?.email?.split("@")[0]}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <span className="inline-flex mt-1 items-center rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
            {currentPlan}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem asChild>
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex w-full items-center gap-3 cursor-pointer px-4 py-3 text-sm font-medium rounded-lg"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
            <span>{t("nav_settings")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/contact"
            onClick={() => setSidebarOpen(false)}
            className="flex w-full items-center gap-3 cursor-pointer px-4 py-3 text-sm font-medium rounded-lg"
          >
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span>Contact</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem
          onClick={signOut}
          className="text-destructive focus:text-destructive flex items-center gap-3 cursor-pointer px-4 py-3 text-sm font-medium rounded-lg"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* ── Sidebar Shell ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col lg:flex-row
          border-r border-border/50
          bg-sidebar/95 backdrop-blur-xl
          shadow-xl lg:shadow-[4px_0_24px_-4px_rgba(0,0,0,0.05)]
          overflow-hidden
          transition-[transform,width] duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:h-screen
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "w-14" : "w-[340px]"}
        `}
      >
        {/* ══════════════════════════════════
            LEFT RAIL (Desktop) / TOP (Mobile)
        ══════════════════════════════════ */}
        <div className="flex flex-col w-full lg:w-14 flex-shrink-0 lg:border-r border-b lg:border-b-0 border-border/30 pt-4 pb-2 lg:py-3">
          {/* Logo & Mobile Close */}
          <div className="mb-4 flex items-center justify-between lg:justify-center px-4 lg:px-0">
            <Logo to="/tutor" onClick={() => setSidebarOpen(false)} size="sm" />
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted/40 transition-all lg:hidden"
              title="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <TooltipProvider delayDuration={150}>
            {/* ── Nav links ── */}
            <nav className="flex flex-col lg:items-center gap-1 flex-1 w-full px-3 lg:px-2">
              {/* Student nav */}
              {!isTeacher && !isAdmin && (
                <>
                  {STUDENT_NAV.map((item) => {
                    const active = isNavActive(
                      path,
                      item.to,
                      "exact" in item ? item.exact : undefined,
                    );
                    return (
                      <Tooltip key={item.label}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.to as any}
                            onClick={() => setSidebarOpen(false)}
                            className={`
                              relative flex items-center lg:justify-center
                              px-3 lg:px-0 h-10 w-full lg:w-10 rounded-xl
                              transition-all duration-150
                              ${
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                              }
                            `}
                          >
                            {active && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-primary rounded-r" />
                            )}
                            <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                            <span className="ml-3 font-medium text-sm lg:hidden">{item.label}</span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="hidden lg:block">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}

                  {/* Escalate Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setSidebarOpen(false);
                          const isTutorThread =
                            path.startsWith("/tutor/") && path !== "/tutor" && path !== "/tutor/";
                          if (isTutorThread) {
                            window.dispatchEvent(new CustomEvent("custom:trigger-escalation"));
                          }
                        }}
                        className="relative flex items-center lg:justify-center px-3 lg:px-0 h-10 w-full lg:w-10 rounded-xl text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all duration-150 cursor-pointer"
                      >
                        <ShieldAlert className="h-[18px] w-[18px] flex-shrink-0" />
                        <span className="ml-3 font-medium text-sm lg:hidden">Escalate</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="hidden lg:block">
                      Escalate
                    </TooltipContent>
                  </Tooltip>
                </>
              )}

              {/* Teacher nav */}
              {isTeacher && (
                <>
                  <p className="text-[8px] font-semibold uppercase tracking-widest text-muted-foreground/50 lg:text-center mt-2 mb-1 px-3 lg:px-0">
                    Teacher
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to="/teacher/escalations"
                        onClick={() => setSidebarOpen(false)}
                        className={`relative flex items-center lg:justify-center px-3 lg:px-0 h-10 w-full lg:w-10 rounded-xl transition-all duration-150 ${
                          path.startsWith("/teacher/escalations")
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        {path.startsWith("/teacher/escalations") && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-primary rounded-r" />
                        )}
                        <ShieldAlert className="h-[18px] w-[18px] flex-shrink-0" />
                        <span className="ml-3 font-medium text-sm lg:hidden">Escalations</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="hidden lg:block">
                      Escalations
                    </TooltipContent>
                  </Tooltip>
                </>
              )}

              {/* Admin nav */}
              {isAdmin && (
                <>
                  <p className="text-[8px] font-semibold uppercase tracking-widest text-muted-foreground/50 lg:text-center mt-2 mb-1 px-3 lg:px-0">
                    Admin
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to="/admin/users"
                        onClick={() => setSidebarOpen(false)}
                        className={`relative flex items-center lg:justify-center px-3 lg:px-0 h-10 w-full lg:w-10 rounded-xl transition-all duration-150 ${
                          path.startsWith("/admin")
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        }`}
                      >
                        {path.startsWith("/admin") && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-primary rounded-r" />
                        )}
                        <Users className="h-[18px] w-[18px] flex-shrink-0" />
                        <span className="ml-3 font-medium text-sm lg:hidden">Dashboard</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="hidden lg:block">
                      Dashboard
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </nav>

            {/* ── Rail bottom: collapse toggle + desktop user avatar ── */}
            <div className="hidden lg:flex flex-col items-center gap-2 px-2 mt-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleCollapsed}
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all duration-150"
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    {collapsed ? (
                      <PanelLeft className="h-4 w-4" />
                    ) : (
                      <PanelLeftClose className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{collapsed ? "Expand" : "Collapse"}</TooltipContent>
              </Tooltip>

              {!hasPanel && <div className="mb-1">{renderUserMenu(true)}</div>}
            </div>
          </TooltipProvider>
        </div>

        {/* ══════════════════════════════════
            RIGHT PANEL (Desktop) / BOTTOM (Mobile)
        ══════════════════════════════════ */}
        {hasPanel && (
          <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-sidebar/50 lg:bg-transparent">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                {t("nav_chats")}
              </h2>
              <button
                onClick={createNewThread}
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
                title={t("nav_new_chat")}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("nav_new_chat").split(" ")[0]}
              </button>
            </div>

            {/* Search bar */}
            <div className="px-3 pb-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t("sidebar_search")}
                  value={threadSearch}
                  onChange={(e) => setThreadSearch(e.target.value)}
                  className="w-full rounded-lg bg-muted/30 border border-border/30 pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-border/60 focus:bg-muted/50 transition-all"
                />
                {threadSearch && (
                  <button
                    onClick={() => setThreadSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/30 mx-3 flex-shrink-0" />

            {/* Thread list — scrolls independently */}
            <div className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
              {threadsLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground/60 animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading chats…</span>
                </div>
              ) : threads.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground/40 italic">No recent chats</p>
              ) : (
                (Object.keys(filteredGroupedThreads) as Array<keyof typeof groupedThreads>).map(
                  (key) => {
                    const groupThreads = filteredGroupedThreads[key];
                    if (!groupThreads || groupThreads.length === 0) return null;
                    const label = {
                      today: t("sidebar_today"),
                      yesterday: t("sidebar_yesterday"),
                      last7Days: t("sidebar_this_week"),
                      older: t("sidebar_older"),
                    }[key];
                    return (
                      <div key={key} className="space-y-1">
                        <h4 className="px-2.5 text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider border-b border-border/20 pb-1 mb-1.5">
                          {label}
                        </h4>
                        <div className="space-y-[2px]">
                          {groupThreads.map((t) => {
                            const isCurrent =
                              path === `/tutor/${t.id}` || path.startsWith(`/tutor/${t.id}/`);
                            return (
                              <div
                                key={t.id}
                                data-thread-id={t.id}
                                onTouchStart={() => handleThreadTouchStart(t.id)}
                                onTouchEnd={handleThreadTouchEnd}
                                onTouchMove={handleThreadTouchEnd}
                                onContextMenu={(e) => e.preventDefault()}
                                style={{
                                  WebkitTouchCallout: "none",
                                  touchAction: "manipulation",
                                }}
                                className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 lg:py-1 text-xs transition-all relative select-none ${
                                  isCurrent
                                    ? "bg-muted/40 text-foreground font-semibold"
                                    : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                                }`}
                              >
                                {renamingId === t.id ? (
                                  <input
                                    ref={renameInputRef}
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={() => commitRename(t.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        commitRename(t.id);
                                      }
                                      if (e.key === "Escape") {
                                        e.preventDefault();
                                        setRenamingId(null);
                                      }
                                    }}
                                    className="flex-1 min-w-0 bg-transparent border border-border/40 rounded-md px-1.5 py-0.5 text-xs outline-hidden focus:border-border"
                                    autoFocus
                                  />
                                ) : (
                                  <Link
                                    to={"/tutor/$threadId"}
                                    params={{ threadId: t.id }}
                                    onClick={(e) => {
                                      if (longPressTriggeredRef.current) {
                                        e.preventDefault();
                                        return;
                                      }
                                      setSidebarOpen(false);
                                    }}
                                    onDoubleClick={(e) => {
                                      e.preventDefault();
                                      startRename(t.id, t.title || "Untitled Chat");
                                    }}
                                    onContextMenu={(e) => e.preventDefault()}
                                    draggable={false}
                                    style={{
                                      WebkitTouchCallout: "none",
                                      WebkitUserSelect: "none",
                                      userSelect: "none",
                                      touchAction: "manipulation",
                                    }}
                                    className="truncate flex-1 py-0.5 text-left outline-hidden"
                                  >
                                    {t.title || ""}
                                  </Link>
                                )}

                                {renamingId !== t.id && (
                                  <div className="hidden lg:flex items-center flex-shrink-0 gap-0.5 opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 focus-within:opacity-100 focus-within:scale-100">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        startRename(t.id, t.title || "Untitled Chat");
                                      }}
                                      className="flex items-center rounded-md p-1 hover:bg-muted text-muted-foreground/60 hover:text-foreground cursor-pointer"
                                      title="Rename"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDeleteConfirmId(t.id);
                                      }}
                                      className="flex items-center rounded-md p-1 hover:bg-destructive/10 text-muted-foreground/60 hover:text-destructive cursor-pointer"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  },
                )
              )}
            </div>

            {/* Bottom section: User profile & Upgrade */}
            <div className="flex-shrink-0 border-t border-border/30 p-3 bg-sidebar lg:bg-transparent flex flex-row items-center justify-between gap-2">
              <div className="flex-1 min-w-0">{renderUserMenu(false)}</div>

              {currentPlan !== "pro" && (
                <div className="flex-shrink-0">
                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      setShowPlans(true);
                    }}
                    className="flex items-center justify-center rounded-lg bg-[#d9531e] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#c44819] transition-colors shadow-sm cursor-pointer"
                  >
                    Upgrade
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile-only user menu for teacher/admin (no right panel exists to hold it) */}
        {(isTeacher || isAdmin) && (
          <div className="lg:hidden mt-auto flex-shrink-0 border-t border-border/30 p-3 bg-sidebar flex flex-row items-center justify-between gap-2">
            <div className="flex-1 min-w-0">{renderUserMenu(false)}</div>
          </div>
        )}
      </aside>

      {/* ── Modals (unchanged) ── */}
      {revealedThreadId &&
        (() => {
          const activeThread = threads.find((th) => th.id === revealedThreadId);
          if (!activeThread) return null;
          return (
            <ThreadActionSheet
              thread={activeThread}
              escalationStatus={escalationStatuses[activeThread.id] ?? null}
              isExporting={exportingThreadId === activeThread.id}
              onClose={() => setRevealedThreadId(null)}
              onRename={() => {
                startRename(activeThread.id, activeThread.title || "Untitled Chat");
                setRevealedThreadId(null);
              }}
              onExport={() => {
                handleExportThreadPDF(activeThread.id);
                setRevealedThreadId(null);
              }}
              onEscalate={() => {
                setEscalateSheetThreadId(activeThread.id);
                setRevealedThreadId(null);
              }}
              onDelete={() => {
                setDeleteConfirmId(activeThread.id);
                setRevealedThreadId(null);
              }}
            />
          );
        })()}

      {escalateSheetThreadId && (
        <EscalateModal
          teacherEmail={escalateEmail}
          onEmailChange={(val) => {
            setEscalateEmail(val);
            setEscalateError("");
          }}
          onConfirm={() => handleEscalateThread(escalateSheetThreadId, escalateEmail)}
          onCancel={() => {
            setEscalateSheetThreadId(null);
            setEscalateEmail("");
            setEscalateError("");
          }}
          isEscalating={escalating}
          error={escalateError}
        />
      )}
    </>
  );
}
