import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/async";
import { ArrowLeft, Mail, Sparkles } from "lucide-react";

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
      redirectTo: window.location.origin + "/callback",
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
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-xl backdrop-blur-sm animate-in-slide">
        <Logo to="/" size="md" />

        <div className="mt-6 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 w-fit font-mono text-[9px] uppercase tracking-wider text-primary font-bold">
          <Sparkles className="h-2.5 w-2.5" /> Security Portal
        </div>

        <h1 className="mt-4 font-serif text-3xl font-bold">Reset Password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter the email address associated with your account and we'll send you a secure link to
          reset your password.
        </p>

        {success ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-muted-foreground space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Mail className="h-4 w-4 text-primary" /> Check your email
              </div>
              <p className="text-xs">
                We've sent a password reset link to{" "}
                <strong className="text-foreground">{email}</strong>. Please click the link in the
                email to set a new password.
              </p>
              <p className="text-[10px] text-muted-foreground italic mt-2">
                Didn't receive it? Check your spam folder or try again in a few minutes.
              </p>
            </div>
            <button
              onClick={() => setSuccess(false)}
              className="w-full rounded-md border border-border bg-background py-2.5 text-xs font-semibold hover:bg-accent transition-colors"
            >
              Try another email
            </button>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:underline mt-4"
            >
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                Your Email Address:
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <button
              disabled={busy}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {busy ? "Sending link..." : "Send Reset Link"}
            </button>

            <div className="flex justify-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
