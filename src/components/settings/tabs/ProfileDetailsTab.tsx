import { User, Upload, Info, Save } from "lucide-react";
import type { useSettings } from "@/components/settings/hooks/useSettings";

type Props = {
  settings: ReturnType<typeof useSettings>;
  userEmail?: string;
  PresetAvatarSVG: React.FC<{ preset: string }>;
};

export function ProfileDetailsTab({ settings, userEmail, PresetAvatarSVG }: Props) {
  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
      <div className="flex items-center gap-2.5">
        <User className="h-5 w-5 text-primary" />
        <h3 className="font-serif text-xl font-bold text-foreground">Profile Details</h3>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 bg-background/40 border border-border/20 p-4 rounded-xl">
        <div className="relative group flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full overflow-hidden border-2 border-primary/20 bg-background shadow-inner">
          {settings.avatarUrl ? (
            settings.avatarUrl.startsWith("preset:") ? (
              <PresetAvatarSVG preset={settings.avatarUrl.substring(7)} />
            ) : (
              <img src={settings.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            )
          ) : (
            <span className="font-serif text-xl font-bold text-primary">
              {(settings.displayName || userEmail || "U").substring(0, 2).toUpperCase()}
            </span>
          )}
          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity duration-200">
            <Upload className="h-5 w-5 text-white" />
            <input type="file" onChange={settings.handlePhotoUpload} accept="image/*" className="sr-only" />
          </label>
        </div>

        <div className="flex-1 min-w-0 space-y-1 text-center sm:text-left">
          <p className="text-xs font-semibold text-foreground">{settings.displayName || "No name set"}</p>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center sm:justify-start gap-1">
            <Info className="h-3.5 w-3.5 flex-shrink-0 text-primary" /> Upload a photo or use your initials.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Display Name</label>
          <input
            type="text"
            required
            placeholder="e.g. John Doe"
            value={settings.displayName}
            onChange={(e) => settings.setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={settings.busy}
          onClick={settings.handleProfileSave}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/95 disabled:opacity-50 transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
        >
          <Save className="h-4 w-4" /> {settings.busy ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </section>
  );
}
