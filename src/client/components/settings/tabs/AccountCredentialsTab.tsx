import { Mail, Save } from "lucide-react";
import type { useSettings } from "@/client/components/settings/hooks/useSettings";

type Props = {
  settings: ReturnType<typeof useSettings>;
  userEmail?: string;
};

export function AccountCredentialsTab({ settings, userEmail }: Props) {
  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-xs space-y-6 animate-in-slide">
      <div className="flex items-center gap-2.5">
        <Mail className="h-5 w-5 text-primary" />
        <h3 className="font-serif text-xl font-bold text-foreground">Account Credentials</h3>
      </div>

      <form onSubmit={settings.handleEmailChange} className="space-y-2">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block">
          Change Email
        </label>
        <input
          type="email"
          placeholder="Current email address"
          value={userEmail ?? ""}
          readOnly
          className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
        />

        <input
          type="email"
          placeholder="New email address"
          value={settings.newEmail}
          onChange={(e) => settings.setNewEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
        />
        <button
          type="submit"
          disabled={settings.emailBusy || !settings.newEmail}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Mail className="h-3.5 w-3.5" /> {settings.emailBusy ? "Sending…" : "Update Email"}
        </button>
      </form>
    </section>
  );
}
