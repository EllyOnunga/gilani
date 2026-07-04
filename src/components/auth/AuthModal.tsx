import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/ui/logo";
import { supabase } from "@/integrations/supabase/client";
import { instantLogin, assignUserRole } from "@/lib/auth-actions.server-fns";
import { NameCaptureForm } from "@/components/auth/NameCaptureForm";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { Mail, GraduationCap, User, X } from "lucide-react";
import { friendlyError } from "@/lib/async";

interface AuthModalProps {
  onClose: () => void;
  // Lets the parent page know an in-progress sign-up (which may still need
  // the name-capture step) is happening, so it doesn't unmount this modal
  // and redirect away the instant Supabase reports the user as signed in —
  // that race was causing the name form to never actually render.
  onAuthStart?: () => void;
  onAuthComplete?: () => void;
}

export function AuthModal({ onClose, onAuthStart, onAuthComplete }: AuthModalProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [busy, setBusy] = useState(false);
  const [showNameForm, setShowNameForm] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const onGoogle = async () => {
    setBusy(true);
    localStorage.setItem("pending_role", role);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback?next=/tutor`,
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

  const routeToDestination = async () => {
    // Mirror callback.tsx's routing for existing users: fetch their real role.
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return navigate({ to: "/tutor" as any });

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleRow?.role === "admin") {
      navigate({ to: "/admin/users" as any });
    } else if (roleRow?.role === "teacher") {
      navigate({ to: "/teacher/escalations" as any });
    } else {
      navigate({ to: "/tutor" as any });
    }
  };

  const onEmailContinue = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email address.");
    setBusy(true);
    // Tell the parent page an auth flow is underway BEFORE calling
    // setSession — setSession fires a SIGNED_IN event synchronously enough
    // that the parent's own "user is signed in, redirect away" effect could
    // otherwise unmount this whole modal before the name form ever renders.
    onAuthStart?.();
    // Mirror onGoogle: stash the chosen role so use-auth's own SIGNED_IN
    // listener assigns it immediately, keeping its `roles` state in sync.
    // Without this, roles stayed empty until a full page reload, which made
    // freshly-signed-up teachers appear as students until refresh.
    localStorage.setItem("pending_role", role);
    try {
      const result = await instantLogin({ data: { email } });
      const { error } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (error) throw error;

      if (result.needsProfileSetup) {
        setBusy(false);
        setShowNameForm(true);
      } else {
        localStorage.removeItem("pending_role");
        await routeToDestination();
        onAuthComplete?.();
        onClose();
      }
    } catch (err) {
      localStorage.removeItem("pending_role");
      onAuthComplete?.();
      setBusy(false);
      toast.error(friendlyError(err as { message?: string }, "Sign-in failed. Please try again."));
    }
  };

  const onSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return toast.error("Please enter your display name.");
    setSavingName(true);
    try {
      await assignUserRole({ data: { role, displayName: displayName.trim() } });
      onAuthComplete?.();
      if (role === "teacher") {
        navigate({ to: "/teacher/escalations" as any });
      } else {
        navigate({ to: "/tutor" as any });
      }
      onClose();
    } catch (err) {
      console.error("[AuthModal] Failed to save display name:", err);
      toast.error("Something went wrong. Please try again.");
      setSavingName(false);
    }
  };

  if (showNameForm) {
    return (
      <NameCaptureForm
        displayName={displayName}
        onDisplayNameChange={setDisplayName}
        onSubmit={onSaveName}
        saving={savingName}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-md rounded-3xl border border-white/8 bg-[#1a1d27] shadow-2xl p-8 sm:p-10 space-y-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[#9ca3af] hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center space-y-2">
          <Logo to="/" size="md" className="mx-auto" />
          <h1 className="font-serif text-3xl font-black text-white pt-2">Welcome</h1>
          <p className="text-xs text-[#9ca3af]">Sign in or create an account to continue.</p>
        </div>

        <button
          onClick={onGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/8 bg-[#0f1117] py-3.5 text-sm font-semibold text-white hover:bg-white/4 disabled:opacity-50 transition-colors"
        >
          <FcGoogle className="h-5 w-5" />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-[#6b7280]">
          <div className="h-px flex-1 bg-white/6" /> OR <div className="h-px flex-1 bg-white/6" />
        </div>

        <form onSubmit={onEmailContinue} className="space-y-4">
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
                className="w-full rounded-xl border border-white/8 bg-[#0f1117] pl-10 pr-4 py-3 text-sm text-white placeholder-[#6b7280] focus:border-[#C96A3D]/50 focus:outline-none focus:ring-1 focus:ring-[#C96A3D]/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex rounded-xl border border-white/8 bg-[#0f1117] p-1 gap-1">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                role === "student"
                  ? "bg-[#C96A3D] text-white"
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
                  ? "bg-[#C96A3D] text-white"
                  : "text-[#9ca3af] hover:text-white"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" /> I'm a Teacher
            </button>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#C96A3D] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#E28743] disabled:opacity-50 transition-all shadow-lg shadow-[#C96A3D]/25"
          >
            {busy ? "Signing in…" : "Continue with Email"}
          </button>
        </form>
      </div>
    </div>
  );
}
