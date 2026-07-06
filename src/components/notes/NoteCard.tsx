import { useState } from "react";
import { File as FileIcon, Calendar, Trash2, RotateCw } from "lucide-react";
import { MarkdownRenderer } from "@/components/tutor/MarkdownRenderer";
import { NoteStatusBadge } from "@/components/notes/NoteStatusBadge";

export interface NoteCardData {
  id: string;
  title: string;
  summary: string | null;
  raw_text: string | null;
  key_concepts: string[] | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface NoteCardProps {
  note: NoteCardData;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  deleting: boolean;
  retrying: boolean;
}

export function NoteCard({ note, onDelete, onRetry, deleting, retrying }: NoteCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const canExpand = note.status === "ready" && !!(note.summary || note.raw_text);

  return (
    <div className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden hover:border-primary/40 transition-colors">
      <div className="w-full flex items-center gap-3 p-5 text-left">
        <button
          onClick={() => canExpand && setIsOpen(!isOpen)}
          disabled={!canExpand}
          className="flex-1 flex items-center gap-3 min-w-0 disabled:cursor-default"
        >
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
            <FileIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h3 className="font-semibold text-foreground truncate">
              {note.title || "Untitled Document"}
            </h3>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              <div className="flex items-center text-xs text-muted-foreground gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(note.created_at).toLocaleDateString()}
              </div>
              <NoteStatusBadge status={note.status} />
            </div>
          </div>
        </button>
        {canExpand && (
          <span className="text-xs text-primary font-medium shrink-0">
            {isOpen ? "Collapse ↑" : "Expand ↓"}
          </span>
        )}
        {note.status === "failed" && (
          <button
            onClick={() => onRetry(note.id)}
            disabled={retrying || deleting}
            title="Retry processing"
            className="shrink-0 p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-40"
          >
            <RotateCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
          </button>
        )}
        <button
          onClick={() => onDelete(note.id)}
          disabled={deleting || retrying}
          title="Delete note"
          className="shrink-0 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {note.status === "failed" && note.error_message && (
        <div className="px-5 pb-5 pt-1 border-t border-border/50">
          <p className="text-sm text-red-600">{note.error_message}</p>
        </div>
      )}

      {isOpen && canExpand && (
        <div className="px-5 pb-5 pt-1 border-t border-border/50 space-y-4">
          {note.key_concepts && note.key_concepts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {note.key_concepts.map((concept, i) => (
                <span
                  key={i}
                  className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full"
                >
                  {concept}
                </span>
              ))}
            </div>
          )}
          <div className="prose prose-sm max-w-none markdown-content text-foreground">
            <MarkdownRenderer content={note.summary || note.raw_text || ""} />
          </div>
        </div>
      )}
    </div>
  );
}
