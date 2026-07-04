import { Brain, Save } from "lucide-react";
import type { useSettings } from "@/components/settings/hooks/useSettings";

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
        Personalize how GilaniAI responds to your study questions. Choose styles that match your preferred learning pacing.
      </p>

      <div className="space-y-3">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Tutor Tone / Personality</label>
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
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Teaching Methodology</label>
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
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Scaffolding Depth Level</label>
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

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={settings.busy}
          onClick={settings.handleProfileSave}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/95 disabled:opacity-50 transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
        >
          <Save className="h-4 w-4" /> {settings.busy ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </section>
  );
}
