import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  BookOpenText,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  Tag,
  FileText,
  X,
} from "lucide-react";
import { parseDocument } from "@/lib/document-parser";
import { toast } from "sonner";
import { getErrorMessage, withTimeout, friendlyError } from "@/lib/async";
import MarkdownRenderer from "@/components/tutor/MarkdownRenderer";
import { listNotes, ingestNote, saveNoteOnly, Note } from "@/lib/notes.server-fns";
import {
  getCachedNotes,
  setCachedNotes,
  useRateLimitCountdown,
  useRateLimitRestore,
} from "@/hooks/notes-helpers";
import {
  DocumentUploadZone,
  AttachedFilePill,
  ErrorBanner,
  RateLimitBanner,
} from "@/components/notes-components";

// ─── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [{ title: "Study Notes — GilaniAI" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  loader: () => [] as Note[],
  component: NotesPage,
});

// ─── Main Page Component ───────────────────────────────────────────────────────

function NotesPage() {
  const { user } = useAuth();
  const initialNotes = Route.useLoaderData() as Note[];
  const [notes, setNotes] = useState<Note[]>(() => {
    if (initialNotes && initialNotes.length > 0) return initialNotes;
    return getCachedNotes();
  });
  const [isOffline, setIsOffline] = useState(false);
  const [showForm, setShowForm] = useState(() => {
    try { return sessionStorage.getItem("notes_showForm") === "true"; } catch { return false; }
  });

  const setShowFormPersisted = (val: boolean | ((v: boolean) => boolean)) => {
    setShowForm((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try { sessionStorage.setItem("notes_showForm", String(next)); } catch { }
      return next;
    });
  };

  const [title, setTitle] = useState("");
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [summarising, setSummarising] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string; size: number } | null>(null);
  const [notesRateError, setNotesRateError] = useState<string | null>(null);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);

  const isRateLimited = !!(
    notesRateError?.toLowerCase().includes("limit") ||
    notesRateError?.toLowerCase().includes("rate")
  );
  const { secondsLeft, isDaily, maxSeconds } = useRateLimitCountdown(isRateLimited ? notesRateError : null);

  useRateLimitRestore(setNotesRateError, notesRateError);

  // Load notes client-side on mount
  useEffect(() => {
    let active = true;
    const loadNotesData = async () => {
      try {
        const fresh = await listNotes();
        if (active && fresh) {
          setCachedNotes(fresh as Note[]);
          setNotes(fresh as Note[]);
          setIsOffline(false);
        }
      } catch (err) {
        console.error("Failed to load notes on mount:", err);
        if (active) {
          const cached = getCachedNotes();
          if (cached.length > 0) {
            setNotes(cached);
          }
          setIsOffline(!navigator.onLine);
        }
      }
    };
    loadNotesData();
    return () => { active = false; };
  }, []);

  // Listen for online/offline transitions
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      const cached = getCachedNotes();
      if (cached.length > 0) {
        setNotes(cached);
        setIsOffline(true);
      }
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setDocUploadError(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 2MB.`);
      return;
    }

    setParsingFile(true);
    const toastId = toast.loading(`Extracting text from ${file.name}...`);
    try {
      const parsed = await parseDocument(file);
      const baseName = parsed.name.replace(/\.[^/.]+$/, "");
      setTitle(baseName);
      setHeading("");
      setSubheading("");
      setAttachedFile({ name: parsed.name, text: parsed.text, size: parsed.size });
      toast.success("Document extracted!", { id: toastId });
    } catch (err: any) {
      const errMsg = friendlyError(err, "Failed to extract text.");
      setDocUploadError(errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setParsingFile(false);
    }
  };

  const handleSaveOnly = async () => {
    if (!title.trim() || (!content.trim() && !attachedFile)) {
      toast.error("Please fill in both title and content.");
      return;
    }
    setSaving(true);
    try {
      if (!user) { toast.error("Not signed in"); return; }
      const note = await saveNoteOnly({
        data: {
          title,
          heading,
          subheading,
          content: attachedFile
            ? `[Document: ${attachedFile.name}]\n${attachedFile.text}\n${content}`.trim()
            : content,
        },
      });
      setNotes((prev) => {
        const next = [note as Note, ...prev];
        setCachedNotes(next);
        return next;
      });
      setTitle("");
      setContent("");
      setAttachedFile(null);
      setShowFormPersisted(false);
      toast.success("Note saved!");
    } catch (err: unknown) {
      const message = (err as any)?.message || "Failed to save note";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || (!content.trim() && !attachedFile)) {
      toast.error("Please fill in both title and content.");
      return;
    }
    setSummarising(true);
    setSaving(true);
    try {
      if (!user) { toast.error("Not signed in"); return; }
      const note = await withTimeout(
        ingestNote({
          data: {
            title,
            heading,
            subheading,
            content: attachedFile
              ? `[Document: ${attachedFile.name}]\n${attachedFile.text}\n${content}`.trim()
              : content,
          },
        }),
        120000,
        "Saving note timed out.",
      );
      setNotes((prev) => {
        const next = [note as Note, ...prev];
        setCachedNotes(next);
        return next;
      });
      setTitle("");
      setContent("");
      setAttachedFile(null);
      setShowFormPersisted(false);
      toast.success("Note ingested & summarised!");
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Failed to save note");
      const isLimit = message.toLowerCase().includes("limit") || message.toLowerCase().includes("rate");
      if (isLimit) {
        setNotesRateError(message);
        toast.error(message, {
          action: {
            label: "Upgrade",
            onClick: () => window.dispatchEvent(new CustomEvent("custom:open-plans")),
          },
        });
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
      setSummarising(false);
    }
  };

  return (
    <div className="w-full mx-auto max-w-7xl space-y-4 sm:space-y-5 lg:space-y-6 p-3 sm:p-4 lg:p-6 xl:p-10">
      {/* Offline Backup Badge */}
      {isOffline && (
        <div className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/40 px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-xs text-amber-700 dark:text-amber-400">
          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          <span>
            <strong>Offline mode</strong> — Viewing cached notes.
          </span>
        </div>
      )}

      {/* Rate Limit Banner */}
      {notesRateError && (
        <RateLimitBanner
          error={notesRateError}
          secondsLeft={secondsLeft}
          maxSeconds={maxSeconds}
          isDaily={isDaily}
          onDismiss={() => setNotesRateError(null)}
        />
      )}

      {/* Header */}
      <header className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-end sm:justify-between text-center sm:text-left">
        <div>
          <p className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary mb-0.5 sm:mb-1">
            Study Notes
          </p>
          <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl">Upload & Summarise</h2>
          <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-sm text-muted-foreground">
            Paste your class notes and GilaniAI will extract a summary automatically.
          </p>
        </div>
        <button
          onClick={() => setShowFormPersisted((v) => !v)}
          disabled={isOffline || isRateLimited}
          className="self-center sm:self-auto flex items-center gap-1.5 sm:gap-2 rounded-lg bg-primary px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors active:scale-[0.98]"
        >
          {showForm ? <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          {showForm ? "Cancel" : "New Note"}
        </button>
      </header>

      {/* Upload Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4 lg:p-6 shadow-sm">
          <h3 className="font-serif text-lg sm:text-xl mb-3 sm:mb-4 text-center sm:text-left">Add Study Note</h3>
          <div className="space-y-2.5 sm:space-y-3">
            <DocumentUploadZone parsingFile={parsingFile} onFileChange={handleFileChange} />

            {docUploadError && <ErrorBanner error={docUploadError} onDismiss={() => setDocUploadError(null)} />}

            <div>
              <label className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-muted-foreground mb-1 block">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Biology Chapter 3 — Photosynthesis"
                className="w-full rounded-lg border border-border bg-background px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-muted-foreground mb-1 block">
                  Heading <span className="normal-case text-muted-foreground/60">(optional)</span>
                </label>
                <input
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder="e.g. Cell Biology"
                  className="w-full rounded-lg border border-border bg-background px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-muted-foreground mb-1 block">
                  Subheading <span className="normal-case text-muted-foreground/60">(optional)</span>
                </label>
                <input
                  value={subheading}
                  onChange={(e) => setSubheading(e.target.value)}
                  placeholder="e.g. Mitosis and Meiosis"
                  className="w-full rounded-lg border border-border bg-background px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-muted-foreground mb-1 block">
                Content
              </label>
              <AttachedFilePill file={attachedFile} onRemove={() => { setAttachedFile(null); setDocUploadError(null); }} />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your class notes here…"
                rows={6}
                className="w-full rounded-lg border border-border bg-background px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
              />
              <p className="mt-1 font-mono text-[9px] sm:text-[10px] text-muted-foreground">
                {content.length.toLocaleString()} characters
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowFormPersisted(false)}
                className="rounded-lg sm:rounded-xl border border-border px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium hover:bg-accent transition-colors active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOnly}
                disabled={saving || isRateLimited}
                className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-border bg-background px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-foreground shadow-sm hover:bg-muted disabled:opacity-60 active:scale-[0.98] transition-all"
              >
                {saving && !summarising && <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />}
                {saving && !summarising ? "Saving…" : "Save only"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || isRateLimited}
                className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-primary px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 active:scale-[0.98] transition-all"
              >
                {summarising && <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />}
                {summarising ? "Summarising…" : "Save & Summarise"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 sm:p-6 lg:p-10 text-center">
          <BookOpenText className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40 mb-2 sm:mb-3" />
          <p className="font-serif text-lg sm:text-xl text-muted-foreground">No notes yet</p>
          <p className="text-[11px] sm:text-sm text-muted-foreground mt-1">Add your first note to get started.</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {notes.map((note) => {
            const open = expanded === note.id;
            return (
              <div
                key={note.id}
                className="rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md group"
              >
                <button
                  className="w-full flex items-center justify-between px-2.5 sm:px-3 lg:px-5 py-2.5 sm:py-3 lg:py-5 text-left gap-2 sm:gap-4"
                  onClick={() => setExpanded(open ? null : note.id)}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="font-semibold text-xs sm:text-sm truncate">
                        <MarkdownRenderer content={note.title} />
                      </div>
                      <p className="font-mono text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                        {note.created_at
                          ? new Date(note.created_at).toLocaleDateString("en-KE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                          : "—"}
                      </p>
                    </div>
                  </div>
                  {open ? (
                    <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-muted-foreground" />
                  )}
                </button>

                {open && (
                  <div className="border-t border-border px-2.5 sm:px-3 lg:px-5 pb-2.5 sm:pb-3 lg:pb-5 pt-2 sm:pt-4 space-y-2.5 sm:space-y-3">
                    {note.summary && (
                      <div>
                        <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 sm:mb-2">
                          AI Summary
                        </p>
                        <div className="text-[11px] sm:text-sm leading-relaxed text-foreground/90 break-words overflow-hidden">
                          <MarkdownRenderer content={note.summary} />
                        </div>
                      </div>
                    )}
                    {note.key_concepts && (note.key_concepts as any).length > 0 && (
                      <div>
                        <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 sm:mb-2 flex items-center gap-1">
                          <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Key Concepts
                        </p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {(note.key_concepts as string[]).map((c) => (
                            <span
                              key={c}
                              className="rounded-full border border-primary/30 bg-primary/10 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-primary max-w-[150px] sm:max-w-[200px] truncate"
                              title={c}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}