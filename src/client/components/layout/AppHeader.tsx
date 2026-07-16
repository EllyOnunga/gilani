import React from "react";
import { Menu } from "lucide-react";
import { useLayout } from "@/client/contexts/layout-context";
import { useAuth } from "@/client/hooks/use-auth";
import { NotificationBell } from "@/client/components/notifications";

interface AppHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  leftContent?: React.ReactNode;
  actions?: React.ReactNode;
  hideNotifications?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  leftContent,
  actions,
  hideNotifications,
}: AppHeaderProps) {
  const { setSidebarOpen } = useLayout();
  const { session } = useAuth();
  const userId = session?.user?.id;

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-background px-4 sticky top-0 z-30 gap-2 flex-shrink-0 min-w-0">
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-full p-2 text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground active:scale-95 flex-shrink-0 lg:hidden"
          title="Open Menu"
        >
          <Menu className="h-5 w-5" strokeWidth={2.25} />
        </button>
        {leftContent}
      </div>

      <div className="flex-1 flex flex-col justify-center min-w-0 px-2 lg:text-center text-left">
        {title && <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>}
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
        {actions}
        {!hideNotifications && userId && <NotificationBell userId={userId} />}
      </div>
    </header>
  );
}
