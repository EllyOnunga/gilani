import { Globe, MapPin, Clock } from "lucide-react";
import type { useSettings } from "@/client/components/settings/hooks/useSettings";

type Props = {
  settings: ReturnType<typeof useSettings>;
};

export function LanguageRegionTab({ settings }: Props) {
  const { preferences, updatePreference, busy, handleProfileSave } = settings;

  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
      <div className="flex items-center gap-2.5">
        <Globe className="h-5 w-5 text-primary" />
        <h3 className="font-serif text-xl font-bold text-foreground">Language & Region</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Set your preferred language and regional context to help the tutor provide more relevant
        examples.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            UI Language
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "en", label: "English" },
              { id: "sw", label: "Swahili" },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => updatePreference("uiLanguage", lang.id)}
                className={`rounded-xl border p-3 text-sm font-medium transition-all ${
                  preferences.uiLanguage === lang.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Curriculum
          </label>
          <select
            value={preferences.curriculum}
            onChange={(e) => updatePreference("curriculum", e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
          >
            <optgroup label="Secondary School (Kenya)">
              <option value="KCSE">8-4-4 / KCSE (Kenya)</option>
              <option value="CBC">CBC (Kenya)</option>
            </optgroup>
            <optgroup label="International Secondary">
              <option value="IGCSE">Cambridge IGCSE</option>
              <option value="A-LEVEL">A-Level</option>
              <option value="IB">International Baccalaureate (IB)</option>
            </optgroup>
            <optgroup label="Higher Education">
              <option value="University">University / College</option>
            </optgroup>
            <optgroup label="Other">
              <option value="General">General (No specific curriculum)</option>
            </optgroup>
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">
            We use this to tailor explanations to your specific exam board standards.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Timezone
          </label>
          <select
            value={preferences.timezone}
            onChange={(e) => updatePreference("timezone", e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
          >
            <option value="EAT">East Africa Time (EAT)</option>
            <option value="CAT">Central Africa Time (CAT)</option>
            <option value="WAT">West Africa Time (WAT)</option>
            <option value="SAST">South Africa Standard Time (SAST)</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleProfileSave}
          disabled={busy}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </section>
  );
}
