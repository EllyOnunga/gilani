import { Type, Eye, Zap, Monitor, Loader2 } from "lucide-react";
import type { useSettings } from "@/client/components/settings/hooks/useSettings";

type Props = {
  settings: ReturnType<typeof useSettings>;
};

export function AccessibilityTab({ settings }: Props) {
  const { preferences, updatePreference, busy, handleProfileSave } = settings;

  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
      <div className="flex items-center gap-2.5">
        <Monitor className="h-5 w-5 text-primary" />
        <h3 className="font-serif text-xl font-bold text-foreground">Accessibility</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Adjust the interface to match your visual and reading preferences.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Type className="h-4 w-4 text-muted-foreground" />
            Font Size Scale
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "compact", label: "Compact" },
              { id: "standard", label: "Standard" },
              { id: "large", label: "Large" },
            ].map((size) => (
              <button
                key={size.id}
                onClick={() => updatePreference("fontSize", size.id)}
                className={`rounded-xl border py-2 text-xs font-medium transition-all ${
                  preferences.fontSize === size.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-4 mt-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="acc-motion" className="text-sm font-semibold text-foreground">
                Reduce Motion
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Disable slide animations and transitions.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="acc-motion"
              className="sr-only peer"
              checked={preferences.reduceMotion}
              onChange={(e) => updatePreference("reduceMotion", e.target.checked)}
            />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="acc-contrast" className="text-sm font-semibold text-foreground">
                High Contrast Mode
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Increase contrast for better readability.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="acc-contrast"
              className="sr-only peer"
              checked={preferences.highContrast}
              onChange={(e) => updatePreference("highContrast", e.target.checked)}
            />
            <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>
    </section>
  );
}
