import { Brain, Save } from "lucide-react";
import type { useSettings } from "@/client/components/settings/hooks/useSettings";

type Props = {
  settings: ReturnType<typeof useSettings>;
};

export function TutorPreferencesTab({ settings }: Props) {
  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
      <div className="flex items-center gap-2.5">
        <Brain className="h-5 w-5 text-primary" />
        <h3 className="font-serif text-xl font-bold text-foreground">Tutor Preferences</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Personalize how GilaniAI responds to your study questions. Choose styles that match your
        preferred learning pacing.
      </p>

      <div className="space-y-3">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Tutor Tone / Personality
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: "encouraging", label: "Encouraging", desc: "Warm & supportive" },
              { id: "scholarly", label: "Scholarly", desc: "Formal & precise" },
              { id: "friendly", label: "Friendly", desc: "Casual & conversational" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => settings.setTutorTone(t.id)}
                className={`rounded-xl border p-3.5 text-left transition-all ${settings.tutorTone === t.id ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30" : "border-border hover:bg-accent hover:border-primary/20"}`}
              >
                <p className="text-xs font-bold">{t.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Teaching Methodology
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: "socratic", label: "Socratic Method", desc: "Guides with hints" },
              { id: "direct", label: "Direct Mentor", desc: "Immediate solutions" },
              { id: "rigorous", label: "Proofs & Derivations", desc: "First principles" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => settings.setTutorStyle(t.id)}
                className={`rounded-xl border p-3.5 text-left transition-all ${settings.tutorStyle === t.id ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30" : "border-border hover:bg-accent hover:border-primary/20"}`}
              >
                <p className="text-xs font-bold">{t.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Scaffolding Depth Level
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: "guided", label: "Highly Scaffolded", desc: "Small incremental hints" },
              { id: "standard", label: "Standard Paced", desc: "Standard target level" },
              { id: "rigorous", label: "Deep Challenges", desc: "Minimal hand-holding" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => settings.setTutorDepth(t.id)}
                className={`rounded-xl border p-3.5 text-left transition-all ${settings.tutorDepth === t.id ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30" : "border-border hover:bg-accent hover:border-primary/20"}`}
              >
                <p className="text-xs font-bold">{t.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-border/50" />

      <div className="space-y-4">
        <h4 className="font-serif text-lg font-bold text-foreground">Student Profile</h4>
        <p className="text-[11px] text-muted-foreground leading-relaxed -mt-2">
          Providing your grade and subjects helps GilaniAI tailor explanations automatically.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Current Grade / Year</label>
            <input
              type="text"
              placeholder="e.g. Form 4, Year 11"
              value={settings.preferences.grade || ""}
              onChange={(e) => settings.updatePreference("grade", e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Target Grade (Optional)</label>
            <input
              type="text"
              placeholder="e.g. A, Distinction"
              value={settings.preferences.targetGrade || ""}
              onChange={(e) => settings.updatePreference("targetGrade", e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Subjects Enrolled (comma separated)
          </label>
          <input
            type="text"
            placeholder="e.g. Maths, Physics, Chemistry, Biology"
            value={
              Array.isArray(settings.preferences.subjectsEnrolled)
                ? settings.preferences.subjectsEnrolled.join(", ")
                : ""
            }
            onChange={(e) =>
              settings.updatePreference(
                "subjectsEnrolled",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      <hr className="border-border/50" />

      <div className="space-y-4">
        <h4 className="font-serif text-lg font-bold text-foreground">Advanced Knobs</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Response Language</label>
            <select
              value={settings.preferences.responseLanguage || "english"}
              onChange={(e) => settings.updatePreference("responseLanguage", e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
            >
              <option value="english">English Only</option>
              <option value="swahili">Swahili Only</option>
              <option value="mixed">Mixed (English/Swahili)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Math Rendering</label>
            <select
              value={settings.preferences.mathRendering || "latex"}
              onChange={(e) => settings.updatePreference("mathRendering", e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
            >
              <option value="latex">Full LaTeX (Strict)</option>
              <option value="simplified">Simplified Notation</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={settings.preferences.stepByStepDefault ?? true}
              onChange={(e) => settings.updatePreference("stepByStepDefault", e.target.checked)}
              className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary/50"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Always show step-by-step workings
              </span>
              <span className="text-[10px] text-muted-foreground">
                Instead of just the final summary.
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={settings.preferences.autoSaveResponses ?? false}
              onChange={(e) => settings.updatePreference("autoSaveResponses", e.target.checked)}
              className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary/50"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Auto-save study responses
              </span>
              <span className="text-[10px] text-muted-foreground">
                Automatically add highlighted tutor messages to the Saved tab.
              </span>
            </div>
          </label>
        </div>
      </div>
    </section>
  );
}
