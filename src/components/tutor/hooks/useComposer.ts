import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { parseDocument } from "@/lib/document-parser";
import { friendlyError } from "@/lib/async";
import { supabase } from "@/integrations/supabase/client";

export type AttachedFile = { name: string; text: string; size: number; storageUrl?: string; mimeType?: string };

const MAX_DOC_CHARS = 8000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function useComposer() {
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseInputRef = useRef("");

  const toggleVoiceInput = async () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      toast.error("Voice input isn't supported in this browser. Try Chrome, Edge, or Safari.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    // Pre-warm the microphone. iOS Safari often throws "not-allowed" immediately
    // if we don't explicitly request getUserMedia permission first.
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Instantly stop the stream — SpeechRecognition will manage its own audio capture
      stream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      if (!window.isSecureContext) {
        toast.error("Microphone access requires a secure connection (HTTPS) on mobile.");
      } else {
        toast.error("Microphone access denied. Please allow microphone permissions in your browser settings.");
      }
      return;
    }

    baseInputRef.current = input;
    const recognition = new SpeechRecognitionCtor();
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    recognition.continuous = !isIOS;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const base = baseInputRef.current;
      setInput(base ? `${base} ${transcript}` : transcript);
    };
    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        if (event.error === "not-allowed") {
          if (!window.isSecureContext) {
            toast.error("Microphone access requires a secure connection (HTTPS) on mobile. Please use HTTPS or localhost.");
          } else {
            toast.error("Microphone access denied. Please check your browser settings or permissions.");
          }
        } else {
          toast.error(`Voice input error (${event.error}). Please try again.`);
        }
      }
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const handleScanClick = () => {
    setIsCameraOpen(true);
  };

  const handleRawFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setDocUploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is 10MB.`);
      return;
    }

    setParsingFile(true);
    setDocUploadError(null);
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      // 1. Upload raw file to Supabase Storage (silent fail — text extraction still works without it)
      let storageUrl: string | undefined;
      try {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `chat-attachments/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("chat-attachments")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
          storageUrl = urlData?.publicUrl;
        } else {
          console.warn("[Storage] Upload skipped:", uploadErr.message);
        }
      } catch (storageErr) {
        console.warn("[Storage] Storage unavailable, proceeding without file URL:", storageErr);
      }

      // 2. Extract text for AI context
      toast.loading(`Extracting text from ${file.name}...`, { id: toastId });
      const parsed = await parseDocument(file);
      setAttachedFile({ ...parsed, storageUrl, mimeType: file.type });
      toast.success("Document attached!", { id: toastId });
    } catch (err: any) {
      const errMsg = friendlyError(err, "Failed to attach document.");
      setDocUploadError(errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setParsingFile(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleRawFile(file);
    }
    e.target.value = "";
  };

  const onRemoveFile = () => {
    setAttachedFile(null);
    setDocUploadError(null);
  };

  const onClearDocError = () => setDocUploadError(null);

  const focusInputAtEnd = (text: string) => {
    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
        chatInputRef.current.setSelectionRange(text.length, text.length);
      }
    }, 50);
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    focusInputAtEnd(prompt);
  };

  const handleEditRequest = (text: string) => {
    setInput(text);
    focusInputAtEnd(text);
  };

  /** Builds the final message text, wrapping an attached document if present. */
  const buildMessageText = (trimmedInput: string): string => {
    if (!attachedFile) return trimmedInput;
    const docText =
      attachedFile.text.length > MAX_DOC_CHARS
        ? attachedFile.text.slice(0, MAX_DOC_CHARS) +
          "\n\n[Document truncated to 8000 characters due to size limits]"
        : attachedFile.text;
    return `[Document Attached: ${attachedFile.name}]\n\n<DocumentContent name="${attachedFile.name}">\n${docText}\n</DocumentContent>\n\nStudent Query: ${trimmedInput || "(See attached document)"}`;
  };

  const hasContent = (trimmedInput: string) => !!trimmedInput || !!attachedFile;

  return {
    input,
    setInput,
    attachedFile,
    parsingFile,
    docUploadError,
    chatInputRef,
    isListening,
    toggleVoiceInput,
    handleFileChange,
    handleRawFile,
    handleScanClick,
    onRemoveFile,
    onClearDocError,
    handlePromptClick,
    handleEditRequest,
    buildMessageText,
    hasContent,
    isCameraOpen,
    setIsCameraOpen,
  };
}
