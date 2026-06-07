import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GilaniLoader } from "@/components/GilaniLoader";

export const Route = createFileRoute("/callback")({
  component: AuthCallback,
  validateSearch: (search: Record<string, unknown>) => ({
    next: (search.next as string) || "/dashboard",
    error: (search.error as string) || undefined,
    error_description: (search.error_description as string) || undefined,
  }),
});

function AuthCallback() {
  const navigate = useNavigate();
  const { next, error: urlError, error_description } = useSearch({ from: "/callback" });
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Sanitize next — prevent open redirect attacks
  const safePath = next.startsWith("/") ? next : "/dashboard";

  useEffect(() => {
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
      // Handle email confirmation / recovery links with token_hash
      const urlParams = new URLSearchParams(window.location.search);
      const tokenHash = urlParams.get("token_hash");
      const type = urlParams.get("type") as "email" | "recovery" | null;

      if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (verifyError) {
          setIsError(true);
          setErrorMessage(verifyError.message || "The link is invalid or has expired.");
          return;
        }
        if (type === "recovery") {
          navigate({ to: "/reset-password" });
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
        // Check if this user already has a role (existing user)
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const pendingRole = localStorage.getItem("pending_role") as "student" | "teacher" | null;
        localStorage.removeItem("pending_role");

        if (!roleRow || (pendingRole === "teacher" && roleRow.role === "student")) {
          // New user or needs role upgrade to teacher
          if (pendingRole === "teacher") {
            try {
              const { supabase: sb } = await import("@/integrations/supabase/client");
              // Delete the auto-assigned student role and insert teacher
              await sb.from("user_roles").delete().eq("user_id", session.user.id);
              const { assignUserRole } = await import("@/lib/auth-actions");
              await assignUserRole({ data: { userId: session.user.id, role: "teacher" } });
              navigate({ to: "/teacher/escalations" as any });
            } catch {
              navigate({ to: safePath });
            }
          } else {
            navigate({ to: safePath });
          }
          return;
        }

        // Existing user — redirect based on role to avoid flash
        if (roleRow.role === "admin") {
          navigate({ to: "/admin/users" });
        } else if (roleRow.role === "teacher") {
          navigate({ to: "/teacher/escalations" });
        } else {
          navigate({ to: safePath });
        }
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, s) => {
        if (event === "SIGNED_IN" && s) {
          navigate({ to: safePath });
        } else if (event === "PASSWORD_RECOVERY") {
          navigate({ to: "/reset-password" });
        }
      });

      return () => subscription.unsubscribe();
    };

    handleCallback();
  }, []);

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
            href="/forgot-password"
            style={{
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff",
              textDecoration: "none",
              padding: "0.7rem 1.5rem",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            Request a new link
          </a>
          <a
            href="/login"
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
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return <GilaniLoader />;
}
