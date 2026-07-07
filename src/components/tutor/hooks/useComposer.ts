import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { parseDocument } from "@/lib/document-parser";
import { friendlyError } from "@/lib/async";

export type AttachedFile = { name: string; text: string; size: number };

const MAX_DOC_CHARS = 8000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function useComposer() {
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseInputRef = useRef("");

  const toggleVoiceInput = () => {
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
        toast.error("Voice input error. Please try again.");
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
    const el = document.getElementById("chat-camera-input") as HTMLInputElement | null;
    if (!el) return;
    el.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    handleScanClick,
    onRemoveFile,
    onClearDocError,
    handlePromptClick,
    handleEditRequest,
    buildMessageText,
    hasContent,
  };
}
