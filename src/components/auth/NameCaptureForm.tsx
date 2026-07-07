import type { FormEvent } from "react";
import { Logo } from "@/components/ui/logo";
import { User } from "lucide-react";

interface NameCaptureFormProps {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  saving: boolean;
}

export function NameCaptureForm({
  displayName,
  onDisplayNameChange,
  onSubmit,
  saving,
}: NameCaptureFormProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0f1e] p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/8 bg-[#1a1d27] shadow-2xl p-8 sm:p-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center space-y-2">
          <Logo to="/" size="md" className="mx-auto" />
          <h1 className="font-serif text-2xl font-black text-white pt-2">Almost there!</h1>
          <p className="text-xs text-[#9ca3af]">
            What should we call you? This will be your display name.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#9ca3af]">Display Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
              <input
                type="text"
                required
                autoFocus
                placeholder="Your Name"
                value={displayName}
                maxLength={100}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                className="w-full rounded-xl border border-white/8 bg-[#0f1117] pl-10 pr-4 py-3 text-sm text-white placeholder-[#6b7280] focus:border-[#C96A3D]/50 focus:outline-none focus:ring-1 focus:ring-[#C96A3D]/50 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="w-full rounded-xl bg-[#C96A3D] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#E28743] disabled:opacity-50 transition-all shadow-lg shadow-[#C96A3D]/25"
          >
            {saving ? "Setting up your account…" : "Let's Go →"}
          </button>
        </form>
      </div>
    </div>
  );
}
