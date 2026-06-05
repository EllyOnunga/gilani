import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

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
        content: "Create your free GilaniAI account. Students get AI tutoring, quizzes and a smart study planner. Teachers get an escalation dashboard for student support.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://gilaniai.vercel.app/register" }],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [displayName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"student" | "teacher">("student");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);

    // Persist pending role to local storage for use after redirect/session check
    localStorage.setItem("pending_role", role);

    // 1. Sign up user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { display_name: displayName, role: role },
      },
    });

    if (error) {
      localStorage.removeItem("pending_role");
      setBusy(false);
      return toast.error(error.message);
    }

    // 2. Invoke server function to assign their role securely ONLY if the session
    // is NOT auto-established. If it is auto-established, the checkAndAssignRole
    // listener inside useAuth hook will handle the server-side role assignment via pending_role.
    if (data?.user?.id && !data.session) {
      try {
        const { assignUserRole } = await import("@/lib/auth-actions");
        await assignUserRole({ data: { userId: data.user.id, role: role } });
      } catch (roleErr) {
        console.error("Failed to assign role securely on server:", roleErr);
      }
    }

    setBusy(false);
    toast.success("Account created! Check your inbox to verify your email.");
    navigate({ to: "/login" });
  };

  const onGoogle = async () => {
    setBusy(true);
    // Persist pending role to local storage before redirecting to Google OAuth
    localStorage.setItem("pending_role", role);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/dashboard",
      },
    });
    if (error) {
      localStorage.removeItem("pending_role");
      setBusy(false);
      return toast.error("Google sign-in failed: " + error.message);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-md">
        <Logo to="/" size="md" />
        <h1 className="mt-6 font-serif text-3xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 animate-in-slide"
          />

          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 animate-in-slide"
          />

          <div className="relative animate-in-slide">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              placeholder="Password (min 6 chars)"
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
          className="w-full rounded-md border border-border bg-background py-2.5 text-sm font-medium hover:bg-accent animate-in-slide"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
