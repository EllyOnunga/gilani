import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { sendPasswordResetConfirmationFn } from "@/lib/auth-actions.server-fns";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldAlert, Sparkles, Check, Lock, X } from "lucide-react";
import { friendlyError } from "@/lib/async";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — GilaniAI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const verifyRecoveryToken = async () => {
      // 1. Check if Supabase sent error in URL fragment or search params
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.replace("#", ""));
      const urlParams = new URLSearchParams(window.location.search);

      const errorDesc =
        hashParams.get("error_description") || urlParams.get("error_description");
      if (errorDesc) {
        setTokenError(errorDesc.replace(/\+/g, " "));
        setVerifyingToken(false);
        return;
      }

      // 2. Handle token_hash verification directly on reset-password page
      const tokenHash = urlParams.get("token_hash") || hashParams.get("token_hash");
      const type = (urlParams.get("type") || hashParams.get("type")) as
        | "recovery"
        | "email"
        | null;

      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (error) {
          setTokenError(error.message || "The password reset link is invalid or has expired.");
        }
      }
      setVerifyingToken(false);
    };

    verifyRecoveryToken();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      toast.error("Password does not meet minimum security requirements.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      toast.error(friendlyError(error, "Failed to update password. Please try again."));
      return;
    }

    // Fire confirmation email (don't await — non-blocking)
    sendPasswordResetConfirmationFn().catch((err) =>
      console.error("[ResetPassword] Confirmation email failed:", err),
    );

    toast.success("Password updated successfully! Please sign in with your new password.");

    // Sign the user out so they must re-authenticate with the new password
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate({ to: "/login" as any });
    }, 1500);
  };

  if (authLoading || verifyingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-[#e2e4f0]">
        <p className="text-xs text-[#9ca3af] font-medium">Authenticating reset session…</p>
      </div>
    );
  }

  // If no user is logged in (i.e. they manually typed this URL without a token)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-[#e2e4f0] px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/8 bg-[#1a1d27] p-8 sm:p-10 text-center space-y-4 shadow-2xl">
          <ShieldAlert className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="font-serif text-2xl font-bold text-white">Invalid or Expired Link</h1>
          <p className="text-xs text-[#9ca3af] leading-relaxed">
            This password reset link is either invalid, expired, or has already been used. Please
            request a new one.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              to="/forgot-password"
              className="rounded-xl bg-[#d9531e] py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#c44819] transition-all shadow-md shadow-[#d9531e]/20"
            >
              Request a new link
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-white/8 bg-[#0f1117] py-3 text-xs font-bold uppercase tracking-wider text-[#9ca3af] hover:text-white transition-colors"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const passMatches = confirmPassword.length > 0 && password === confirmPassword;
  const passMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-[#e2e4f0] px-4 py-12 relative overflow-hidden">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(217,83,30,0.08),transparent_60%)]" />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-white/8 bg-[#1a1d27] shadow-2xl p-8 sm:p-10 space-y-6">
        <div className="text-center space-y-2">
          <Logo to="/" size="md" className="mx-auto" />
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d9531e]/30 bg-[#d9531e]/8 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#d9531e] mt-2">
            <Sparkles className="h-3 w-3" /> Security Portal
          </div>
          <h1 className="font-serif text-3xl font-black text-white pt-1">Choose New Password</h1>
          <p className="text-xs text-[#9ca3af] leading-relaxed">
            Enter and confirm your new secure password below to regain access to your account.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#9ca3af]">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/8 bg-[#0f1117] pl-10 pr-10 py-3 text-sm text-white placeholder-[#6b7280] focus:border-[#d9531e]/50 focus:outline-none focus:ring-1 focus:ring-[#d9531e]/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-white"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#9ca3af]">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-xl border bg-[#0f1117] pl-10 pr-10 py-3 text-sm text-white placeholder-[#6b7280] focus:outline-none transition-colors ${
                  passMatches
                    ? "border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                    : passMismatch
                      ? "border-red-500/50 focus:ring-1 focus:ring-red-500/50"
                      : "border-white/8 focus:border-[#d9531e]/50 focus:ring-1 focus:ring-[#d9531e]/50"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-white"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Real-time Password Match Indicator Tick / Warning */}
          {passMatches && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
              <Check className="h-4 w-4" /> Passwords match!
            </div>
          )}
          {passMismatch && (
            <div className="flex items-center gap-2 text-xs text-red-400 font-semibold bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
              <X className="h-4 w-4" /> Passwords do not match yet
            </div>
          )}

          <PasswordRequirements password={password} />

          <button
            disabled={busy || (confirmPassword.length > 0 && !passMatches)}
            className="w-full rounded-xl bg-[#d9531e] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#c44819] disabled:opacity-50 transition-all shadow-lg shadow-[#d9531e]/25"
          >
            {busy ? "Updating Password..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
