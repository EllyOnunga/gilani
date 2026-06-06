import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

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
  const { user, roles, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
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
      toast.error(error.message);
      return;
    }

    toast.success("Password has been successfully updated! Redirecting...");

    // Redirect based on role
    setTimeout(() => {
      if (roles.includes("admin")) {
        navigate({ to: "/admin/users" as any });
      } else if (roles.includes("teacher")) {
        navigate({ to: "/teacher/escalations" as any });
      } else {
        navigate({ to: "/dashboard" as any });
      }
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <p className="text-sm text-muted-foreground font-medium">Authenticating reset session…</p>
      </div>
    );
  }

  // If no user is logged in (i.e. they manually typed this URL without a token)
  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-xl text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-amber-500 mb-4" />
          <h1 className="font-serif text-2xl font-bold">Invalid or Expired Link</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            This password reset link is either invalid, expired, or has already been used. Please
            request a new one.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/forgot-password"
              className="rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Request a new link
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-border py-2.5 text-sm font-semibold hover:bg-accent transition-colors"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-xl backdrop-blur-sm animate-in-slide">
        <Logo to="/" size="md" />

        <div className="mt-6 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 w-fit font-mono text-[9px] uppercase tracking-wider text-primary font-bold">
          <Sparkles className="h-2.5 w-2.5" /> Security Portal
        </div>

        <h1 className="mt-4 font-serif text-3xl font-bold">Choose New Password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter and confirm your new secure password below to regain access to your account.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block">
              New Password (min 6 chars):
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground block">
              Confirm New Password:
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {password && password.length >= 6 && (
            <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
              <CheckCircle2 className="h-3.5 w-3.5" /> Password meets length requirements
            </div>
          )}

          <button
            disabled={busy}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {busy ? "Updating Password..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
