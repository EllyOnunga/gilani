import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/async";
import { ArrowLeft, Mail, Sparkles, KeyRound } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  validateSearch: (s: Record<string, unknown>): { email?: string } => ({
    email: (s.email as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Forgot Password — GilaniAI" },
      {
        name: "description",
        content: "Reset your GilaniAI password. Enter your email to receive a password reset link.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (search.email) {
      setEmail(search.email);
    }
  }, [search.email]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setBusy(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/callback?type=recovery&next=/reset-password",
    });
    setBusy(false);

    if (error) {
      toast.error(friendlyError(error, "Failed to send reset email. Please try again."));
      return;
    }

    setSuccess(true);
    toast.success("Password reset email sent! Check your inbox.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-[#e2e4f0] px-4 py-12 relative overflow-hidden">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(217,83,30,0.08),transparent_60%)]" />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-white/8 bg-[#1a1d27] shadow-2xl p-8 sm:p-10 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9ca3af] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </div>

        <div className="text-center space-y-2">
          <Logo to="/" size="md" className="mx-auto" />
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d9531e]/30 bg-[#d9531e]/8 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#d9531e] mt-2">
            <Sparkles className="h-3 w-3" /> Security Portal
          </div>
          <h1 className="font-serif text-3xl font-black text-white pt-1">Reset Password</h1>
          <p className="text-xs text-[#9ca3af] leading-relaxed">
            Enter your account email address to receive a secure password recovery link.
          </p>
        </div>

        {success ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl bg-[#d9531e]/10 border border-[#d9531e]/20 p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Mail className="h-4 w-4 text-[#d9531e]" /> Check your inbox
              </div>
              <p className="text-xs text-[#9ca3af] leading-relaxed">
                We've sent a password recovery link to{" "}
                <strong className="text-white font-semibold">{email}</strong>.
              </p>
              <p className="text-[10px] text-[#6b7280] italic pt-1">
                Didn't receive it? Check your spam folder or try again in a few minutes.
              </p>
            </div>
            <button
              onClick={() => setSuccess(false)}
              className="w-full rounded-xl border border-white/8 bg-[#0f1117] py-3 text-xs font-bold uppercase tracking-wider text-[#9ca3af] hover:text-white hover:bg-white/4 transition-colors"
            >
              Try another email
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#9ca3af]">
                Your Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/8 bg-[#0f1117] pl-10 pr-4 py-3 text-sm text-white placeholder-[#6b7280] focus:border-[#d9531e]/50 focus:outline-none focus:ring-1 focus:ring-[#d9531e]/50 transition-colors"
                />
              </div>
            </div>

            <button
              disabled={busy}
              className="w-full rounded-xl bg-[#d9531e] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#c44819] disabled:opacity-50 transition-all shadow-lg shadow-[#d9531e]/25"
            >
              {busy ? "Sending link..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
