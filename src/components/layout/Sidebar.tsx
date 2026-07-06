import { Link } from "@tanstack/react-router";
import { 
  Home, MessageSquare, FileText, PenTool, Calendar, Star, 
  ShieldAlert, Users, X, PanelLeft, PanelLeftClose, 
  Pencil, Trash2, Loader2, Settings, Mail, Smartphone, LogOut 
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/ui/logo";
import { PresetAvatarSVG } from "@/components/settings/PresetAvatarSVG";
import { ThreadActionSheet } from "@/components/layout/ThreadActionSheet";
import { EscalateModal } from "@/components/tutor/EscalateModal";
import type { useAuthedShell } from "@/components/layout/hooks/useAuthedShell";
import pkg from "../../../package.json";

type Props = {
  shell: ReturnType<typeof useAuthedShell>;
};

export function Sidebar({ shell }: Props) {
  const {
    sidebarOpen, setSidebarOpen, collapsed, toggleCollapsed,
    isStudent, isTeacher, isAdmin,
    path, threads, threadsLoading, groupedThreads,
    createNewThread, renamingId, setRenamingId, renameValue, setRenameValue, renameInputRef,
    startRename, commitRename, revealedThreadId, setRevealedThreadId,
    handleThreadTouchStart, handleThreadTouchEnd, longPressTriggeredRef,
    deleteConfirmId, setDeleteConfirmId, handleDeleteThread,
    profileName, avatarUrl, currentPlan, user, pwaInstallable, setPwaInstallable,
    signOut,
    escalationStatuses, escalateSheetThreadId, setEscalateSheetThreadId,
    escalateEmail, setEscalateEmail, escalating, escalateError, setEscalateError,
    handleEscalateThread, exportingThreadId, handleExportThreadPDF,
  } = shell;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar p-4 transition-[transform,width] duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen overflow-hidden rounded-r-2xl ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } ${collapsed ? "w-80 lg:w-[60px] lg:p-2" : "w-80"}`}
    >
      <div className="flex items-center justify-between mb-6 min-w-0 w-full gap-2">
        <div className={`flex flex-col items-start justify-center min-w-0 flex-1 ${collapsed ? "lg:items-center lg:mx-auto" : ""}`}>
          <Logo to="/tutor" onClick={() => setSidebarOpen(false)} size={collapsed ? "sm" : "md"} className={collapsed ? "mx-auto" : ""} />

        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isTeacher && !isAdmin && (
            <button
              onClick={createNewThread}
              className={`flex items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-foreground hover:bg-muted/40 transition-colors ${
                collapsed ? "lg:h-8 lg:w-8 lg:p-1.5 gap-1.5 px-3 py-1.5 text-sm font-semibold" : "gap-1.5 px-3 py-1.5 text-sm font-semibold"
              }`}
              title="New Chat"
            >
              <span className={collapsed ? "lg:hidden" : ""}>New Chat</span>
              <span className={collapsed ? "hidden lg:inline text-xs font-bold" : "hidden"}>New</span>
            </button>
          )}
          <button onClick={() => setSidebarOpen(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent lg:hidden flex-shrink-0" title="Close menu">
            <X className="h-5 w-5" />
          </button>
          <button onClick={toggleCollapsed} className="hidden lg:flex rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground flex-shrink-0 transition-colors" title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <nav className="flex-1 flex flex-col space-y-1 min-h-0 overflow-hidden">
        {!isTeacher && !isAdmin && (
          <TooltipProvider delayDuration={200}>
            {/* Home Link */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/tutor"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center rounded-lg text-sm font-medium transition-colors relative ${collapsed ? "lg:justify-center lg:px-2 gap-3 px-3 py-2" : "gap-3 px-3 py-2"} ${
                    path === "/tutor" ? "text-foreground font-semibold bg-muted/40 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:bg-foreground before:rounded-r" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                  }`}
                >
                  <Home className="h-4 w-4 flex-shrink-0" />
                  <span className={collapsed ? "lg:hidden" : ""}>Home</span>
                </Link>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right" className="hidden lg:block">Home</TooltipContent>}
            </Tooltip>

            {/* Chats Link */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/tutor/chats"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex w-full items-center rounded-lg text-sm font-medium transition-colors relative ${collapsed ? "lg:justify-center lg:px-2 gap-3 px-3 py-2" : "gap-3 px-3 py-2"} ${
                    path === "/tutor/chats" || path.startsWith("/tutor/chats") ? "text-foreground font-semibold bg-muted/40 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:bg-foreground before:rounded-r" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className={collapsed ? "lg:hidden" : ""}>Chats</span>
                </Link>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right" className="hidden lg:block">Chats</TooltipContent>}
            </Tooltip>

            {/* Dashboards */}
            {[
              { icon: FileText, label: "Notes", to: "/tutor/documents" },
              { icon: PenTool, label: "Quizzes", to: "/tutor/quizzes" },
              { icon: Calendar, label: "Planner", to: "/tutor/planner" },
              { icon: Star, label: "Saved", to: "/tutor/saved" },
            ].map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.to as any}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex w-full items-center rounded-lg text-sm font-medium transition-colors relative ${collapsed ? "lg:justify-center lg:px-2 gap-3 px-3 py-2" : "gap-3 px-3 py-2"} ${
                      path.startsWith(item.to) ? "text-foreground font-semibold bg-muted/40 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:bg-foreground before:rounded-r" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
                  </Link>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right" className="hidden lg:block">{item.label}</TooltipContent>}
              </Tooltip>
            ))}

            {/* Escalations Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    const isTutorThread = path.startsWith("/tutor/") && path !== "/tutor" && path !== "/tutor/";
                    if (isTutorThread) {
                      window.dispatchEvent(new CustomEvent("custom:trigger-escalation"));
                    }
                  }}
                  className={`flex w-full items-center rounded-lg text-sm font-medium transition-colors relative text-muted-foreground hover:bg-muted/20 hover:text-foreground ${collapsed ? "lg:justify-center lg:px-2 gap-3 px-3 py-2" : "gap-3 px-3 py-2"}`}
                >
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                  <span className={collapsed ? "lg:hidden" : ""}>Escalate</span>
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right" className="hidden lg:block">Escalate</TooltipContent>}
            </Tooltip>

            {/* Chat History Grouped */}
            <div className={`mt-4 space-y-4 flex-1 overflow-y-auto min-h-0 ${collapsed ? "hidden lg:hidden" : ""}`}>
              {threadsLoading ? (
                <div className="text-xs text-muted-foreground/60 py-2 px-3 flex items-center gap-2 animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/60" />
                  <span>Loading chats...</span>
                </div>
              ) : threads.length === 0 ? (
                <div className="text-xs text-muted-foreground/40 py-2 px-3 italic">No recent chats</div>
              ) : (
                (Object.keys(groupedThreads) as Array<keyof typeof groupedThreads>).map((key) => {
                  const groupThreads = groupedThreads[key];
                  if (groupThreads.length === 0) return null;
                  const label = { today: "Today", yesterday: "Yesterday", last7Days: "Last 7 Days", older: "Older" }[key];
                  return (
                    <div key={key} className="space-y-1">
                      <h4 className="px-2.5 text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider border-b border-border/20 pb-1 mb-2">
                        {label}
                      </h4>
                      <div className="space-y-[2px]">
                        {groupThreads.map((t) => {
                          const isCurrent = path === `/tutor/${t.id}` || path.startsWith(`/tutor/${t.id}/`);
                          return (
                            <div
                              key={t.id}
                              data-thread-id={t.id}
                              onTouchStart={() => handleThreadTouchStart(t.id)}
                              onTouchEnd={handleThreadTouchEnd}
                              onTouchMove={handleThreadTouchEnd}
                              onContextMenu={(e) => e.preventDefault()}
                              style={{ WebkitTouchCallout: "none", touchAction: "manipulation" }}
                              className={`group flex items-center justify-between rounded-lg px-2.5 py-1 text-xs transition-all relative select-none ${
                                isCurrent ? "bg-muted/40 text-foreground font-semibold" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                              }`}
                            >
                              {renamingId === t.id ? (
                                <input
                                  ref={renameInputRef}
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onBlur={() => commitRename(t.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") { e.preventDefault(); commitRename(t.id); }
                                    if (e.key === "Escape") { e.preventDefault(); setRenamingId(null); }
                                  }}
                                  className="flex-1 min-w-0 bg-transparent border border-border/40 rounded-md px-1.5 py-0.5 text-xs outline-hidden focus:border-border"
                                  autoFocus
                                />
                              ) : (
                                <Link
                                  to={"/tutor/$threadId"}
                                  params={{ threadId: t.id }}
                                  onClick={(e) => {
                                    if (longPressTriggeredRef.current) { e.preventDefault(); return; }
                                    setSidebarOpen(false);
                                  }}
                                  onDoubleClick={(e) => {
                                    e.preventDefault();
                                    startRename(t.id, t.title || "Untitled Chat");
                                  }}
                                  onContextMenu={(e) => e.preventDefault()}
                                  draggable={false}
                                  style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", touchAction: "manipulation" }}
                                  className="truncate flex-1 py-0.5 text-left outline-hidden"
                                >
                                  {t.title || ""}
                                </Link>
                              )}
                              {renamingId !== t.id && (
                                <div className="hidden lg:flex items-center flex-shrink-0 gap-0.5 opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 focus-within:opacity-100 focus-within:scale-100">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault(); e.stopPropagation();
                                      startRename(t.id, t.title || "Untitled Chat");
                                    }}
                                    className="flex items-center gap-1 rounded-md p-1 hover:bg-muted text-muted-foreground/60 hover:text-foreground cursor-pointer"
                                    title="Rename"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault(); e.stopPropagation();
                                      setDeleteConfirmId(t.id);
                                    }}
                                    className="flex items-center gap-1 rounded-md p-1 hover:bg-destructive/10 text-muted-foreground/60 hover:text-destructive cursor-pointer"
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
                })
              )}
            </div>
          </TooltipProvider>
        )}

        {isTeacher && (
          <>
            <div className="mt-6 px-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60 border-b border-border/20 pb-1 mb-2">Teacher</div>
            <Link
              to="/teacher/escalations"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative ${path.startsWith("/teacher/escalations") ? "text-foreground font-semibold bg-muted/40 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:bg-foreground before:rounded-r" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"}`}
            >
              <ShieldAlert className="h-4 w-4" /> Escalations
            </Link>
          </>
        )}
        {isAdmin && (
          <>
            <div className="mt-6 px-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60 border-b border-border/20 pb-1 mb-2">Admin</div>
            <Link
              to="/admin/users"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative ${path.startsWith("/admin") ? "text-foreground font-semibold bg-muted/40 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-0.5 before:bg-foreground before:rounded-r" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"}`}
            >
              <Users className="h-4 w-4" /> Users & Roles
            </Link>
          </>
        )}
      </nav>

      {revealedThreadId && (() => {
        const activeThread = threads.find((th) => th.id === revealedThreadId);
        if (!activeThread) return null;
        return (
          <ThreadActionSheet
            thread={activeThread}
            escalationStatus={escalationStatuses[activeThread.id] ?? null}
            isExporting={exportingThreadId === activeThread.id}
            onClose={() => setRevealedThreadId(null)}
            onRename={() => { startRename(activeThread.id, activeThread.title || "Untitled Chat"); setRevealedThreadId(null); }}
            onExport={() => { handleExportThreadPDF(activeThread.id); setRevealedThreadId(null); }}
            onEscalate={() => { setEscalateSheetThreadId(activeThread.id); setRevealedThreadId(null); }}
            onDelete={() => { setDeleteConfirmId(activeThread.id); setRevealedThreadId(null); }}
          />
        );
      })()}

      {escalateSheetThreadId && (
        <EscalateModal
          teacherEmail={escalateEmail}
          onEmailChange={(val) => { setEscalateEmail(val); setEscalateError(""); }}
          onConfirm={() => handleEscalateThread(escalateSheetThreadId, escalateEmail)}
          onCancel={() => { setEscalateSheetThreadId(null); setEscalateEmail(""); setEscalateError(""); }}
          isEscalating={escalating}
          error={escalateError}
        />
      )}

      <div className="mt-auto border-t border-border pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex w-full items-center rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer text-left outline-hidden ${collapsed ? "lg:justify-center lg:p-1 gap-2 p-2" : "gap-2 p-2"}`}>
              <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full overflow-hidden border border-border bg-background/50 shadow-inner">
                {avatarUrl ? (
                  avatarUrl.startsWith("preset:") ? <PresetAvatarSVG preset={avatarUrl.substring(7)} /> : <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-serif text-[11px] font-bold text-foreground">{(profileName || user?.email || "U").substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="truncate text-xs font-semibold leading-tight text-foreground" title={profileName || user?.email || ""}>
                    {profileName || user?.email?.split("@")[0]}
                  </p>
                  <span className="inline-flex flex-shrink-0 items-center rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                    {currentPlan}
                  </span>
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60">
            <DropdownMenuItem asChild>
              <Link to="/settings" onClick={() => setSidebarOpen(false)} className="flex w-full items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" /><span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/contact" onClick={() => setSidebarOpen(false)} className="flex w-full items-center gap-2 cursor-pointer">
                <Mail className="h-4 w-4" /><span>Contact</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
