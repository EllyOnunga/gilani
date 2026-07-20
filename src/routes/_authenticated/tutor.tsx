import { createFileRoute, useNavigate, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState, Suspense, lazy } from "react";
import { supabase } from "@/client/supabase";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { toast } from "sonner";
import { fetchWithTimeout, getErrorMessage, withTimeout } from "@/shared/utils/async";
import { GilaniLoader } from "@/client/components/GilaniLoader";
import { ChatInput } from "@/client/components/tutor/ChatInput";
import { EmptyState } from "@/client/components/tutor/EmptyState";
import { ThreadHeader } from "@/client/components/tutor/ThreadHeader";
import { PomodoroTimer } from "@/client/components/tutor/PomodoroTimer";
const InAppCamera = lazy(() =>
  import("@/client/components/tutor/InAppCamera").then((m) => ({ default: m.InAppCamera })),
);
import { useComposer } from "@/client/components/tutor/hooks/useComposer";
import { useThreadsQuery } from "@/client/hooks/useThreadsQuery";
import { setPendingMessage } from "@/shared/utils/pending-message";
import { useLayout } from "@/client/contexts/layout-context";
import { useAuth } from "@/client/hooks/use-auth";
import { PullToRefresh } from "@/client/components/ui/PullToRefresh";
import { useProfile } from "@/client/components/layout/hooks/split/useProfile";

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

  const { session, loading: authLoading } = useAuth();
  const authToken = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  const { profileName } = useProfile(userId);

  const [creatingThread, setCreatingThread] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerState, setTimerState] = useState<{
    minutes: number;
    seconds: number;
    running: boolean;
  } | null>(null);
  const { threads, invalidateThreads } = useThreadsQuery(userId);
  const { sidebarOpen, setSidebarOpen, requestRenameThread, requestDeleteThread } = useLayout();

  useEffect(() => {
    const handler = (e: Event) => {
      const { minutes, seconds, running } = (e as CustomEvent).detail as any;
      setTimerState(running ? { minutes, seconds, running } : null);
    };
    window.addEventListener("pomodoro:tick", handler);
    return () => window.removeEventListener("pomodoro:tick", handler);
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

  // If not exact tutor route, we don't render the empty state composer.
  // The child route handles rendering its own messages.
  if (!isExactTutor) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    );
  }

  // Exact /tutor route layout (empty state)
  if (authLoading) {
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
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          createNewThread={() => navigate({ to: "/tutor", search: { new: "1" } } as any)}
          requestRenameThread={requestRenameThread}
          requestDeleteThread={requestDeleteThread}
          setTimerOpen={setTimerOpen}
          handleExportPDF={() => {}}
          setEscalateModalOpen={() => {}}
        />
        <PullToRefresh
          className="flex-1 min-h-0"
          onRefresh={async () => {
            invalidateThreads();
            // small delay so the spinner is visible
            await new Promise((r) => setTimeout(r, 600));
          }}
        >
          <EmptyState
            onPromptClick={composer.handlePromptClick}
            onUploadClick={() => {
              const el = document.getElementById("chat-file-input") as HTMLInputElement | null;
              el?.click();
            }}
            onScanClick={composer.handleScanClick}
            onVoiceClick={composer.toggleVoiceInput}
            isListening={composer.isListening}
            recentThreads={threads}
            allThreadsPath="/tutor/chats"
            userName={(profileName || session?.user?.user_metadata?.full_name) ?? null}
          />
        </PullToRefresh>
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

      {composer.isCameraOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black" />}>
          <InAppCamera
            onCapture={(file) => {
              composer.setIsCameraOpen(false);
              composer.handleRawFile(file, "scan");
            }}
            onClose={() => composer.setIsCameraOpen(false)}
          />
        </Suspense>
      )}

      <PomodoroTimer open={timerOpen} onOpenChange={setTimerOpen} showTrigger={false} />
    </div>
  );
}
