import { createFileRoute, useNavigate, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithTimeout, getErrorMessage, withTimeout } from "@/lib/async";
import { GilaniLoader } from "@/components/GilaniLoader";

export const Route = createFileRoute("/_authenticated/tutor")({
  component: TutorIndex,
});

function TutorIndex() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const startedRef = useRef(false);

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
      const hasSupabaseKey =
        !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!hasSupabaseUrl || !hasSupabaseKey) {
        throw new Error(
          "Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in deployment settings.",
        );
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

      const userId = session?.user?.id;
      if (userId) {
        // Query the most recent existing thread to keep the chat threaded (wrapped in timeout to prevent hangs)
        try {
          const { data: existingThreads } = (await withTimeout(
            Promise.resolve(
              supabase
                .from("conversations")
                .select("id")
                .eq("user_id", userId)
                .order("updated_at", { ascending: false })
                .limit(1),
            ),
            5000,
            "Thread lookup timed out",
          )) as any;

          if (existingThreads && existingThreads.length > 0) {
            const threadId = existingThreads[0].id;
            console.log("[TutorIndex] Navigating to existing most recent thread:", threadId);
            try {
              await navigate({
                to: "/tutor/$threadId",
                params: { threadId },
              } as any);
              return;
            } catch (navErr) {
              console.error("[TutorIndex] navigation to existing failed:", navErr);
              window.location.href = `/tutor/${threadId}`;
              return;
            }
          }
        } catch (fetchErr) {
          console.warn("[TutorIndex] Existing thread check timed out or failed:", fetchErr);
        }
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

      // Debug: Log response for network issues
      console.log("[TutorIndex] thread response:", { status: res.status, ok: res.ok });

      let json: any;
      try {
        json = await res.json();
        console.log("[TutorIndex] thread response JSON:", json);
      } catch (parseErr) {
        throw new Error("Server returned an invalid response format. Check your API route.");
      }

      if (!res.ok) {
        throw new Error(json?.error || `Server returned status ${res.status}`);
      }

      const id = json?.thread?.id;
      if (id) {
        console.log("[TutorIndex] Navigating to thread:", id);
        try {
          await navigate({
            to: "/tutor/$threadId",
            params: { threadId: id },
          } as any);
          console.log("[TutorIndex] Navigation completed");
        } catch (navErr) {
          console.error("[TutorIndex] navigation failed:", navErr);
          // Force redirect as fallback
          window.location.href = `/tutor/${id}`;
        }
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
    const isExactTutor = location.pathname === "/tutor" || location.pathname === "/tutor/";

    if (!isExactTutor) {
      // ✅ Reset the guard whenever we're viewing a thread so that the NEXT
      // time we return to /tutor (e.g. after deleting the current thread)
      // createSession() fires again instead of being permanently blocked.
      startedRef.current = false;
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;
    createSession();
  }, [location.pathname]);

  const isExactTutor = location.pathname === "/tutor" || location.pathname === "/tutor/";
  if (!isExactTutor) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    );
  }

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

  return <GilaniLoader />;
}
