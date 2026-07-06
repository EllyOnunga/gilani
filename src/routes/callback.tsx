import { useEffect, useState, useRef, type FormEvent } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GilaniLoader } from "@/components/GilaniLoader";
import { NameCaptureForm } from "@/components/auth/NameCaptureForm";
import { toast } from "sonner";

export const Route = createFileRoute("/callback")({
  component: AuthCallback,
  validateSearch: (search: Record<string, unknown>) => ({
    next: (search.next as string) || "/tutor",
    error: (search.error as string) || undefined,
    error_description: (search.error_description as string) || undefined,
    code: (search.code as string) || undefined,
    type: (search.type as string) || undefined,
  }),
});

function AuthCallback() {
  const navigate = useNavigate();
  const { next, error: urlError, error_description } = useSearch({ from: "/callback" });
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showNameForm, setShowNameForm] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [pendingRole, setPendingRole] = useState<"student" | "teacher">("student");
  const processedRef = useRef(false);

  // Sanitize next — prevent open redirect attacks
  const safePath = next.startsWith("/") ? next : "/tutor";

  // Fresh sign-ins should land on the true empty-state home, not wherever
  // tutor.tsx's own logic would otherwise auto-jump a returning visitor to
  // (their most recently active thread) — "new=1" is the existing escape
  // hatch tutor.tsx already checks for that.
  const navigateToDestination = (path: string) => {
    if (path === "/tutor") {
      navigate({ to: "/tutor", search: { new: "1" } } as any);
    } else {
      navigate({ to: path } as any);
    }
  };

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    // Check for error in URL hash (e.g. expired OTP)
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace("#", ""));
    const hashError = hashParams.get("error");
    const hashErrorDesc = hashParams.get("error_description");

    if (hashError || urlError) {
      const desc = hashErrorDesc || error_description || "The link is invalid or has expired.";
      setIsError(true);
      setErrorMessage(desc.replace(/\+/g, " "));
      return;
    }

    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const tokenHash = urlParams.get("token_hash");
      const type = urlParams.get("type");

      // PKCE code flow
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setIsError(true);
          setErrorMessage(exchangeError.message || "The link is invalid or has expired.");
          return;
        }
      }

      // token_hash flow
      if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });
        if (verifyError) {
          setIsError(true);
          setErrorMessage(verifyError.message || "The link is invalid or has expired.");
          return;
        }
        if (type === "recovery") {
          navigate({ to: "/" });
          return;
        }
        // Email confirmed — fall through to get session below
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        setIsError(true);
        setErrorMessage("Something went wrong. Please try again.");
        return;
      }

      if (session) {
        if (safePath === "/reset-password" || type === "recovery") {
          navigate({ to: "/" });
          return;
        }

        // Check if this user already has a role (existing user)
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        // handle_new_user() DB trigger auto-creates both profiles and user_roles
        // rows synchronously at signup, so roleRow existing is not a valid
        // "already onboarded" signal. onboarding_completed is set explicitly
        // by assignUserRole once the user actually submits their display name.
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .maybeSingle();

        const storedRole = localStorage.getItem("pending_role") as "student" | "teacher" | null;
        const effectiveRole = storedRole || "student";
        localStorage.removeItem("pending_role");

        const isNewUser = !profileRow?.onboarding_completed;

        if (isNewUser || (storedRole === "teacher" && roleRow?.role === "student")) {
          // New user — show display name form before proceeding
          setPendingRole(effectiveRole as "student" | "teacher");
          // Pre-fill with Google name if available
          const googleName = session.user.user_metadata?.full_name || "";
          setDisplayName(googleName);
          setShowNameForm(true);
          return;
        }

        // Existing user — redirect based on role
        if (roleRow?.role === "admin") {
          navigate({ to: "/admin/users" });
        } else if (roleRow?.role === "teacher") {
          navigate({ to: "/teacher/escalations" });
        } else {
          navigateToDestination(safePath);
        }
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, s) => {
        if (event === "PASSWORD_RECOVERY") {
          navigate({ to: "/" });
        } else if (event === "SIGNED_IN" && s) {
          const urlParams = new URLSearchParams(window.location.search);
          const type = urlParams.get("type");
          if (type !== "recovery") {
            navigateToDestination(safePath);
          }
        }
      });

      return () => subscription.unsubscribe();
    };

    handleCallback();
  }, []);

  const onSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return toast.error("Please enter your display name.");
    setSavingName(true);
    try {
      const { assignUserRole } = await import("@/lib/auth-actions.server-fns");
      await assignUserRole({
        data: {
          role: pendingRole,
          displayName: displayName.trim(),
        },
      });
      // Redirect based on role
      if (pendingRole === "teacher") {
        navigate({ to: "/teacher/escalations" as any });
      } else {
        navigateToDestination(safePath);
      }
    } catch (err) {
      console.error("[Callback] Failed to save display name:", err);
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

  if (isError) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: "1rem",
          background: "#0a0f1e",
          color: "#e8eaf6",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          ⚠️
        </div>
        <div>
          <p style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "1rem", margin: "0 0 0.5rem" }}>
            Link Expired or Invalid
          </p>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", maxWidth: 320, margin: "0 auto" }}>
            {errorMessage}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            width: "100%",
            maxWidth: 280,
          }}
        >
          <a
            href="/"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8",
              textDecoration: "none",
              padding: "0.7rem 1.5rem",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            Back to home
          </a>
        </div>
      </div>
    );
  }

  return <GilaniLoader />;
}
