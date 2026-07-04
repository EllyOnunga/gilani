import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GilaniLoader } from "@/components/GilaniLoader";
import { File as FileIcon, Calendar, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { TutorPageHeader } from "@/components/tutor/TutorPageHeader";
import { MarkdownRenderer } from "@/components/tutor/MarkdownRenderer";

export const Route = createFileRoute("/_authenticated/tutor/documents")({
  component: DocumentsRoute,
});

function DocumentsRoute() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchNotes = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from("notes")
          .select("id, title, summary, raw_text, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (mounted) setNotes(data || []);
      } catch (err: any) {
        toast.error(err.message || "Failed to load documents");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchNotes();
    return () => { mounted = false; };
  }, []);

  if (loading) return (
    <div className="h-full flex flex-col">
      <TutorPageHeader title="My Documents" subtitle="Study materials uploaded to the AI" />
      <div className="flex-1 flex items-center justify-center"><GilaniLoader /></div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <TutorPageHeader title="My Documents" subtitle={`${notes.length} document${notes.length !== 1 ? "s" : ""}`} />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20 mt-8">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No documents yet</h3>
              <p className="text-muted-foreground max-w-sm">
                Upload PDFs or paste text in the chat — the AI will analyze them and they'll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => {
                const isOpen = expanded === note.id;
                return (
                  <div key={note.id} className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden hover:border-primary/40 transition-colors">
                    {/* Card header — always visible */}
                    <button
                      onClick={() => setExpanded(isOpen ? null : note.id)}
                      className="w-full flex items-center gap-3 p-5 text-left"
                    >
                      <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                        <FileIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {note.title || "Untitled Document"}
                        </h3>
                        <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(note.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="text-xs text-primary font-medium shrink-0">
                        {isOpen ? "Collapse ↑" : "Expand ↓"}
                      </span>
                    </button>

                    {/* Expandable markdown content */}
                    {isOpen && (note.summary || note.raw_text) && (
                      <div className="px-5 pb-5 pt-1 border-t border-border/50">
                        <div className="prose prose-sm max-w-none markdown-content text-foreground">
                          <MarkdownRenderer content={note.summary || note.raw_text || ""} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
