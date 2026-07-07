import { useState, useRef } from "react";
import { X, UploadCloud, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseDocument } from "@/lib/document-parser";
import { createNote } from "@/lib/notes.server-fns";
import { processNoteChunks } from "@/lib/notes/process-chunks-client";

const MAX_RAW_TEXT_LENGTH = 16_000;

interface NoteUploadModalProps {
  onClose: () => void;
  onUploaded: () => void;
}

type Tab = "file" | "paste";
type Stage = "idle" | "extracting" | "processing" | "finalizing";

export function NoteUploadModal({ onClose, onUploaded }: NoteUploadModalProps) {
  const [tab, setTab] = useState<Tab>("file");
  const [title, setTitle] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = stage !== "idle";
  const rawText = tab === "file" ? extractedText : pastedText;
  const overLimit = rawText.length > MAX_RAW_TEXT_LENGTH;

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setStage("extracting");
    try {
      const result = await parseDocument(file);
      setExtractedText(result.text);
      setFileName(result.name);
      if (!title.trim()) {
        setTitle(result.name.replace(/\.[^.]+$/, ""));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
      setExtractedText("");
      setFileName(null);
    } finally {
      setStage("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSubmit = async () => {
    if (!title.trim()) return setError("Please give this note a title.");
    if (!rawText.trim()) return setError("Please upload a file or paste some text.");
    if (overLimit) {
      return setError(
        `This note is too long (${rawText.length.toLocaleString()} of ${MAX_RAW_TEXT_LENGTH.toLocaleString()} characters max). Try splitting it into smaller uploads.`,
      );
    }

    setError(null);
    let noteId: string | null = null;

    try {
      const created = await createNote({
        data: { title: title.trim(), rawText: rawText.trim(), fileName: fileName ?? undefined },
      });
      noteId = created.noteId;
      const { chunks } = created;

      setStage("processing");
      setProgress({ done: 0, total: chunks.length });

      await processNoteChunks(noteId, chunks, (p) => setProgress(p));

      setStage("finalizing");
      toast.success("Note summarized successfully");
      onUploaded();
      onClose();
    } catch (err) {
      setStage("idle");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!busy ? onClose : undefined}
      />

      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Upload Notes</h2>
          {!busy && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {stage === "idle" && (
          <>
            <div className="flex rounded-xl border border-border bg-muted/30 p-1 gap-1">
              <button
                onClick={() => setTab("file")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                  tab === "file"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UploadCloud className="h-4 w-4" /> Upload File
              </button>
              <button
                onClick={() => setTab("paste")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                  tab === "paste"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-4 w-4" /> Paste Text
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 4 — Cell Biology"
                maxLength={200}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            {tab === "file" ? (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md,.csv,.jpg,.jpeg,.png,.webp,image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={onFileSelect}
                  className="hidden"
                  id="note-file-input"
                />
                <label
                  htmlFor="note-file-input"
                  className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary/40 transition-colors"
                >
                  <UploadCloud className="h-8 w-8 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {fileName ? fileName : "Click to choose a PDF, Word doc, or image"}
                  </span>
                </label>
                {extractedText && (
                  <p className="text-xs text-muted-foreground">
                    Extracted {extractedText.length.toLocaleString()} characters
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your notes here…"
                  rows={8}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
                <p className={`text-xs ${overLimit ? "text-red-500" : "text-muted-foreground"}`}>
                  {pastedText.length.toLocaleString()} / {MAX_RAW_TEXT_LENGTH.toLocaleString()}{" "}
                  characters
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={onSubmit}
              disabled={!title.trim() || !rawText.trim() || overLimit}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-all"
            >
              Summarize Notes
            </button>
          </>
        )}

        {stage === "extracting" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Reading document…</p>
          </div>
        )}

        {stage === "processing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Analyzing section {progress.done + 1} of {progress.total}…
            </p>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {stage === "finalizing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Putting it all together…</p>
          </div>
        )}
      </div>
    </div>
  );
}
