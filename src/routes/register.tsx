import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { friendlyError } from "@/lib/async";

export const Route = createFileRoute("/register")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Create account — GilaniAI" },
      {
        name: "description",
        content:
          "Create your free GilaniAI account. Students get AI tutoring, quizzes and a smart study planner. Teachers get an escalation dashboard for student support.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://gilaniai.vercel.app/register" }],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const [displayName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"student" | "teacher">("student");

  useEffect(() => {
    if (!loading && user) {
      if (roles.includes("admin")) {
        navigate({ to: "/admin/users" as any });
      } else if (roles.includes("teacher")) {
        navigate({ to: "/teacher/escalations" as any });
      } else {
        navigate({ to: "/dashboard" as any });
      }
    }
  }, [user, roles, loading, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address (e.g. name@example.com)");
      return;
    }

    // Block disposable email domains
    const blockedDomains = ["mailinator.com", "guerrillamail.com", "tempmail.com", "throwam.com", "sharklasers.com", "trashmail.com", "yopmail.com", "maildrop.cc"];
    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (blockedDomains.includes(emailDomain)) {
      toast.error("Please use a valid email address. Disposable emails are not allowed.");
      return;
    }

    // Validate display name
    if (!displayName.trim() || displayName.trim().length < 2) {
      toast.error("Please enter your full name (at least 2 characters).");
      return;
    }

    setBusy(true);

    try {
      const { checkEmailExists } = await import("@/lib/auth-actions.server-fns");
      const { exists } = await checkEmailExists({ data: { email } });
      if (exists) {
        setBusy(false);
        toast.error("This email is already registered. Please sign in instead.", {
          duration: 5000,
        });
        navigate({ to: "/login", search: { email } });
        return;
      }
    } catch (checkErr) {
      console.error("Failed to verify if email exists:", checkErr);
    }

    // Persist pending role to local storage for use after redirect/session check
    localStorage.setItem("pending_role", role);

    // 1. Sign up user
    if (password.length < 8) {
      setBusy(false);
      return toast.error("Password must be at least 8 characters.");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/callback",
        data: { display_name: displayName, role: role },
      },
    });

    if (error) {
      localStorage.removeItem("pending_role");
      setBusy(false);
      return toast.error(friendlyError(error, "Registration failed. Please try again."));
    }

    setBusy(false);
    toast.success("Account created! Check your inbox to verify your email.");
    navigate({ to: "/login" });
  };

  const onGoogle = async () => {
    setBusy(true);
    localStorage.setItem("pending_role", role);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
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

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-md">
        <div className="w-full flex items-center justify-between mb-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
        <Logo to="/" size="md" className="mx-auto" />
        <h1 className="mt-6 font-serif text-3xl font-bold text-center">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">
          Free for students. Powerful tools for teachers.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
              I am registering as:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["student", "teacher"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-lg border py-2 text-center capitalize transition-all text-xs font-semibold ${
                    role === r
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <input
            required
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setName(e.target.value)}
                maxLength={80}
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 animate-in-slide"
          />

          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 animate-in-slide"
          />

          <div className="relative animate-in-slide">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
                maxLength={128}
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

          <button
            disabled={busy}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 animate-in-slide"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={onGoogle}
          className="w-full flex items-center justify-center gap-3 rounded-md border border-border bg-white dark:bg-zinc-900 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <FcGoogle className="h-5 w-5" />
          Continue with Google
        </button>

        <p className="mt-6 text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
