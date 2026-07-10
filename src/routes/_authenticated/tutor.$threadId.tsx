import React, { useCallback, useEffect, useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GilaniLoader } from "@/components/GilaniLoader";
import { useLayout } from "@/contexts/layout-context";
import { parseDocument } from "@/lib/document-parser";
import { toast } from "sonner";
import { friendlyError } from "@/lib/async";
import { generateThreadTitleFn, renameThreadFn } from "@/lib/tutor.server-fns";
import { consumePendingMessage } from "@/lib/pending-message";
import { useAuth } from "@/hooks/use-auth";

import { useTutorChat } from "@/components/tutor/hooks/useTutorChat";
import { useComposer } from "@/components/tutor/hooks/useComposer";
import { ThreadHeader } from "@/components/tutor/ThreadHeader";
import { ChatInput } from "@/components/tutor/ChatInput";
import { PlansModal } from "@/components/PlansModal";
import { EscalateModal } from "@/components/tutor/EscalateModal";
import { MessageList } from "@/components/tutor/MessageList";
import { PomodoroTimer } from "@/components/tutor/PomodoroTimer";
import { InAppCamera } from "@/components/tutor/InAppCamera";

export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  component: TutorThread,
});

// Export utils loaded lazily
const exportAsPDF = async (
  ...args: Parameters<typeof import("@/lib/export-utils").exportAsPDF>
) => {
  try {
    const { exportAsPDF: fn } = await import("@/lib/export-utils");
    return fn(...args);
  } catch {
    const { toast } = await import("sonner");
    toast.error("Export failed — try again or use a different browser");
  }
};

function TutorThread() {
  const { threadId } = Route.useParams();
  const { session, loading: authLoading } = useAuth();

  const authToken = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  if (authLoading) return <GilaniLoader />;

  return <TutorThreadInner key={threadId} authToken={authToken} userId={userId} />;
}

