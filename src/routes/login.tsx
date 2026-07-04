import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect, useRef } from "react";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { ArrowLeft, Mail, GraduationCap, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { friendlyError } from "@/lib/async";

function safeRedirectPath(url: string | undefined): string {
  if (!url) return "/tutor";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return "/tutor";
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
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
    throw redirect({ to: "/", search: { authModalOpen: true } as any });
  },
  head: () => ({
    meta: [
      { title: "Sign in — GilaniAI" },
      {
        name: "description",
        content: "Sign in to your GilaniAI account to access AI tutoring and teacher escalation.",
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
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (search.email) {
      setEmail(search.email);
    }
  }, [search.email]);

  useEffect(() => {
    if (codeSent) {
      codeInputRef.current?.focus();
    }
  }, [codeSent]);

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

  const onGoogle = async () => {
    setBusy(true);
    localStorage.setItem("pending_role", role);
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
      localStorage.removeItem("pending_role");
      setBusy(false);
      return toast.error(friendlyError(error, "Google sign-in failed. Please try again."));
    }
  };

  const onSendCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email address.");
    setBusy(true);
    localStorage.setItem("pending_role", role);
    // No emailRedirectTo — this sends a 6-digit code instead of a magic link.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      localStorage.removeItem("pending_role");
      return toast.error(friendlyError(error, "Failed to send sign-in code."));
    }
    setCodeSent(true);
    toast.success("Code sent! Check your inbox.");
  };

  const onVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return toast.error("Enter the 6-digit code from your email.");
    setVerifying(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) {
      setVerifying(false);
      setCode("");
      return toast.error(friendlyError(error, "Invalid or expired code. Please try again."));
    }

    // Assign pending role (student/teacher) now, mirroring the same logic
    // use-auth.ts / callback.tsx use for OAuth sign-ins.
    try {
      const pendingRole = localStorage.getItem("pending_role") as "student" | "teacher" | null;
      localStorage.removeItem("pending_role");
      if (pendingRole && data.user?.id) {
        const { data: existing } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        if (!existing || existing.length === 0) {
          const { assignUserRole } = await import("@/lib/auth-actions.server-fns");
          await assignUserRole({ data: { role: pendingRole } });
        }
      }
    } catch (roleErr) {
      console.error("[Login] Failed to assign pending role:", roleErr);
      // Non-fatal — user is signed in either way; role can be corrected later.
    }
    setVerifying(false);
    // Navigation happens automatically via the useAuth effect once the
    // session/role state updates.
  };

  const onResend = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) return toast.error(friendlyError(error, "Failed to resend code."));
    setCode("");
    toast.success("New code sent!");
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
          <h1 className="font-serif text-3xl font-black text-white pt-2">Welcome</h1>
          <p className="text-xs text-[#9ca3af]">Sign in to continue to GilaniAI. No password needed.</p>
        </div>

        {codeSent ? (
          <form onSubmit={onVerifyCode} className="space-y-4 pt-2">
            <div className="rounded-2xl bg-[#d9531e]/10 border border-[#d9531e]/20 p-3.5 text-xs text-[#d9531e] text-center">
              We sent a 6-digit code to <span className="font-mono">{email}</span>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#9ca3af]">Enter code</label>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-xl border border-white/8 bg-[#0f1117] px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.5em] text-white placeholder-[#6b7280] focus:border-[#d9531e]/50 focus:outline-none focus:ring-1 focus:ring-[#d9531e]/50 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full rounded-xl bg-[#d9531e] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#c44819] disabled:opacity-50 transition-all shadow-lg shadow-[#d9531e]/25"
            >
              {verifying ? "Verifying…" : "Verify & sign in"}
            </button>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                }}
                className="text-[#9ca3af] hover:text-white transition-colors"
              >
                ← Use a different email
              </button>
              <button
                type="button"
                onClick={onResend}
                disabled={busy}
                className="font-semibold text-[#d9531e] hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={onSendCode} className="space-y-4 pt-2">
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

            {/* Role toggle */}
            <div className="flex rounded-xl border border-white/8 bg-[#0f1117] p-1 gap-1">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  role === "student"
                    ? "bg-[#d9531e] text-white"
                    : "text-[#9ca3af] hover:text-white"
                }`}
              >
                <User className="h-3.5 w-3.5" /> I'm a Student
              </button>
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                  role === "teacher"
                    ? "bg-[#d9531e] text-white"
                    : "text-[#9ca3af] hover:text-white"
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" /> I'm a Teacher
              </button>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#d9531e] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#c44819] disabled:opacity-50 transition-all shadow-lg shadow-[#d9531e]/25"
            >
              {busy ? "Sending…" : "Send sign-in code"}
            </button>
          </form>
        )}

        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-[#6b7280]">
          <div className="h-px flex-1 bg-white/6" /> OR <div className="h-px flex-1 bg-white/6" />
        </div>
        <button
          onClick={onGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/8 bg-[#0f1117] py-3.5 text-sm font-semibold text-white hover:bg-white/4 disabled:opacity-50 transition-colors"
        >
          <FcGoogle className="h-5 w-5" />
          Continue with Google
        </button>
      </div>
    </div>
  );
}
