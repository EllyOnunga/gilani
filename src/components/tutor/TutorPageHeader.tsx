import { Menu, PanelLeft } from "lucide-react";
import { useLayout } from "@/contexts/layout-context";

interface TutorPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TutorPageHeader({ title, subtitle, actions }: TutorPageHeaderProps) {
  const { setSidebarOpen } = useLayout();

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-background px-4 sticky top-0 z-30 gap-2 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-full p-2 text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground active:scale-95 flex-shrink-0 lg:hidden"
          title="Open Menu"
        >
          <PanelLeft className="h-5 w-5" strokeWidth={2.25} />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </header>
  );
}
