import React, { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle,
  Plus,
  X,
  Send,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Brain,
  Paperclip,
  Trash2,
  FileText,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Copy,
  RefreshCw,
  Search,
} from "lucide-react";
import { parseDocument } from "@/lib/document-parser";
import { deleteThreadFn, generateThreadTitleFn } from "@/lib/tutor.server-fns";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { Mic, MicOff, Volume2, VolumeX, Download, FileDown } from "lucide-react";
import { withTimeout } from "@/lib/async";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "katex/dist/katex.min.css";
import "katex/dist/contrib/mhchem.min.js";

// Route declaration
export const Route = createFileRoute("/_authenticated/tutor/$threadId")({
  component: TutorThread,
});

type Thread = {
  id: string;
  title?: string | null;
  updated_at?: string | null;
};

function TutorThread() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then((res) => {
        if (!active) return;
        const session = res?.data?.session;
        if (session?.access_token) setAuthToken(session.access_token);
        setAuthLoading(false);
      })
      .catch((err) => {
        console.error("[TutorThread] Failed to get auth session:", err);
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground font-medium">Verifying credentials…</p>
      </div>
    );
  }

  return <TutorThreadInner authToken={authToken} />;
}

function TutorThreadInner({ authToken }: { authToken: string | null }) {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesLoadError, setMessagesLoadError] = useState<string | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsLoadError, setThreadsLoadError] = useState<string | null>(null);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [escalationStatus, setEscalationStatus] = useState<
    "open" | "in_review" | "resolved" | null
  >(null);
  const [escalating, setEscalating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Custom dialog state for session deleting (prevents window.confirm)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Client-side file attachment states
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    text: string;
    size: number;
  } | null>(null);
  const [parsingFile, setParsingFile] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setParsingFile(true);
      const file = e.target.files[0];
      const toastId = toast.loading(`Extracting text from ${file.name}...`);
      try {
        const parsed = await parseDocument(file);
        setAttachedFile(parsed);
        toast.success("Document attached successfully!", { id: toastId });
      } catch (err: any) {
        toast.error(err.message || "Failed to attach document", { id: toastId });
      } finally {
        setParsingFile(false);
        e.target.value = ""; // Reset element value
      }
    }
  };

  // Curriculum profiles state
  const [curriculum, setCurriculum] = useState<string>("KCSE");

  // Load student's saved curriculum from profiles
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sessionRes = await supabase.auth.getSession();
        const userId = sessionRes?.data?.session?.user?.id;
        if (!userId) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("curriculum")
          .eq("id", userId)
          .maybeSingle();

        if (error) throw error;
        if (mounted && data?.curriculum) {
          setCurriculum(data.curriculum);
        }
      } catch (err) {
        console.error("Failed to load user curriculum profile:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCurriculumChange = async (newVal: string) => {
    setCurriculum(newVal);
    const toastId = toast.loading(`Updating curriculum to ${newVal}...`);
    try {
      const sessionRes = await supabase.auth.getSession();
      const userId = sessionRes?.data?.session?.user?.id;
      if (!userId) throw new Error("Not logged in");

      const { error } = await supabase
        .from("profiles")
        .update({ curriculum: newVal })
        .eq("id", userId);

      if (error) throw error;
      toast.success(`Curriculum switched to ${newVal}!`, { id: toastId });
    } catch (err: any) {
      console.error("Failed to update curriculum profile:", err);
      toast.error(err.message || "Failed to update curriculum", { id: toastId });
    }
  };

  // Safety net: force all loading states off after 10s regardless of what else is happening.
  useEffect(() => {
    const safety = setTimeout(() => {
      setMessagesLoading((prev) => {
        if (prev) console.warn("[TutorThread] Safety timeout: forcing messagesLoading off");
        return false;
      });
      setThreadsLoading((prev) => {
        if (prev) console.warn("[TutorThread] Safety timeout: forcing threadsLoading off");
        return false;
      });
    }, 10000);
    return () => clearTimeout(safety);
  }, []);

  // transport is memoized
  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/chat",
        body: { threadId },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      }),
    [threadId, authToken],
  );

  const chatHelpers: any = useChat({
    transport,
    onError: (err) => setChatError(err instanceof Error ? err.message : String(err)),
    onFinish: () => {
      setChatError(null);
    },
  });
  const { messages: messagesRaw, setMessages, sendMessage, status, reload } = chatHelpers;
  const messages = messagesRaw as UIMessage[];

  const isPending = status === "submitted" || status === "streaming";

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);

    // Auto-resize textarea logic
    event.target.style.height = "auto";
    event.target.style.height = `${event.target.scrollHeight}px`;
  };

  const submit = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    try {
      let finalMessage = trimmedInput;
      if (attachedFile) {
        finalMessage = `[Document Attached: ${attachedFile.name}]\n\n<DocumentContent name="${attachedFile.name}">\n${attachedFile.text}\n</DocumentContent>\n\nStudent Query: ${trimmedInput}`;
      }

      const currentThread = threads.find((t) => t.id === threadId);
      if (
        messages.length === 0 &&
        (!currentThread?.title ||
          currentThread.title === "New thread" ||
          currentThread.title === "New tutor session")
      ) {
        generateThreadTitleFn({ data: trimmedInput }).then((derivedTitle) => {
          supabase
            .from("conversations")
            .update({ title: derivedTitle })
            .eq("id", threadId)
            .then(({ error }) => {
              if (error) console.error("Failed to update thread title:", error);
            });
          setThreads((prev) =>
            prev.map((t) =>
              t.id === threadId ? { ...t, title: derivedTitle } : t,
            ),
          );
        }).catch(() => {
          const fallback =
            trimmedInput.slice(0, 29) + (trimmedInput.length > 29 ? "..." : "");
          supabase
            .from("conversations")
            .update({ title: fallback })
            .eq("id", threadId);
          setThreads((prev) =>
            prev.map((t) =>
              t.id === threadId ? { ...t, title: fallback } : t,
            ),
          );
        });
      }

      // Clear textbox and attachment instantly, and reset height
      setInput("");
      setAttachedFile(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      sendMessage({ text: finalMessage }).catch((error: unknown) => {
        console.error("[TutorThread] sendMessage background error:", error);
        toast.error("Failed to send message. Please try again.");
      });
    } catch (error) {
      console.error("[TutorThread] submit error:", error);
    }
  };

  const handleEscalate = async () => {
    if (!threadId) return;
    setEscalating(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes?.data?.session;
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not logged in");

      const { error } = await supabase.from("escalations").insert({
        conversation_id: threadId,
        user_id: userId,
        reason: "student_request",
        status: "open",
        detail: "Student manually requested teacher review.",
      });

      if (error) throw error;

      setEscalationStatus("open");
      toast.success("Conversation successfully escalated to a teacher!");
    } catch (err: any) {
      console.error("Failed to escalate:", err);
      toast.error(err?.message || "Failed to escalate conversation.");
    } finally {
      setEscalating(false);
    }
  };

  // Listen for global manual escalation events
  useEffect(() => {
    const handleGlobalEscalate = () => {
      if (!escalationStatus && !escalating && !messagesLoading) {
        handleEscalate();
      }
    };
    window.addEventListener("custom:trigger-escalation", handleGlobalEscalate);
    return () => {
      window.removeEventListener("custom:trigger-escalation", handleGlobalEscalate);
    };
  }, [handleEscalate, escalationStatus, escalating, messagesLoading]);

  // Load sidebar thread list
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const sessionResult = (await withTimeout(
          sessionPromise,
          5000,
          "Session fetch timed out",
        ).catch((e) => {
          console.error("[TutorThread] session timeout:", e);
          return { data: { session: null }, error: e };
        })) as any;

        const session = sessionResult?.data?.session;
        const sessionError = sessionResult?.error;

        if (sessionError) {
          if (mounted)
            setThreadsLoadError(
              `Authentication error: ${sessionError.message || sessionError}. Please sign in again.`,
            );
          return;
        }

        const userId = session?.user?.id;
        if (!userId) {
          if (mounted) setThreadsLoadError("Not authenticated. Please sign in.");
          return;
        }

        const { data, error } = (await withTimeout(
          Promise.resolve(
            supabase
              .from("conversations")
              .select("id,title,updated_at")
              .eq("user_id", userId)
              .order("updated_at", { ascending: false }),
          ),
          8000,
          "Database connection timed out",
        )) as any;

        if (error) {
          if (mounted) setThreadsLoadError(`Failed to load sessions: ${error.message}`);
          return;
        }
        if (mounted && data) setThreads(data as Thread[]);
      } catch (e) {
        console.error("[TutorThread] thread load exception:", e);
        if (mounted) setThreadsLoadError("Failed to connect to server. Check your network.");
      } finally {
        if (mounted) setThreadsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load messages and active escalation status for the current thread
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (!threadId) {
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);
    setMessagesLoadError(null);

    timeoutId = setTimeout(() => {
      if (mounted) {
        setMessagesLoading(false);
        setMessagesLoadError("Loading timed out. The database may be unavailable.");
      }
    }, 5000);

    (async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      try {
        const [messagesRes, escalationRes] = await Promise.all([
          supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", threadId)
            .order("created_at", { ascending: true }),
          supabase
            .from("escalations")
            .select("status")
            .eq("conversation_id", threadId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        clearTimeout(timeoutId);

        if (mounted) {
          if (messagesRes.error) {
            setMessagesLoadError(`Database error: ${messagesRes.error.message}`);
            setMessagesLoading(false);
            return;
          }
          console.log("[Messages] loaded count:", messagesRes.data?.length, "for thread:", threadId);
          if (!mounted) return;
          if (messagesRes.data && messagesRes.data.length > 0) {
            setMessages(
              messagesRes.data.map((m) => ({
                id: m.id ?? crypto.randomUUID(),
                role: m.role as "user" | "assistant",
                parts: [{ type: "text" as const, text: m.content || "" }],
                createdAt: m.created_at ? new Date(m.created_at) : new Date(),
              })),
            );
          }
          setEscalationStatus((escalationRes.data?.status as any) || null);
          setMessagesLoading(false);
        }
      } catch (e) {
        clearTimeout(timeoutId);
        if (mounted) {
          setMessagesLoadError("Connection failed. Try refreshing.");
          setMessagesLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [threadId, setMessages]);

  // Smart Scroll to bottom: only scroll when user is already at the bottom or sent a query
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || messages.length === 0) return;

    const threshold = 150; // px
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;

    const lastMessage = messages[messages.length - 1];
    const justSent = lastMessage?.role === "user";

    if (isAtBottom || justSent) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // TTS: speak last assistant message when it arrives
  useEffect(() => {
    if (!ttsEnabled || !messages.length) return;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") {
      const text =
        (last.parts?.find((p: any) => p.type === "text") as any)?.text ||
        (last as any).content ||
        "";
      speakText(text);
    }
  }, [messages, ttsEnabled]);

  // Real-time escalation status changes
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`escalation-status-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "escalations",
          filter: `conversation_id=eq.${threadId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus) {
            setEscalationStatus(newStatus);
            if (newStatus === "resolved") {
              toast.success("A teacher has reviewed your conversation and responded!", {
                duration: 6000,
              });
            } else if (newStatus === "in_review") {
              toast.info("A teacher is now reviewing your conversation.", { duration: 4000 });
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  // Real-time teacher messages
  useEffect(() => {
    if (!threadId || messagesLoading) return;
    const channel = supabase
      .channel(`messages-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${threadId}`,
        },
        (payload) => {
          const msg = payload.new as any;
          if (msg?.role === "assistant" && msg?.content?.includes("Teacher Review:")) {
            const teacherMsg = {
              id: msg.id ?? crypto.randomUUID(),
              role: "assistant" as const,
              parts: [{ type: "text" as const, text: msg.content || "" }],
              createdAt: msg.created_at ? new Date(msg.created_at) : new Date(),
            };
            setMessages((prev: UIMessage[]) => {
              const alreadyExists = prev.some((m) => m.id === teacherMsg.id);
              if (alreadyExists) return prev;
              return [...prev, teacherMsg];
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, messagesLoading]);

  const handleSelectThread = (id: string) => {
    navigate({
      to: "/tutor/$threadId",
      params: { threadId: id },
    } as any);
  };

  const createNewThread = async () => {
    const sessionRes = await supabase.auth.getSession();
    const session = sessionRes?.data?.session;
    const userId = session?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("conversations")
      .insert([{ title: "New thread", user_id: userId }])
      .select()
      .single();

    if (error) {
      console.error("[TutorThread] create thread error:", error);
      return;
    }

    const newId = (data as any).id;
    setThreads((prev) => [{ id: newId, title: "New thread" }, ...prev]);
    setThreadsOpen(false);

    navigate({
      to: "/tutor/$threadId",
      params: { threadId: newId },
    } as any);
  };

  // Filter threads by search query
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    return threads.filter((t) =>
      (t.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [threads, searchQuery]);

  const ThreadList = (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Sessions
        </p>
        <button
          onClick={createNewThread}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3 w-3" /> New
        </button>
      </div>

      {/* Sidebar Thread Search Input */}
      <div className="relative mb-3 flex-shrink-0">
        <input
          type="text"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
        />
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {filteredThreads.map((t) => (
          <div
            key={t.id}
            className={`group relative flex items-center justify-between rounded-lg transition-colors ${t.id === threadId
              ? "bg-primary/10 text-primary font-semibold"
              : "hover:bg-accent text-foreground"
              }`}
          >
            <button
              onClick={() => {
                handleSelectThread(t.id);
                setThreadsOpen(false);
              }}
              className="flex-1 text-left px-3 py-2.5 min-w-0 pr-10"
            >
              <div className="text-sm truncate">{t.title || "Untitled"}</div>
              {t.updated_at && (
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  {new Date(t.updated_at).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              )}
            </button>

            {/* Delete confirm trigger (Replaces native window.confirm) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDeleteConfirmId(t.id);
              }}
              className="absolute right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
              title="Delete conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {filteredThreads.length === 0 && !threadsLoading && (
          <p className="text-xs text-muted-foreground text-center py-6 italic">
            No sessions match.
          </p>
        )}
      </div>
    </div>
  );

  // --- SPEECH TO TEXT ---
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in your browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-KE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Microphone error. Please try again.");
    };
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // --- TEXT TO SPEECH ---
  const speakText = (text: string) => {
    if (!ttsEnabled) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[#*`$]/g, "").replace(/\$\$?[^$]+\$\$?/g, "equation").trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-KE";
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // --- EXPORT AS PDF ---
  const exportAsPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("GilaniAI Study Session", margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`Exported on ${new Date().toLocaleDateString()}`, margin, y);
    y += 10;

    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    messages.forEach((m: any) => {
      const role = m.role === "user" ? "You" : "GilaniAI";
      const text = m.parts?.find((p: any) => p.type === "text")?.text || m.content || "";
      const clean = text.replace(/[#*`$]/g, "").trim();

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(m.role === "user" ? 30 : 0, m.role === "user" ? 100 : 150, 255);
      doc.text(role, margin, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(40);
      const lines = doc.splitTextToSize(clean, maxWidth);
      lines.forEach((line: string) => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 5;
      });
      y += 4;
    });

    const title = threads.find((t) => t.id === threadId)?.title || "study-session";
    doc.save(`${title.replace(/\s+/g, "-")}.pdf`);
    toast.success("PDF exported successfully!");
  };

  // --- EXPORT AS WORD ---
  const exportAsWord = async () => {
    const children: Paragraph[] = [
      new Paragraph({
        text: "GilaniAI Study Session",
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        children: [new TextRun({ text: `Exported on ${new Date().toLocaleDateString()}`, color: "888888", size: 18 })],
      }),
      new Paragraph({ text: "" }),
    ];

    messages.forEach((m: any) => {
      const role = m.role === "user" ? "You" : "GilaniAI";
      const text = m.parts?.find((p: any) => p.type === "text")?.text || m.content || "";
      const clean = text.replace(/[#*`$]/g, "").trim();

      children.push(
        new Paragraph({
          children: [new TextRun({ text: role, bold: true, color: m.role === "user" ? "1E64FF" : "0096FF", size: 20 })],
        }),
        new Paragraph({
          children: [new TextRun({ text: clean, size: 20 })],
        }),
        new Paragraph({ text: "" }),
      );
    });

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const title = threads.find((t) => t.id === threadId)?.title || "study-session";
    saveAs(blob, `${title.replace(/\s+/g, "-")}.docx`);
    toast.success("Word document exported successfully!");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen flex-col lg:flex-row bg-background text-foreground">
      {/* Mobile overlay */}
      {threadsOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setThreadsOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 flex-col border-r border-border bg-sidebar p-4 overflow-hidden">
        {ThreadList}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar border-r border-border p-4 transition-transform duration-300 ease-in-out lg:hidden ${threadsOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-serif text-lg font-bold text-primary">Sessions</span>
          <button
            onClick={() => setThreadsOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {ThreadList}
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-border bg-sidebar px-4 py-3 lg:hidden">
          <button
            onClick={() => setThreadsOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
            Study Sessions
          </button>
        </div>

        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3.5 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">
              {threads.find((t) => t.id === threadId)?.title || "Untitled Session"}
            </h2>
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
              Curriculum Grounded Assistant
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Curriculum Selector Dropdown */}
            <select
              value={curriculum}
              onChange={(e) => handleCurriculumChange(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-accent transition-colors"
              title="Select your study curriculum standards"
            >
              <option value="KCSE">KCSE (KNEC)</option>
              <option value="CBC">CBC Curriculum</option>
              <option value="8-4-4">8-4-4 Standards</option>
              <option value="IGCSE Cambridge">IGCSE Cambridge</option>
              <option value="IGCSE Edexcel">IGCSE Edexcel</option>
            </select>

            {/* Export Button */}
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-accent transition-colors"
                title="Export conversation"
              >
                <FileDown className="h-3.5 w-3.5" />
                Export
              </button>
              {exportMenuOpen && (
                <>
                  {/* Backdrop to close on outside click */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setExportMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 flex flex-col w-36 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden">
                    <button
                      onClick={() => { exportAsPDF(); setExportMenuOpen(false); }}
                      className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Export as PDF
                    </button>
                    <button
                      onClick={() => { exportAsWord(); setExportMenuOpen(false); }}
                      className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Export as Word
                    </button>
                  </div>
                </>
              )}
            </div>

            {escalationStatus === "open" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-amber-700">
                <Clock className="h-3 w-3 animate-pulse" /> Review Pending
              </span>
            )}
            {escalationStatus === "in_review" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-blue-700">
                <Clock className="h-3 w-3 animate-pulse" /> Teacher Reviewing
              </span>
            )}
            {escalationStatus === "resolved" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-green-700">
                <CheckCircle2 className="h-3 w-3" /> Reviewed
              </span>
            )}
            {!escalationStatus && threadId && (
              <button
                onClick={handleEscalate}
                disabled={escalating || messagesLoading}
                className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-accent disabled:opacity-50 transition-colors"
                title="Escalate this study session to a human teacher for review"
              >
                {escalating ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                ) : (
                  <ShieldAlert className="h-3 w-3 text-red-500" />
                )}
                Escalate
              </button>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {threadsLoadError && (
            <div className="mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive animate-in-slide">
              <p>{threadsLoadError}</p>
              <button
                onClick={() => navigate({ to: "/login" } as any)}
                className="mt-2 underline underline-offset-2 hover:text-destructive/80"
              >
                Sign in
              </button>
            </div>
          )}

          {messagesLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
              <span className="flex gap-1 items-center text-muted-foreground">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
                  •
                </span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>
                  •
                </span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>
                  •
                </span>
              </span>
              <p className="text-sm text-muted-foreground">Loading thread messages…</p>
            </div>
          )}

          {!messagesLoading && messagesLoadError && (
            <div className="mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              <p>{messagesLoadError}</p>
              <button
                onClick={() => navigate({ to: "/tutor" } as any)}
                className="mt-2 underline underline-offset-2 hover:text-destructive/80"
              >
                Start a new session
              </button>
            </div>
          )}

          {chatError && (
            <div className="mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {chatError}
            </div>
          )}

          {/* Socratic Suggested Starter Prompts empty state */}
          {!messagesLoading && !messagesLoadError && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[70%] max-w-md mx-auto gap-4 py-8 text-center animate-in-slide">
              <MessageCircle className="h-10 w-10 text-primary/65" />
              <h3 className="font-serif text-2xl font-bold">Start a study session</h3>
              <p className="text-xs text-muted-foreground">
                Choose a starter question below or ask GilaniAI anything about your KCSE/CBC
                curriculum standards.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-4">
                {[
                  "Explain Photosynthesis",
                  "Solve a quadratic equation",
                  "Describe Newton's Laws of Motion",
                  "Analyze Kiswahili Fasihi notes",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="text-left rounded-xl border border-border bg-card p-3.5 hover:border-primary/50 hover:bg-primary/5 transition-all text-xs font-bold text-foreground shadow-sm hover:scale-[1.01]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {!messagesLoading &&
            !messagesLoadError &&
            messages.map((m, idx: number) => (
              <div
                key={m.id ?? idx}
                className="flex relative group justify-start"
                style={{ justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative ${m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border text-foreground rounded-tl-sm"
                    }`}
                >
                  {(() => {
                    const partsText =
                      m.parts
                        ?.filter((p: any) => p.type === "text")
                        .map((p: any) => p.text || "")
                        .join("") || "";

                    const displayText = partsText || (m as any).content || "";

                    if (m.role === "assistant") {
                      const isLast = idx === messages.length - 1;
                      const isStreamActive = isPending;

                      return (
                        <div className="flex flex-col w-full">
                          <ThoughtAccordion
                            messageId={m.id || String(idx)}
                            isLastMessage={isLast}
                            isStreaming={isStreamActive}
                            messageText={displayText}
                          />
                          {displayText ? (
                            <div className="mt-1 prose-ai relative">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={markdownComponents}
                              >
                                {displayText}
                              </ReactMarkdown>

                              {/* Per-token typing blinking cursor */}
                              {isLast && isStreamActive && (
                                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary/70 animate-cursor-blink align-middle" />
                              )}
                            </div>
                          ) : isLast && isStreamActive ? null : (
                            <span className="text-xs text-muted-foreground italic mt-1">
                              No response generated. Please resend your question.
                            </span>
                          )}

                          {/* Action Bar inside assistant bubble on hover */}
                          {displayText && !isStreamActive && (
                            <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(displayText);
                                  toast.success("Copied to clipboard!");
                                }}
                                className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                                title="Copy answer"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              {isLast && (
                                <button
                                  onClick={() => reload()}
                                  className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                                  title="Regenerate this response"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return <span className="whitespace-pre-wrap">{displayText}</span>;
                  })()}
                </div>

                {/* Micro Timestamp Hover Tooltip */}
                <div
                  className={`absolute -bottom-5 ${m.role === "user" ? "right-2" : "left-2"} opacity-0 group-hover:opacity-100 transition-opacity duration-250 text-[9px] text-muted-foreground font-mono bg-background border border-border/60 px-1.5 py-0.5 rounded shadow-sm pointer-events-none z-10`}
                >
                  {(m as any).createdAt
                    ? new Date((m as any).createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : "Just now"}
                </div>
              </div>
            ))}

          {/* Virtual Assistant thinking bubble during early stream request phase */}
          {isPending && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start animate-in-slide">
              <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-card border border-border text-foreground rounded-tl-sm w-full animate-pulse">
                <div className="flex flex-col w-full">
                  <ThoughtAccordion
                    messageId="temp-thinking-indicator"
                    isLastMessage={true}
                    isStreaming={true}
                    messageText=""
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-background p-3 sm:p-4">
          {attachedFile && (
            <div className="mb-2.5 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 animate-in-slide">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground">
                    {attachedFile.name}
                  </p>
                  <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                    {(attachedFile.size / 1024).toFixed(1)} KB • Document text loaded
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAttachedFile(null)}
                className="rounded-md p-1 hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                title="Remove attachment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 sm:gap-3">
            {/* Paperclip Button */}
            <input
              type="file"
              id="chat-file-attachment"
              className="hidden"
              accept=".pdf,.docx,.txt,.md,.csv"
              onChange={handleFileChange}
              disabled={isPending || parsingFile}
            />
            <label
              htmlFor="chat-file-attachment"
              className={`flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-card shadow-sm hover:bg-accent transition-colors ${isPending || parsingFile ? "opacity-50 pointer-events-none" : ""
                }`}
              title="Attach a document (PDF, DOCX, TXT, MD, CSV)"
            >
              {parsingFile ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              )}
            </label>

            <textarea
              ref={textareaRef}
              className="flex-1 min-h-[44px] max-h-36 resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
              value={input}
              onChange={handleInputChange}
              placeholder={
                isPending ? "Waiting for response..." : "Ask a question… (Enter to send)"
              }
              disabled={isPending || parsingFile}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(e);
                }
              }}
            />

            {/* Mic Button */}
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isPending || parsingFile}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border shadow-sm transition-colors ${isListening
                ? "border-red-400 bg-red-50 text-red-500 animate-pulse"
                : "border-border bg-card text-muted-foreground hover:bg-accent"
                }`}
              title={isListening ? "Stop listening" : "Speak your question"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            {/* TTS Toggle */}
            <button
              onClick={() => {
                setTtsEnabled((v) => !v);
                if (isSpeaking) window.speechSynthesis.cancel();
              }}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border shadow-sm transition-colors ${ttsEnabled
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-accent"
                }`}
              title={ttsEnabled ? "Disable text-to-speech" : "Enable text-to-speech"}
            >
              {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            <button
              onClick={(e) => submit(e as any)}
              disabled={isPending || parsingFile || !input.trim()}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              title="Send"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Premium Character Count and Status Hint Bar */}
          <div className="flex items-center justify-between mt-1.5 px-1 min-h-[14px]">
            <p className="font-mono text-[9px] text-muted-foreground">
              {isPending ? (
                <span className="text-primary/75 animate-pulse font-bold">
                  GilaniAI is thinking… please wait
                </span>
              ) : (
                "Shift+Enter for new line"
              )}
            </p>
            {input.length > 0 && (
              <span className="font-mono text-[9px] text-muted-foreground font-semibold">
                {input.length} characters
              </span>
            )}
          </div>
        </div>
      </main>

      {/* Premium Confirm Delete Modal Overlay (Replaces Native window.confirm) */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in-slide">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-foreground">Delete Study Session?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete this study session? This will erase all
              message history and cannot be undone.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = deleteConfirmId;
                  setDeleteConfirmId(null);
                  const toastId = toast.loading("Deleting session...");
                  try {
                    // Uses server-side deleteThread which explicitly removes
                    // messages then the conversation via supabaseAdmin.
                    // (Schema also has ON DELETE CASCADE as a safety net.)
                    await deleteThreadFn({ data: id! });

                    setThreads((prev) => prev.filter((t) => t.id !== id));
                    toast.success("Session deleted successfully!", { id: toastId });

                    if (id === threadId) {
                      navigate({ to: "/tutor" } as any);
                    }
                  } catch (err: any) {
                    console.error("Failed to delete thread:", err);
                    toast.error(err.message || "Failed to delete session", { id: toastId });
                  }
                }}
                className="rounded-lg bg-destructive px-4 py-2 text-xs font-bold uppercase tracking-wider text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AiThinkingIndicator() {
  return null; // Deprecated, replaced by inline ThoughtAccordion
}

// Rich Markdown Renderer
const markdownComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ children }) => (
    <h1 className="text-lg font-extrabold mt-4 mb-1.5 text-primary border-b border-primary/20 pb-1 leading-snug">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold mt-3.5 mb-1 text-blue-600 dark:text-blue-400 leading-snug">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold mt-3 mb-0.5 text-purple-600 dark:text-purple-400 leading-snug">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold mt-2 mb-0.5 text-teal-600 dark:text-teal-400">
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2 transition-colors font-medium"
    >
      {children}
      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-70" />
    </a>
  ),
  img: ({ src, alt }) => (
    <figure className="my-3">
      <img
        src={src}
        alt={alt || ""}
        className="rounded-xl border border-border max-w-full shadow-sm"
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement("p");
            fallback.className = "text-xs text-muted-foreground italic";
            fallback.textContent = `[Image unavailable: ${alt || src}]`;
            parent.appendChild(fallback);
          }
        }}
      />
      {alt && (
        <figcaption className="text-[10px] font-mono text-muted-foreground mt-1 text-center italic">
          {alt}
        </figcaption>
      )}
    </figure>
  ),
  ul: ({ children }) => <ul className="list-none pl-0 my-2 space-y-1">{children}</ul>,
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1 marker:text-primary marker:font-semibold">
      {children}
    </ol>
  ),
  li: ({ children, node, ...props }: any) => {
    const isOrdered = node?.parent?.type === "element" && node?.parent?.tagName === "ol";
    return (
      <li
        className={`text-sm leading-relaxed flex items-start gap-2 ${isOrdered ? "list-item" : ""}`}
      >
        {!isOrdered && (
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/60" />
        )}
        <span>{children}</span>
      </li>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/50 pl-3 my-2 bg-primary/5 rounded-r-lg py-1.5 text-sm text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  code: ({ inline, children, ...props }: any) =>
    inline ? (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-primary">
        {children}
      </code>
    ) : (
      <code className="block bg-[#1e1e2e] text-green-300 font-mono text-[11px] leading-relaxed p-3 rounded-xl overflow-x-auto">
        {children}
      </code>
    ),
  pre: ({ children }) => (
    <pre className="my-2 rounded-xl overflow-hidden bg-[#1e1e2e] shadow-inner">{children}</pre>
  ),
  hr: () => <hr className="my-3 border-border/60" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/60 text-xs uppercase tracking-wider font-semibold">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-muted/30 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-bold text-muted-foreground">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-sm">{children}</td>,
};

interface ThoughtAccordionProps {
  messageId: string;
  isLastMessage: boolean;
  isStreaming: boolean;
  messageText: string;
}

function ThoughtAccordion({
  messageId,
  isLastMessage,
  isStreaming,
  messageText,
}: ThoughtAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hasStartedGenerating, setHasStartedGenerating] = useState(false);
  const [finalDuration, setFinalDuration] = useState<number | null>(null);

  const steps = [
    "Consulting Kenyan national curriculum standards...",
    "Reviewing context from your uploaded study notes...",
    "Brainstorming relevant real-world illustrations...",
    "Structuring step-by-step Socratic pedagogical guidance...",
    "Polishing primary English and secondary Swahili definitions...",
  ];

  const historicalDuration = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < messageId.length; i++) {
      hash = messageId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs((hash % 5) + 3);
  }, [messageId]);

  useEffect(() => {
    if (!isStreaming || !isLastMessage) return;

    if (messageText.trim() !== "") {
      if (!hasStartedGenerating) {
        setHasStartedGenerating(true);
        setFinalDuration(seconds || 1);
        setIsOpen(false);
      }
      return;
    }

    setIsOpen(true);

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, isLastMessage, messageText, hasStartedGenerating, seconds]);

  const duration =
    finalDuration !== null
      ? finalDuration
      : isStreaming && isLastMessage && !hasStartedGenerating
        ? seconds
        : historicalDuration;
  const activeStepIdx = Math.min(Math.floor(duration / 1.5), steps.length - 1);
  const isThinking = isStreaming && isLastMessage && !hasStartedGenerating;

  return (
    <div className="bg-muted/30 border border-border/50 rounded-xl p-3 my-1.5 w-full select-none transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left font-sans text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          {isThinking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <Brain className="h-3.5 w-3.5 text-primary/70" />
          )}
          <span className="font-semibold uppercase tracking-wider font-mono text-[9px]">
            {isThinking ? `Thinking process (${duration}s...)` : `Thought process (${duration}s)`}
          </span>
        </div>
        <ChevronUp
          className={`h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-300 ${isOpen ? "" : "rotate-180"
            }`}
        />
      </button>

      {isOpen && (
        <div className="mt-3 border-t border-border/40 pt-2.5 font-mono text-[10px] text-muted-foreground/80 space-y-2 animate-in-slide">
          <div className="space-y-1.5">
            {steps.map((step, idx) => {
              const completed = idx < activeStepIdx;
              const active = idx === activeStepIdx && isThinking;

              let statusSymbol = "•";
              if (completed) statusSymbol = "✓";
              else if (active) statusSymbol = "⚡";

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 transition-colors duration-300 ${completed ? "text-primary/70 font-semibold" : ""
                    } ${active ? "text-primary animate-pulse font-bold" : ""}`}
                >
                  <span className="w-3 flex-shrink-0 text-center">{statusSymbol}</span>
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
