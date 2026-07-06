import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { deleteNote, retryNote } from "@/lib/notes.server-fns";
import { processNoteChunks } from "@/lib/notes/process-chunks-client";
import { GilaniLoader } from "@/components/GilaniLoader";
import { UploadCloud, Search } from "lucide-react";
import { toast } from "sonner";
import { TutorPageHeader } from "@/components/tutor/TutorPageHeader";
import { NoteCard, type NoteCardData } from "@/components/notes/NoteCard";
import { NoteUploadModal } from "@/components/notes/NoteUploadModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/tutor/documents")({
  component: DocumentsRoute,
});

const PAGE_SIZE = 10;

function DocumentsRoute() {
  const [notes, setNotes] = useState<NoteCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotes = async (searchTerm: string, page: number, append: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("notes")
        .select("id, title, summary, raw_text, key_concepts, status, error_message, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (searchTerm.trim()) {
        query = query.ilike("title", `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const results = (data as any) || [];
      setNotes((prev) => (append ? [...prev, ...results] : results));
      setHasMore(results.length === PAGE_SIZE);
    } catch (err: any) {
      toast.error(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNotes("", 0, false);
  }, []);

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setLoading(true);
      fetchNotes(value, 0, false);
    }, 350);
  };

  const onLoadMore = () => {
    setLoadingMore(true);
    fetchNotes(search, Math.floor(notes.length / PAGE_SIZE), true);
  };

  const onConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await deleteNote({ data: { noteId: id } });
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Note deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setDeletingId(null);
    }
  };

  const onRetry = async (id: string) => {
    setRetryingId(id);
    try {
      const { chunks } = await retryNote({ data: { noteId: id } });
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, status: "processing", error_message: null } : n)));
      await processNoteChunks(id, chunks);
      const { data } = await supabase
        .from("notes")
        .select("id, title, summary, raw_text, key_concepts, status, error_message, created_at")
        .eq("id", id)
        .single();
      if (data) setNotes((prev) => prev.map((n) => (n.id === id ? (data as any) : n)));
      toast.success("Note reprocessed successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, status: "failed" } : n)));
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) return (
    <div className="h-full flex flex-col">
      <TutorPageHeader title="My Documents" subtitle="Study materials uploaded to the AI" />
      <div className="flex-1 flex items-center justify-center"><GilaniLoader /></div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <TutorPageHeader
        title="My Documents"
        subtitle={`${notes.length}${hasMore ? "+" : ""} document${notes.length !== 1 ? "s" : ""}`}
        actions={
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <UploadCloud className="h-4 w-4" /> Upload Notes
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {(notes.length > 0 || search) && (
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search your documents…"
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          )}

          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20 mt-8">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {search ? "No matching documents" : "No documents yet"}
              </h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                {search
                  ? "Try a different search term."
                  : "Upload a PDF, Word doc, image, or paste text — the AI will produce a full, exhaustive summary that keeps every keyword and explanation."}
              </p>
              {!search && (
                <button
                  onClick={() => setUploadOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <UploadCloud className="h-4 w-4" /> Upload Notes
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onDelete={setConfirmDeleteId}
                    onRetry={onRetry}
                    deleting={deletingId === note.id}
                    retrying={retryingId === note.id}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {uploadOpen && (
        <NoteUploadModal onClose={() => setUploadOpen(false)} onUploaded={() => fetchNotes(search, 0, false)} />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete this document?"
          description="This will permanently remove the document and its summary. This can't be undone."
          confirmLabel="Delete"
          onConfirm={onConfirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
