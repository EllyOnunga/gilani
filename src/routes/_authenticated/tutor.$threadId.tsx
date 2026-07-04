import React, { useCallback, useEffect, useState, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GilaniLoader } from "@/components/GilaniLoader";
import { useLayout } from "@/contexts/layout-context";
import { parseDocument } from "@/lib/document-parser";
import { toast } from "sonner";
import { friendlyError } from "@/lib/async";
import { generateThreadTitleFn, renameThreadFn } from "@/lib/tutor.server-fns";

import { useTutorChat } from "@/components/tutor/hooks/useTutorChat";
import { ThreadHeader } from "@/components/tutor/ThreadHeader";
import { ChatInput } from "@/components/tutor/ChatInput";
import { PlansModal } from "@/components/PlansModal";
import { EscalateModal } from "@/components/tutor/EscalateModal";
import { MessageList } from "@/components/tutor/MessageList";
import { PomodoroTimer } from "@/components/tutor/PomodoroTimer";

export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  component: TutorThread,
});

// Export utils loaded lazily
const exportAsPDF = async (...args: Parameters<typeof import("@/lib/export-utils").exportAsPDF>) => {
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
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then((res) => {
      if (!active) return;
      const session = res?.data?.session;
      if (session?.access_token) setAuthToken(session.access_token);
      if (session?.user?.id) setUserId(session.user.id);
      setAuthLoading(false);
    }).catch((err) => {
      console.error("[TutorThread] Failed to get auth session:", err);
      if (active) setAuthLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (authLoading) return <GilaniLoader />;

  return <TutorThreadInner key={threadId} authToken={authToken} userId={userId} />;
}

function TutorThreadInner({ authToken, userId }: { authToken: string | null; userId: string | null }) {
  const { threadId } = Route.useParams();
  const navigate = useNavigate({ from: "/tutor/$threadId" });
  const { setSidebarOpen, requestRenameThread, requestDeleteThread } = useLayout();

  const chatState = useTutorChat({ threadId, userId, authToken });

  const [input, setInput] = useState("");
  const [timerOpen, setTimerOpen] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState("");

  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string; size: number; } | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);

  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [timerState, setTimerState] = useState<{ minutes: number; seconds: number; running: boolean } | null>(null);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setDocUploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is 2MB.`);
      return;
    }

    setParsingFile(true);
    setDocUploadError(null);
    const toastId = toast.loading(`Extracting text from ${file.name}...`);
    try {
      const parsed = await parseDocument(file);
      setAttachedFile(parsed);
      toast.success("Document attached successfully!", { id: toastId });
    } catch (err: any) {
      const errMsg = friendlyError(err, "Failed to attach document.");
      setDocUploadError(errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setParsingFile(false);
    }
  };

  const handleExportPDF = useCallback(() => {
    const title = chatState.threads.find((t) => t.id === threadId)?.title || "study-session";
    exportAsPDF(chatState.messages, title);
  }, [chatState.threads, threadId, chatState.messages]);

  const handleEditRequest = useCallback(
    (text: string) => {
      setInput(text);
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
          chatInputRef.current.setSelectionRange(
            chatInputRef.current.value.length,
            chatInputRef.current.value.length,
          );
        }
      }, 50);
    },
    [setInput],
  );

  const handlePromptClick = useCallback(
    (prompt: string) => {
      setInput(prompt);
      setTimeout(() => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();
          chatInputRef.current.setSelectionRange(prompt.length, prompt.length);
        }
      }, 50);
    },
    [setInput],
  );

  const submit = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    const trimmedInput = input.trim();
    if (!trimmedInput && !attachedFile) return;
    try {
      let finalMessage = trimmedInput;
      if (attachedFile) {
        const MAX_DOC_CHARS = 8000;
        const docText =
          attachedFile.text.length > MAX_DOC_CHARS
            ? attachedFile.text.slice(0, MAX_DOC_CHARS) +
            "\n\n[Document truncated to 8000 characters due to size limits]"
            : attachedFile.text;
        finalMessage = `[Document Attached: ${attachedFile.name}]\n\n<DocumentContent name="${attachedFile.name}">\n${docText}\n</DocumentContent>\n\nStudent Query: ${trimmedInput || "(See attached document)"}`;
      }

      const currentThread = chatState.threads.find((t) => t.id === threadId);
      if (
        chatState.messages.length === 0 &&
        (!currentThread?.title ||
          currentThread.title === "New thread" ||
          currentThread.title === "New tutor session")
      ) {
        const userInputText = trimmedInput || (attachedFile ? `Uploaded a document: ${attachedFile.name}` : "Started a new session");
        generateThreadTitleFn({ data: userInputText })
          .then((title) => {
            renameThreadFn({ data: { threadId, title } })
              .then(() => {
                chatState.setThreads((prev: any[]) =>
                  prev.map((t) => (t.id === threadId ? { ...t, title } : t))
                );
              })
              .catch(console.error);
          })
          .catch(console.error);
      }

      setInput("");
      setAttachedFile(null);
      chatState.sendMessage({ text: finalMessage }).catch((error: unknown) => {
        console.error("[TutorThread] sendMessage background error:", error);
        toast.error("Failed to send message. Please try again.");
      });
    } catch (error) {
      console.error("[TutorThread] submit error:", error);
    }
  };

  const handleEscalateConfirm = async (email?: string) => {
    const success = await chatState.handleEscalate(email);
    if (success) {
      setEscalateModalOpen(false);
      setTeacherEmail("");
    }
  };

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden">
      <main className="flex flex-col min-w-0 overflow-hidden w-full h-full" style={{ flex: 1, minHeight: 0 }}>
        <ThreadHeader
          threadId={threadId as string}
          threads={chatState.threads}
          userId={userId}
          timerState={timerState}
          escalationStatus={chatState.escalationStatus}
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
            onEditRequest={handleEditRequest}
            onDelete={chatState.handleDeleteMessage}
            onPromptClick={handlePromptClick}
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
            onScanClick={() => {
              const el = document.getElementById("chat-file-input") as HTMLInputElement | null;
              if (el) {
                el.setAttribute("capture", "environment");
                el.click();
                setTimeout(() => el.removeAttribute("capture"), 500);
              }
            }}
            onVoiceClick={() => chatInputRef.current?.focus()}
            allThreadsPath="/tutor/chats"
          />
        </div>

        <div className="flex-shrink-0 z-20 lg:relative fixed bottom-0 left-0 right-0">
          <ChatInput
            input={input}
            isPending={chatState.isPending}
            parsingFile={parsingFile}
            attachedFile={attachedFile}
            chatError={chatState.chatError}
            docUploadError={docUploadError}
            onClearDocError={() => setDocUploadError(null)}
            onInputChange={(e) => setInput(e.target.value)}
            onSubmit={submit}
            onStop={chatState.stop}
            onFileChange={handleFileChange}
            inputRef={chatInputRef}
            onRemoveFile={() => {
              setAttachedFile(null);
              setDocUploadError(null);
            }}
            onUpgrade={() => setShowPlans(true)}
            onRateLimitExpired={() => {
              chatState.setChatError(null);
              chatState.refreshRateLimitStatus();
            }}
            messagesUsed={chatState.messagesUsed}
            messagesMax={chatState.messagesMax}
            onScanClick={() => {
              const el = document.getElementById("chat-file-input") as HTMLInputElement | null;
              if (el) {
                el.setAttribute("capture", "environment");
                el.click();
                setTimeout(() => el.removeAttribute("capture"), 500);
              }
            }}
            onVoiceClick={() => chatInputRef.current?.focus()}
          />
        </div>
      </main>

      {showPlans && <PlansModal onClose={() => setShowPlans(false)} currentPlan={chatState.currentPlan} />}

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