function TutorThreadInner({
  authToken,
  userId,
}: {
  authToken: string | null;
  userId: string | null;
}) {
  const { threadId } = Route.useParams();
  const navigate = useNavigate({ from: "/tutor/$threadId" });
  const { sidebarOpen, setSidebarOpen, requestRenameThread, requestDeleteThread } = useLayout();

  const chatState = useTutorChat({ threadId, userId, authToken });
  const composer = useComposer();

  const [timerOpen, setTimerOpen] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState("");

  const [timerState, setTimerState] = useState<{
    minutes: number;
    seconds: number;
    running: boolean;
  } | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const { minutes, seconds, running } = (e as CustomEvent).detail as any;
      setTimerState(running ? { minutes, seconds, running } : null);
    };
    window.addEventListener("pomodoro:tick", handler);
    return () => window.removeEventListener("pomodoro:tick", handler);
  }, []);

  useEffect(() => {
    const handleGlobalEscalate = () => {
      if (!chatState.escalationStatus && !chatState.escalating && !chatState.messagesLoading) {
        setEscalateModalOpen(true);
      }
    };
    window.addEventListener("custom:trigger-escalation", handleGlobalEscalate);
    return () => window.removeEventListener("custom:trigger-escalation", handleGlobalEscalate);
  }, [chatState.escalationStatus, chatState.escalating, chatState.messagesLoading]);

  const handleExportPDF = useCallback(() => {
    const title = chatState.threads.find((t) => t.id === threadId)?.title || "study-session";
    exportAsPDF(chatState.messages, title);
  }, [chatState.threads, threadId, chatState.messages]);

  const sendChatMessage = (
    finalMessage: string,
    titleSeedText: string,
    attachmentMeta?: { storageUrl?: string; mimeType?: string; fileName?: string },
  ) => {
    try {
      const currentThread = chatState.threads.find((t) => t.id === threadId);
      if (chatState.messages.length === 0 && !currentThread?.title) {
        generateThreadTitleFn({ data: titleSeedText })
          .then((title) => {
            renameThreadFn({ data: { threadId, title } })
              .then(() => {
                chatState.setThreads((prev: any[]) =>
                  prev.map((t) => (t.id === threadId ? { ...t, title } : t)),
                );
              })
              .catch(console.error);
          })
          .catch(console.error);
      }
      chatState.sendMessage({ text: finalMessage }, attachmentMeta).catch((error: unknown) => {
        console.error("[TutorThread] sendMessage background error:", error);
        toast.error("Failed to send message. Please try again.");
      });
    } catch (error) {
      console.error("[TutorThread] submit error:", error);
    }
  };

  const submit = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    const trimmedInput = composer.input.trim();
    if (!composer.hasContent(trimmedInput)) return;
    const finalMessage = composer.buildMessageText(trimmedInput);
    const titleSeedText =
      trimmedInput ||
      (composer.attachedFile
        ? `Uploaded a document: ${composer.attachedFile.name}`
        : "Started a new session");
    const attachmentMeta = composer.attachedFile
      ? {
          storageUrl: composer.attachedFile.storageUrl,
          mimeType: composer.attachedFile.mimeType,
          fileName: composer.attachedFile.name,
        }
      : undefined;
    composer.setInput("");
    composer.onRemoveFile();
    sendChatMessage(finalMessage, titleSeedText, attachmentMeta);
  };

  useEffect(() => {
    if (!threadId) return;
    const pending = consumePendingMessage(threadId);
    if (pending) {
      sendChatMessage(pending.finalMessage, pending.titleSeedText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const handleEscalateConfirm = async (email?: string) => {
    const success = await chatState.handleEscalate(email);
    if (success) {
      setEscalateModalOpen(false);
      setTeacherEmail("");
    }
  };

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden">
      <main
        className="flex flex-col min-w-0 overflow-hidden w-full h-full"
        style={{ flex: 1, minHeight: 0 }}
      >
        <ThreadHeader
          threadId={threadId as string}
          threads={chatState.threads}
          userId={userId}
          timerState={timerState}
          escalationStatus={chatState.escalationStatus}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          createNewThread={() => chatState.createNewThread(navigate)}
          requestRenameThread={requestRenameThread}
          requestDeleteThread={requestDeleteThread}
          setTimerOpen={setTimerOpen}
          handleExportPDF={handleExportPDF}
          setEscalateModalOpen={setEscalateModalOpen}
        />

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <MessageList
            messages={chatState.messages}
            messagesLoading={chatState.messagesLoading}
            messagesLoadError={chatState.messagesLoadError}
            isPending={chatState.isPending}
            isRateLimited={chatState.isRateLimited}
            chatError={chatState.chatError}
            onReload={chatState.handleReload}
            onEditRequest={composer.handleEditRequest}
            onDelete={chatState.handleDeleteMessage}
            onPromptClick={composer.handlePromptClick}
            recentThreads={chatState.threads.slice(0, 3)}
            userId={userId}
            userVotes={chatState.userVotes}
            onVote={chatState.handleVote}
            onExportPDF={handleExportPDF}
            onEscalate={() => setEscalateModalOpen(true)}
            escalationStatus={chatState.escalationStatus}
            escalating={chatState.escalating}
            onUploadClick={() => {
              const el = document.getElementById("chat-file-input") as HTMLInputElement | null;
              el?.click();
            }}
            onScanClick={composer.handleScanClick}
            onVoiceClick={composer.toggleVoiceInput}
            isListening={composer.isListening}
            allThreadsPath="/tutor/chats"
            onRateLimitExpired={() => {
              chatState.setChatError(null);
              chatState.refreshRateLimitStatus();
            }}
            messagesUsed={chatState.messagesUsed}
            messagesMax={chatState.messagesMax}
            onUpgrade={() => setShowPlans(true)}
          />
        </div>

        <div className="flex-shrink-0 z-20 lg:relative fixed bottom-0 left-0 right-0">
          <ChatInput
            input={composer.input}
            isPending={chatState.isPending}
            parsingFile={composer.parsingFile}
            attachedFile={composer.attachedFile}
            chatError={chatState.chatError}
            docUploadError={composer.docUploadError}
            onClearDocError={composer.onClearDocError}
            onInputChange={(e) => composer.setInput(e.target.value)}
            onSubmit={submit}
            onStop={chatState.stop}
            onFileChange={composer.handleFileChange}
            inputRef={composer.chatInputRef}
            onRemoveFile={composer.onRemoveFile}
            onUpgrade={() => setShowPlans(true)}
            onRateLimitExpired={() => {
              chatState.setChatError(null);
              chatState.refreshRateLimitStatus();
            }}
            messagesUsed={chatState.messagesUsed}
            messagesMax={chatState.messagesMax}
            onScanClick={composer.handleScanClick}
            onVoiceClick={composer.toggleVoiceInput}
            isListening={composer.isListening}
          />
        </div>
      </main>

      {composer.isCameraOpen && (
        <InAppCamera
          onCapture={(file) => {
            composer.setIsCameraOpen(false);
            composer.handleRawFile(file, "scan");
          }}
          onClose={() => composer.setIsCameraOpen(false)}
        />
      )}

      {showPlans && (
        <PlansModal onClose={() => setShowPlans(false)} currentPlan={chatState.currentPlan} />
      )}

      {escalateModalOpen && (
        <EscalateModal
          teacherEmail={teacherEmail}
          onEmailChange={(val) => {
            setTeacherEmail(val);
            chatState.setEscalateEmailError("");
          }}
          onConfirm={() => handleEscalateConfirm(teacherEmail || undefined)}
          onCancel={() => {
            setEscalateModalOpen(false);
            setTeacherEmail("");
            chatState.setEscalateEmailError("");
          }}
          isEscalating={chatState.escalating}
          error={chatState.escalateEmailError}
        />
      )}

      <PomodoroTimer open={timerOpen} onOpenChange={setTimerOpen} showTrigger={false} />
    </div>
  );
}
