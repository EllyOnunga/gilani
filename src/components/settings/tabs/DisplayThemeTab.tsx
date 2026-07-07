import { Sun, Moon } from "lucide-react";
import type { useSettings } from "@/components/settings/hooks/useSettings";

type Props = {
  settings: ReturnType<typeof useSettings>;
};

export function DisplayThemeTab({ settings }: Props) {
  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
      <div className="flex items-center gap-2.5">
        {settings.isDark ? (
          <Moon className="h-5 w-5 text-primary" />
        ) : (
          <Sun className="h-5 w-5 text-primary" />
        )}
        <h3 className="font-serif text-xl font-bold text-foreground">Display Theme</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Choose between Light mode (scholarly warm parchment layout) and Dark mode (charcoal deep
        theme).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Light Theme Card */}
        <button
          type="button"
          onClick={() => settings.toggleTheme("light")}
          className={`group rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${!settings.isDark ? "border-primary bg-primary/5 shadow-sm scale-101" : "border-border bg-background hover:border-primary/40 hover:bg-accent/40"}`}
        >
          <div className="aspect-video w-full rounded-lg bg-orange-50 border border-amber-900/10 p-2 flex flex-col justify-between mb-3 shadow-inner">
            <div className="h-2.5 w-1/3 rounded-full bg-amber-900/20" />
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-amber-900/15" />
              <div className="h-1.5 w-5/6 rounded-full bg-amber-900/15" />
            </div>
          </div>
          <p className="text-sm font-bold flex items-center gap-2 text-amber-950">
            <Sun className="h-4 w-4 text-primary" /> Scholarly Parchment
          </p>
        </button>

        {/* Dark Theme Card */}
        <button
          type="button"
          onClick={() => settings.toggleTheme("dark")}
          className={`group rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${settings.isDark ? "border-primary bg-primary/5 shadow-sm scale-101" : "border-border bg-background hover:border-primary/40 hover:bg-accent/40"}`}
        >
          <div className="aspect-video w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 flex flex-col justify-between mb-3 shadow-inner">
            <div className="h-2.5 w-1/3 rounded-full bg-zinc-800" />
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-zinc-800" />
              <div className="h-1.5 w-5/6 rounded-full bg-zinc-800" />
            </div>
          </div>
          <p className="text-sm font-bold flex items-center gap-2 text-zinc-100">
            <Moon className="h-4 w-4 text-primary" /> Charcoal Dark
          </p>
        </button>
      </div>
    </section>
  );
}
