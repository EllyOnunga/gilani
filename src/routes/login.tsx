import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Lock, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { friendlyError } from "@/lib/async";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";

function safeRedirectPath(url: string | undefined): string {
  if (!url) return "/dashboard";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return "/dashboard";
}

export const Route = createFileRoute("/login")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { redirect?: string; email?: string; signout?: boolean } => ({
    redirect: (s.redirect as string) || undefined,
    email: (s.email as string) || undefined,
    signout: s.signout === "true" || s.signout === true || undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (search.signout) {
      await supabase.auth.signOut();
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: safeRedirectPath(search.redirect) });
  },
  head: () => ({
    meta: [
      { title: "Sign in — GilaniAI" },
      {
        name: "description",
        content:
          "Sign in to your GilaniAI account to access AI tutoring and teacher escalation.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://gilaniai.site/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, roles, loading } = useAuth();
  const [email, setEmail] = useState(search.email || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (search.email) {
      setEmail(search.email);
    }
  }, [search.email]);

  useEffect(() => {
    if (!loading && user) {
      if (roles.includes("admin")) {
        navigate({ to: "/admin/users" as any });
      } else if (roles.includes("teacher")) {
        navigate({ to: "/teacher/escalations" as any });
      } else {
        navigate({ to: safeRedirectPath(search.redirect) });
      }
    }
  }, [user, roles, loading, navigate, search.redirect]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(friendlyError(error));
    navigate({
      to: "/callback",
      search: {
        next: safeRedirectPath(search.redirect),
        error: undefined,
        error_description: undefined,
        code: undefined,
        type: undefined,
      },
    });
  };

  const onGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback?next=${safeRedirectPath(search.redirect)}`,
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-[#e2e4f0] px-4 py-12 relative overflow-hidden">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(217,83,30,0.08),transparent_60%)]" />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-white/8 bg-[#1a1d27] shadow-2xl p-8 sm:p-10 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9ca3af] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>

        <div className="text-center space-y-2">
          <Logo to="/" size="md" className="mx-auto" />
          <h1 className="font-serif text-3xl font-black text-white pt-2">Welcome back</h1>
          <p className="text-xs text-[#9ca3af]">Sign in to continue to your GilaniAI portal.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          {search.email && (
            <div className="rounded-2xl bg-[#d9531e]/10 border border-[#d9531e]/20 p-3.5 text-xs text-[#d9531e]">
              This email is already registered. If you forgot your password, please use the reset
              flow below.
            </div>
          )}

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
                className="w-full rounded-xl border border-white/8 bg-[#0f1117] pl-10 pr-4 py-3 text-sm text-white placeholder-[#6b7280] focus:border-[#d9531e]/50 focus:outline-none focus:ring-1 focus:ring-[#d9531e]/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-[#9ca3af]">Password</label>
              <Link
                to="/forgot-password"
                search={{ email }}
                className="text-xs font-semibold text-[#d9531e] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                value={password}
                maxLength={128}
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

          <PasswordRequirements password={password} />

          <button
            disabled={busy}
            className="w-full rounded-xl bg-[#d9531e] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#c44819] disabled:opacity-50 transition-all shadow-lg shadow-[#d9531e]/25"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-[#6b7280]">
          <div className="h-px flex-1 bg-white/6" /> OR <div className="h-px flex-1 bg-white/6" />
        </div>

        <button
          onClick={onGoogle}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/8 bg-[#0f1117] py-3.5 text-sm font-semibold text-white hover:bg-white/4 transition-colors"
        >
          <FcGoogle className="h-5 w-5" />
          Continue with Google
        </button>

        <p className="text-xs text-[#9ca3af] text-center">
          New here?{" "}
          <Link to="/register" className="font-semibold text-[#d9531e] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
