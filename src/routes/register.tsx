import React from "react";
import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, User, Mail, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { friendlyError } from "@/lib/async";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";

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
    links: [{ rel: "canonical", href: "https://gilaniai.site/register" }],
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
  const submittingRef = React.useRef(false);
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
    if (submittingRef.current) return;

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address (e.g. name@example.com)");
      return;
    }

    // Block disposable email domains
    const blockedDomains = [
      "mailinator.com",
      "guerrillamail.com",
      "tempmail.com",
      "throwam.com",
      "sharklasers.com",
      "trashmail.com",
      "yopmail.com",
      "maildrop.cc",
    ];
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

    // Validate password requirements
    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      toast.error("Password does not meet the minimum security requirements.");
      return;
    }

    submittingRef.current = true;
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/callback?type=email&next=/login",
        data: { display_name: displayName, role: role },
      },
    });

    if (error) {
      localStorage.removeItem("pending_role");
      setBusy(false);
      return toast.error(friendlyError(error, "Registration failed. Please try again."));
    }

    setBusy(false);
    submittingRef.current = false;
    toast.success("Account created! Check your inbox to verify your email.");
    navigate({ to: "/login" });
  };

  const onGoogle = async () => {
    submittingRef.current = true;
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
          <h1 className="font-serif text-3xl font-black text-white pt-2">Create account</h1>
          <p className="text-xs text-[#9ca3af]">Free for students. Powerful tools for teachers.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div>
            <label className="font-mono text-[9px] uppercase tracking-widest text-[#6b7280] font-bold mb-2 block">
              I am registering as:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(["student", "teacher"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-xl border py-3 text-center capitalize transition-all text-xs font-bold ${
                    role === r
                      ? "border-[#d9531e] bg-[#d9531e]/15 text-[#d9531e] shadow-md shadow-[#d9531e]/10"
                      : "border-white/8 bg-[#0f1117] text-[#9ca3af] hover:text-white hover:bg-white/4"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#9ca3af]">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
              <input
                required
                placeholder="e.g. Amina Wanjiku"
                value={displayName}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="w-full rounded-xl border border-white/8 bg-[#0f1117] pl-10 pr-4 py-3 text-sm text-white placeholder-[#6b7280] focus:border-[#d9531e]/50 focus:outline-none focus:ring-1 focus:ring-[#d9531e]/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#9ca3af]">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                className="w-full rounded-xl border border-white/8 bg-[#0f1117] pl-10 pr-4 py-3 text-sm text-white placeholder-[#6b7280] focus:border-[#d9531e]/50 focus:outline-none focus:ring-1 focus:ring-[#d9531e]/50 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#9ca3af]">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={128}
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
            {busy ? "Creating account…" : "Create account"}
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
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[#d9531e] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
