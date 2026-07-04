import { useState, type FormEvent } from "react";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { Mail, GraduationCap, User, X } from "lucide-react";
import { friendlyError } from "@/lib/async";

interface AuthModalProps {
    onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [busy, setBusy] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const onGoogle = async () => {
    setBusy(true);
    localStorage.setItem("pending_role", role);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback?next=/tutor`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    if (error) {
      localStorage.removeItem("pending_role");
      setBusy(false);
      return toast.error(friendlyError(error, "Google sign-in failed. Please try again."));
    }
  };

  const onSendMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email address.");
    setBusy(true);
    localStorage.setItem("pending_role", role);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/callback?next=/tutor`,
      },
    });
    setBusy(false);
    if (error) {
      localStorage.removeItem("pending_role");
      return toast.error(friendlyError(error, "Failed to send magic link."));
    }
    setMagicLinkSent(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        ></div>

        {/* Modal Content */}
        <div className="relative w-full max-w-md rounded-3xl border border-white/8 bg-[#1a1d27] shadow-2xl p-8 sm:p-10 space-y-6 z-10 animate-in fade-in zoom-in-95 duration-200">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 text-[#9ca3af] hover:text-white transition-colors"
            >
                <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-2">
                <Logo to="/" size="md" className="mx-auto" />
                <h1 className="font-serif text-3xl font-black text-white pt-2">Welcome</h1>
                <p className="text-xs text-[#9ca3af]">Sign in or create an account to continue.</p>
            </div>

            {magicLinkSent ? (
              <div className="space-y-5 pt-2">
                  <div className="rounded-2xl bg-[#C96A3D]/10 border border-[#C96A3D]/20 p-5 text-center space-y-2">
                    <p className="text-2xl">📬</p>
                    <p className="text-sm font-semibold text-white">Check your inbox!</p>
                    <p className="text-xs text-[#9ca3af]">
                      We sent a magic sign-in link to<br/>
                      <span className="font-mono font-bold text-[#C96A3D]">{email}</span>
                    </p>
                    <p className="text-xs text-[#6b7280] pt-1">
                      Click the link in the email to instantly access GilaniAI. You can close this window.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full rounded-xl bg-white/8 py-3 text-sm font-semibold text-[#9ca3af] hover:text-white hover:bg-white/12 transition-colors"
                  >
                    Close
                  </button>
              </div>
            ) : (
              <>
                <form onSubmit={onSendMagicLink} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#9ca3af]">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
                        <input
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        maxLength={254}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-white/8 bg-[#0f1117] pl-10 pr-4 py-3 text-sm text-white placeholder-[#6b7280] focus:border-[#C96A3D]/50 focus:outline-none focus:ring-1 focus:ring-[#C96A3D]/50 transition-colors"
                        />
                    </div>
                    </div>

                    <div className="flex rounded-xl border border-white/8 bg-[#0f1117] p-1 gap-1">
                    <button
                        type="button"
                        onClick={() => setRole("student")}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                        role === "student"
                            ? "bg-[#C96A3D] text-white"
                            : "text-[#9ca3af] hover:text-white"
                        }`}
                    >
                        <User className="h-3.5 w-3.5" /> I'm a Student
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole("teacher")}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                        role === "teacher"
                            ? "bg-[#C96A3D] text-white"
                            : "text-[#9ca3af] hover:text-white"
                        }`}
                    >
                        <GraduationCap className="h-3.5 w-3.5" /> I'm a Teacher
                    </button>
                    </div>

                    <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-xl bg-[#C96A3D] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#E28743] disabled:opacity-50 transition-all shadow-lg shadow-[#C96A3D]/25"
                    >
                    {busy ? "Sending…" : "Continue with Email →"}
                    </button>
                </form>

                <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-[#6b7280]">
                  <div className="h-px flex-1 bg-white/6" /> OR <div className="h-px flex-1 bg-white/6" />
                </div>
                <button
                  onClick={onGoogle}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/8 bg-[#0f1117] py-3.5 text-sm font-semibold text-white hover:bg-white/4 disabled:opacity-50 transition-colors"
                >
                  <FcGoogle className="h-5 w-5" />
                  Continue with Google
                </button>
              </>
            )}
        </div>
    </div>
  );
}
