import type { FormEvent } from "react";
import { Logo } from "@/client/components/ui/logo";
import { User, ArrowRight, Loader2 } from "lucide-react";

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="relative w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-300">
        {/* Outer glow */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-[#C96A3D]/20 via-transparent to-transparent blur-sm pointer-events-none" />

        <div className="relative rounded-3xl border border-white/[0.08] bg-[#13151f]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#C96A3D] to-transparent opacity-70" />

          <div className="p-7 sm:p-9 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2 pt-1">
              <Logo to="/" size="md" className="mx-auto" />
              <div className="space-y-1 pt-1">
                <h1 className="font-serif text-2xl font-black text-white tracking-tight">
                  Almost there!
                </h1>
                <p className="text-sm text-white/40">
                  What should we call you? This will be your display name.
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Your full name"
                  value={displayName}
                  maxLength={100}
                  onChange={(e) => onDisplayNameChange(e.target.value)}
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 py-3.5 text-sm text-white placeholder-white/25 focus:border-[#C96A3D]/50 focus:outline-none focus:ring-1 focus:ring-[#C96A3D]/30 focus:bg-white/[0.06] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !displayName.trim()}
                className="group w-full flex items-center justify-center gap-2 rounded-2xl bg-[#C96A3D] py-3.5 text-sm font-bold text-white hover:bg-[#D9784A] active:scale-[0.98] disabled:opacity-50 transition-all duration-200 shadow-lg shadow-[#C96A3D]/20"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Let's Go
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
