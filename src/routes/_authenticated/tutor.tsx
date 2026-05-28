import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithTimeout, getErrorMessage, withTimeout } from "@/lib/async";

export const Route = createFileRoute("/_authenticated/tutor")({
  component: TutorIndex,
});

function TutorIndex() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const createSession = async () => {
    setError(null);
    setLoading(true);
    let sessionCreationTimeout: ReturnType<typeof setTimeout> | null = null;
    try {
      sessionCreationTimeout = setTimeout(() => {
        setError("Session startup timed out. Check deployment env vars and try again.");
        setLoading(false);
      }, 15000);

      // Check if Supabase client has valid credentials BEFORE trying to get session
      const hasSupabaseUrl = !!import.meta.env.VITE_SUPABASE_URL;
      const hasSupabaseKey = !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!hasSupabaseUrl || !hasSupabaseKey) {
        throw new Error("Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in deployment settings.");
      }

      const sessionPromise = supabase.auth.getSession();
      let session: any = null;
      try {
        const result = await withTimeout(sessionPromise, 5000, "Session timed out");
        session = result?.data?.session;
      } catch (timeoutErr) {
        console.error("session timeout:", timeoutErr);
        throw new Error("Authentication timed out. Please refresh and try again.");
      }

      const token = session?.access_token;

      const res = await fetchWithTimeout(
        "/api/tutor/threads",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({}),
        },
        12000,
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Server returned status ${res.status}`);
      }

      const json = await res.json();
      const id = json?.thread?.id;
      if (id) {
        navigate({ to: `/tutor/${id}` });
      } else {
        throw new Error("No thread ID returned from server");
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create study session"));
      setLoading(false);
    } finally {
      if (sessionCreationTimeout) clearTimeout(sessionCreationTimeout);
    }
  };

  useEffect(() => {
    createSession();
  }, [navigate]);

  if (error) {
    const isServiceRoleError =
      error.includes("SUPABASE_SERVICE_ROLE_KEY") || error.toLowerCase().includes("service_role");
    const isLovableKeyError =
      error.includes("GEMINI_API_KEY") ||
      error.includes("LOVABLE_API_KEY") ||
      error.toLowerCase().includes("gemini_api_key") ||
      error.toLowerCase().includes("lovable_api_key");
    const isUnauthorizedError =
      error.toLowerCase().includes("unauthorized") ||
      error.toLowerCase().includes("token") ||
      error.toLowerCase().includes("claims");

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center animate-in-slide">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-foreground">
          Failed to start tutor chat
        </h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">{error}</p>
        {isServiceRoleError && (
          <div className="mt-4 max-w-md rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3 text-xs text-amber-800 dark:text-amber-200/90 text-left">
            <strong>Setup Required:</strong> You are missing the{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> in your local <code>.env</code> file. Add this
            environment variable from your Supabase Project Settings to enable local server-side
            operations.
          </div>
        )}
        {isLovableKeyError && (
          <div className="mt-4 max-w-md rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3 text-xs text-amber-800 dark:text-amber-200/90 text-left">
            <strong>Configuration Missing:</strong> You are missing the <code>GEMINI_API_KEY</code>{" "}
            environment variable. Please make sure this key is added to your local <code>.env</code>{" "}
            file or deployment settings to connect directly to Gemini. You can obtain a free API key
            from{" "}
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:text-primary"
            >
              Google AI Studio
            </a>
            .
          </div>
        )}
        {isUnauthorizedError && !isServiceRoleError && !isLovableKeyError && (
          <div className="mt-4 max-w-md rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 p-3 text-xs text-blue-800 dark:text-blue-200/90 text-left">
            <strong>Authentication Tip:</strong> Your session might be using stale cached tokens
            from a previous database. Try clicking the <strong>Sign Out</strong> button in the
            sidebar (or clear browser localStorage/cookies) and sign back in to establish a fresh
            connection.
          </div>
        )}
        <Button
          onClick={createSession}
          className="mt-6 flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground font-medium">Creating your study session…</p>
    </div>
  );
}