import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { authenticateRequest } from "@/lib/api-auth.server";
import { LayoutContext } from "@/contexts/layout-context";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { GilaniLoader } from "@/components/GilaniLoader";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PlansModal } from "@/components/PlansModal";
import { DeleteModal } from "@/components/tutor/DeleteModal";
import { useAuthedShell } from "@/components/layout/hooks/useAuthedShell";
import { Sidebar } from "@/components/layout/Sidebar";

const requireAuth = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { authenticated: null as boolean | null };
  }
  try {
    await authenticateRequest(request);
    return { authenticated: true };
  } catch {
    return { authenticated: false };
  }
});

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") {
      const { authenticated } = await requireAuth();
      if (authenticated === false) {
        throw redirect({ to: "/login", search: { redirect: location.href, signout: true } as any });
      }
    }
  },
  component: AuthedShell,
});

function AuthedShell() {
  const shell = useAuthedShell();
  const navigate = useNavigate();

  const studentOnlyPaths = ["/tutor", "/tutor"];
  const isOnStudentRoute = studentOnlyPaths.some((p) => shell.path === p || shell.path.startsWith(p + "/"));
  const shouldRedirectOffStudentRoute = (shell.isAdmin || shell.isTeacher) && isOnStudentRoute;

  useEffect(() => {
    if (shouldRedirectOffStudentRoute) {
      navigate({
        to: shell.isAdmin ? "/admin/users" : "/teacher/escalations",
        replace: true,
      } as any);
    }
  }, [shouldRedirectOffStudentRoute, shell.isAdmin]);

  if (shell.loading || !shell.user || shell.roles.length === 0) {
    return <GilaniLoader />;
  }

  if (shouldRedirectOffStudentRoute) {
    return <GilaniLoader />;
  }

  return (
    <div className="fixed inset-0 flex h-dvh w-full flex-col overflow-hidden overscroll-none lg:flex-row bg-background text-foreground">
      <DisclaimerModal />
      {shell.showPlans && <PlansModal onClose={() => shell.setShowPlans(false)} currentPlan={shell.currentPlan} />}

      {shell.sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => shell.setSidebarOpen(false)}
        />
      )}

      <Sidebar shell={shell} />

      <main className={`flex-1 min-w-0 min-h-0 flex flex-col overflow-x-hidden pb-16 lg:pb-0 ${shell.path.startsWith("/tutor") ? "overflow-hidden h-full" : "overflow-y-auto scroll-smooth"}`}>
        {!shell.path.startsWith("/tutor") && <Breadcrumb />}
        <div className="w-full flex-1 flex flex-col min-h-0">
          <LayoutContext.Provider
            value={{
              sidebarOpen: shell.sidebarOpen,
              setSidebarOpen: shell.setSidebarOpen,
              user: shell.user,
              createNewThread: shell.createNewThread,
              requestRenameThread: (id: string, title: string) => {
                shell.setSidebarOpen(true);
                shell.startRename(id, title);
              },
              requestDeleteThread: (id: string) => {
                shell.setSidebarOpen(true);
                shell.setDeleteConfirmId(id);
              },
            }}
          >
            <Outlet />
          </LayoutContext.Provider>
        </div>
      </main>

      {shell.deleteConfirmId && (
        <DeleteModal
          onConfirm={() => {
            const id = shell.deleteConfirmId;
            shell.setDeleteConfirmId(null);
            if (id) shell.handleDeleteThread(id);
          }}
          onCancel={() => shell.setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
