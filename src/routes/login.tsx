import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

function safeRedirectPath(url: string | undefined): string {
  if (!url) return "/dashboard";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return "/dashboard";
}


export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string; email?: string; signout?: boolean } => ({
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
          "Sign in to your GilaniAI account to access AI tutoring, quizzes, notes, and your personalised study planner.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://gilaniai.vercel.app/login" }],
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
    if (error) return toast.error(error.message);
    navigate({
      to: "/callback",
      search: {
        next: safeRedirectPath(search.redirect),
        error: undefined,
        error_description: undefined,
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
      return toast.error("Google sign-in failed: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5 px-8 py-10">
        <div className="w-full flex items-center justify-between mb-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
        <Logo to="/" size="md" />
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to your portal.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {search.email && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200">
              This email is already registered. If you forgot your password, please use the reset
              flow.
            </div>
          )}
          <input
            type="email"
            autoComplete="email"
            required
            placeholder="Email"
            value={email}
            maxLength={254}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          />
          <div className="space-y-1.5">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Password"
                value={password}
                maxLength={128}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
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
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                search={{ email }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
          <button
            disabled={busy}
            className="w-full rounded-xl bg-primary py-3 shadow-md shadow-primary/20 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="my-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
        <button
          onClick={onGoogle}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-white dark:bg-zinc-900 py-3 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <FcGoogle className="h-5 w-5" />
          Continue with Google
        </button>
        <p className="mt-6 text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
