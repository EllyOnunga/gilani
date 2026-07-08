import { createFileRoute, useNavigate, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchWithTimeout, getErrorMessage, withTimeout } from "@/lib/async";
import { GilaniLoader } from "@/components/GilaniLoader";
import { ChatInput } from "@/components/tutor/ChatInput";
import { EmptyState } from "@/components/tutor/EmptyState";
import { ThreadHeader } from "@/components/tutor/ThreadHeader";
import { PomodoroTimer } from "@/components/tutor/PomodoroTimer";
import { useComposer } from "@/components/tutor/hooks/useComposer";
import { useThreadsQuery } from "@/lib/hooks/useThreadsQuery";
import { setPendingMessage } from "@/lib/pending-message";
import { useLayout } from "@/contexts/layout-context";

export const Route = createFileRoute("/_authenticated/tutor")({
  component: TutorIndex,
  validateSearch: (s: Record<string, unknown>): { new?: "1" } =>
    s.new === "1" ? { new: "1" } : {},
});

function TutorIndex() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hooks must be called unconditionally on every render (Rules of Hooks) —
  // this component persists as the layout for /tutor/$threadId (it renders
  // <Outlet/> below), so isExactTutor's value can change across renders of
  // the SAME mounted instance as the user navigates between /tutor and a
  // thread. Conditionally skipping hooks based on it caused React error
  // #300/#310 ("hooks count changed between renders").
  const isExactTutor = location.pathname === "/tutor" || location.pathname === "/tutor/";

  const composer = useComposer();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [creatingThread, setCreatingThread] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerState, setTimerState] = useState<{
    minutes: number;
    seconds: number;
    running: boolean;
  } | null>(null);
  const startedRef = useRef(false);
  const { threads } = useThreadsQuery(userId);
  const { setSidebarOpen, requestRenameThread, requestDeleteThread } = useLayout();

  useEffect(() => {
    const handler = (e: Event) => {
      const { minutes, seconds, running } = (e as CustomEvent).detail as any;
      setTimerState(running ? { minutes, seconds, running } : null);
    };
    window.addEventListener("pomodoro:tick", handler);
    return () => window.removeEventListener("pomodoro:tick", handler);
  }, []);

  const checkSession = async () => {
    setError(null);
    setLoading(true);
    setCreatingThread(false);
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

      setAuthToken(session?.access_token ?? null);
      const sessionUserId = session?.user?.id ?? null;
      setUserId(sessionUserId);

      // Always land on the empty-state composer, even if the user has previous
      // threads. The actual conversation row is only created once the user
      // sends a first message. Previous chats remain reachable via the sidebar.
      setLoading(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to start tutor chat"));
      setLoading(false);
    } finally {
      if (sessionCreationTimeout) clearTimeout(sessionCreationTimeout);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    // Only the exact /tutor draft page needs to check the session on mount;
    // when this layout first mounts on a child route (e.g. a direct link to
    // /tutor/$threadId), skip it — the thread route handles its own auth.
    if (!isExactTutor) return;
    checkSession();
    // isExactTutor is intentionally excluded: this must run once on mount
    // only (guarded by startedRef above), not re-fire on every route change
    // between /tutor and a thread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render Outlet for child routes now that all hooks above have been
  // called unconditionally on every render.
  if (!isExactTutor) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    );
  }

  const handleDraftSubmit = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    const trimmedInput = composer.input.trim();
    if (!composer.hasContent(trimmedInput)) return;

    const finalMessage = composer.buildMessageText(trimmedInput);
    const titleSeedText =
      trimmedInput ||
      (composer.attachedFile
        ? `Uploaded a document: ${composer.attachedFile.name}`
        : "Started a new session");

    composer.setInput("");
    composer.onRemoveFile();

    // Generate an ID locally for instant transition. The server will auto-create
    // the row when the first message hits the chat API.
    const id = crypto.randomUUID();
    setPendingMessage(id, { finalMessage, titleSeedText });
    await navigate({ to: "/tutor/$threadId", params: { threadId: id } } as any);
  };

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
    const safeError = isServiceRoleError
      ? "Server configuration error. Please contact support."
      : isLovableKeyError
        ? "AI service configuration error. Please contact support."
        : isUnauthorizedError
          ? "Your session has expired. Please sign in again."
          : "An unexpected error occurred. Please try again.";

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-5 sm:p-8 text-center animate-in-slide">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-foreground">
          Failed to start tutor chat
        </h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">{safeError}</p>
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
          onClick={checkSession}
          className="mt-6 flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  if (loading) {
    return <GilaniLoader />;
  }

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden">
      <main
        className="flex flex-col min-w-0 overflow-hidden w-full h-full"
        style={{ flex: 1, minHeight: 0 }}
      >
        <ThreadHeader
          threadId={undefined}
          threads={threads}
          userId={userId}
          timerState={timerState}
          escalationStatus={null}
          setSidebarOpen={setSidebarOpen}
          createNewThread={() => navigate({ to: "/tutor", search: { new: "1" } } as any)}
          requestRenameThread={requestRenameThread}
          requestDeleteThread={requestDeleteThread}
          setTimerOpen={setTimerOpen}
          handleExportPDF={() => {}}
          setEscalateModalOpen={() => {}}
        />
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <EmptyState
            onPromptClick={composer.handlePromptClick}
            onUploadClick={() => {
              const el = document.getElementById("chat-file-input") as HTMLInputElement | null;
              el?.click();
            }}
            onScanClick={composer.handleScanClick}
            onVoiceClick={composer.toggleVoiceInput}
            isListening={composer.isListening}
            recentThreads={threads.slice(0, 3)}
            allThreadsPath="/tutor/chats"
          />
        </div>
        <div className="flex-shrink-0 z-20 lg:relative fixed bottom-0 left-0 right-0">
          <ChatInput
            input={composer.input}
            isPending={creatingThread}
            parsingFile={composer.parsingFile}
            attachedFile={composer.attachedFile}
            chatError={null}
            docUploadError={composer.docUploadError}
            onClearDocError={composer.onClearDocError}
            onInputChange={(e) => composer.setInput(e.target.value)}
            onSubmit={handleDraftSubmit}
            onFileChange={composer.handleFileChange}
            inputRef={composer.chatInputRef}
            onRemoveFile={composer.onRemoveFile}
            onScanClick={composer.handleScanClick}
            onVoiceClick={composer.toggleVoiceInput}
            isListening={composer.isListening}
          />
        </div>
      </main>
      <PomodoroTimer open={timerOpen} onOpenChange={setTimerOpen} showTrigger={false} />
    </div>
  );
}
