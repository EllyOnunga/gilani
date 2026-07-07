import { Keyboard } from "lucide-react";
import type { useSettings } from "@/components/settings/hooks/useSettings";

type Props = {
  settings: ReturnType<typeof useSettings>;
};

export function ShortcutsTab({ settings }: Props) {
  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
      <div className="flex items-center gap-2.5">
        <Keyboard className="h-5 w-5 text-primary" />
        <h3 className="font-serif text-xl font-bold text-foreground">Keyboard Shortcuts</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Use these shortcuts to navigate the app quickly without using your mouse.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Navigation
          </p>
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background">
            <span className="text-sm font-semibold text-foreground">Toggle Sidebar</span>
            <kbd className="px-2 py-1 bg-muted rounded border border-border text-[10px] font-mono text-muted-foreground shadow-sm">
              Ctrl + B
            </kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background">
            <span className="text-sm font-semibold text-foreground">New Chat</span>
            <kbd className="px-2 py-1 bg-muted rounded border border-border text-[10px] font-mono text-muted-foreground shadow-sm">
              Ctrl + N
            </kbd>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Chat Actions
          </p>
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background">
            <span className="text-sm font-semibold text-foreground">Send Message</span>
            <kbd className="px-2 py-1 bg-muted rounded border border-border text-[10px] font-mono text-muted-foreground shadow-sm">
              Enter
            </kbd>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background">
            <span className="text-sm font-semibold text-foreground">New Line</span>
            <kbd className="px-2 py-1 bg-muted rounded border border-border text-[10px] font-mono text-muted-foreground shadow-sm">
              Shift + Enter
            </kbd>
          </div>
        </div>
      </div>
    </section>
  );
}
