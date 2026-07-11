import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { instantLogin, assignUserRole } from "@/lib/auth-actions.server-fns";
import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";
import { WorkspaceLoader } from "@/components/auth/WorkspaceLoader";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { Mail, X, Loader2, ArrowRight } from "lucide-react";
import { friendlyError } from "@/lib/async";

interface AuthModalProps {
  onClose: () => void;
  onAuthStart?: () => void;
  onAuthComplete?: () => void;
}

export function AuthModal({ onClose, onAuthStart, onAuthComplete }: AuthModalProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  const onGoogle = async () => {
    setBusy(true);
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
      setBusy(false);
      return toast.error(friendlyError(error, "Google sign-in failed. Please try again."));
    }
  };

  const routeToDestination = async () => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return navigate({ to: "/tutor" as any, search: { new: "1" } as any });

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleRow?.role === "admin") {
      navigate({ to: "/admin/users" as any });
    } else if (roleRow?.role === "teacher") {
      navigate({ to: "/teacher/escalations" as any });
    } else {
      navigate({ to: "/tutor" as any, search: { new: "1" } as any });
    }
  };

  const onEmailContinue = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email address.");
    setBusy(true);
    onAuthStart?.();
    try {
      const result = await instantLogin({ data: { email } });
      const { error } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (error) throw error;

      if (result.needsProfileSetup) {
        setBusy(false);
        setShowProfileForm(true);
      } else {
        setShowLoader(true);
        await routeToDestination();
        onAuthComplete?.();
        onClose();
      }
    } catch (err) {
      onAuthComplete?.();
      setBusy(false);
      toast.error(friendlyError(err as { message?: string }, "Sign-in failed. Please try again."));
    }
  };

  const onSaveProfile = async (displayName: string, role: "student" | "teacher") => {
    try {
      await assignUserRole({ data: { role, displayName: displayName.trim() } });
      setShowProfileForm(false);
      setShowLoader(true);
      onAuthComplete?.();
      setTimeout(async () => {
        if (role === "teacher") {
          navigate({ to: "/teacher/escalations" as any });
        } else {
          navigate({ to: "/tutor" as any, search: { new: "1" } as any });
        }
        onClose();
      }, 1600);
    } catch (err) {
      console.error("[AuthModal] Failed to save profile:", err);
      toast.error("Something went wrong. Please try again.");
      throw err;
    }
  };

  if (showLoader) {
    return <WorkspaceLoader />;
  }

  if (showProfileForm) {
    return <CompleteProfileForm onSave={onSaveProfile} />;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-[420px] z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Outer glow */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-[#C96A3D]/20 via-transparent to-transparent blur-sm pointer-events-none" />

        <div className="relative rounded-3xl border border-white/[0.08] bg-[#13151f]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#C96A3D] to-transparent opacity-70" />

          <div className="p-7 sm:p-9 space-y-5">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 rounded-full p-1.5 text-white/30 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2 pt-1">
              <Logo to="/" size="md" className="mx-auto" />
              <div className="space-y-1 pt-1">
                <h1 className="font-serif text-2xl font-black text-white tracking-tight">
                  Welcome back
                </h1>
                <p className="text-sm text-white/40">Continue to your account.</p>
              </div>
            </div>

            {/* Google Sign-in */}
            <button
              onClick={onGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3.5 text-sm font-semibold text-white hover:bg-white/[0.08] hover:border-white/15 disabled:opacity-50 transition-all duration-200 cursor-pointer"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin text-white/40" />
              ) : (
                <FcGoogle className="h-5 w-5" />
              )}
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/20">
                or
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            {/* Email Form */}
            <form onSubmit={onEmailContinue} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Email address"
                  value={email}
                  maxLength={254}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 py-3.5 text-sm text-white placeholder-white/25 focus:border-[#C96A3D]/50 focus:outline-none focus:ring-1 focus:ring-[#C96A3D]/30 focus:bg-white/[0.06] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="group w-full flex items-center justify-center gap-2 rounded-2xl bg-[#C96A3D] py-3.5 text-sm font-bold text-white hover:bg-[#D9784A] active:scale-[0.98] disabled:opacity-50 transition-all duration-200 shadow-lg shadow-[#C96A3D]/20 cursor-pointer"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-[10px] text-white/20 leading-relaxed">
              By continuing you agree to our{" "}
              <Link
                to="/terms"
                onClick={onClose}
                className="text-white/35 hover:text-[#E28743] cursor-pointer transition-colors"
              >
                Terms
              </Link>{" "}
              &{" "}
              <Link
                to="/privacy"
                onClick={onClose}
                className="text-white/35 hover:text-[#E28743] cursor-pointer transition-colors"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
